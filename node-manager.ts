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
        tls: false,
        //cert: Buffer.from(cert, "hex").toString("utf-8"),
        macaroon,
      });
      console.debug("rpc:", rpc);

      // Verify we have permission to do a bunch of stuff
      const { identityPubkey: pubkey } = await rpc.getInfo();

      await rpc.channelBalance();

      const { rHash } = await rpc.addInvoice({ value: "1" });

      await rpc.lookupInvoice({ rHash });

      // Listen for payments from LN
      this.listenForPayments(rpc, pubkey);

      // Store this RPC connection in the in-memory list
      this._lnNodes[token] = rpc;

      // Return this node's token for future requests
      return { token, pubkey };
    } catch (err) {
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
    const stream = rpc.subscribeInvoices();
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
