import createLnRpc, { LnRpc } from "@radar/lnrpc";
import { EventEmitter } from "events";
import { v4 as uuidv4 } from "uuid";
import { LnNode } from "./models/ln-node";

export const NodeEvents = {
  invoicePaid: "invoice-paid",
};

class NodeManager extends EventEmitter {
  // A mapping of token to gRPC connection.
  // This is an optimization to avoid calling `createLnRpc` on every request.
  // Instead, the object is kept in memory for the lifetime of the server.
  private _lnNodes: Record<string, LnRpc> = {};

  // Retrieves the in-memory connection to an LN node
  getRpc = (token: string): LnRpc => {
    if (!this._lnNodes[token]) {
      throw new Error("Not authorized. You must login first.");
    }

    return this._lnNodes[token];
  };

  // Tests the LN connection by validating that we can get the node's info
  connect = async (
    host: string,
    cert: string,
    macaroon: string,
    prevToken?: string
  ) => {
    console.debug("Connecting via nodeManager...");
    // Generate a random token
    const token = prevToken || uuidv4().replace(/-/g, "");

    try {
      // Add the connection to the cache
      console.debug("Creating an LN RPC...");
      const rpc = await createLnRpc({
        server: host,
        cert: Buffer.from(cert, "hex").toString("utf-8"),
        macaroon,
      });
      console.debug("rpc:", rpc);

      // Verify we have permission to do a bunch of stuff
      console.debug("Getting info from RPC connection...");
      const { identityPubkey: pubkey } = await rpc.getInfo();
      console.debug("pubkey:", pubkey);

      console.debug("Checking channel balance...");
      await rpc.channelBalance();

      console.debug("Adding an invoice...");
      const { rHash } = await rpc.addInvoice({ value: "1" });
      console.debug("rHash:", rHash);

      console.debug("Looking up invoice by rHash...");
      await rpc.lookupInvoice({ rHash });

      // Listen for payments from LN
      console.debug("Attaching payment listener...");
      this.listenForPayments(rpc, pubkey);

      // Store this RPC connection in the in-memory list
      console.debug("Storing this RPC connection in the in-memory list...");
      this._lnNodes[token] = rpc;

      // Return this node's token for future requests
      return { token, pubkey };
    } catch (err) {
      console.error(err);
      // Remove the connection from the cache since it is not valid
      if (this._lnNodes[token]) {
        delete this._lnNodes[token];
      }
      throw err;
    }
  };

  // Reconnect to all persisted nodes to cache the LnRpc objects
  reconnectNodes = async (nodes: LnNode[]) => {
    for (const node of nodes) {
      const { host, cert, macaroon, token } = node;
      try {
        console.log(`Reconnecting to LN node ${host} for token ${token}...`);
        await this.connect(host, cert, macaroon, token);
        console.log(`Connected to LN node ${host} with token ${token}.`);
      } catch (err) {
        console.error(
          `Failed to reconnect to LN node ${host} with token ${token}.`
        );
      }
    }
  };

  // Listen for payments made to the node.
  // When a payment is settled, emit the `invoicePaid` event to notify listeners.
  listenForPayments = (rpc: LnRpc, pubkey: string) => {
    console.debug("listenForPayments");
    console.debug("rpc:", rpc);
    console.debug("pubkey:", pubkey);
    console.debug("Subscribing to invoices...");
    const stream = rpc.subscribeInvoices();
    console.debug("stream:", stream);
    stream.on("data", (invoice) => {
      if (invoice.settled) {
        const hash = (invoice.rHash as Buffer).toString("base64");
        const amount = invoice.amtPaidSat;
        this.emit(NodeEvents.invoicePaid, { hash, amount, pubkey });
      }
    });
  };
}

export default new NodeManager();
