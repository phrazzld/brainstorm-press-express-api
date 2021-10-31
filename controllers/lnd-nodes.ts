import { Request, Response } from "express";
import { LndNodeModel } from "../models/lnd-node";
import { UserModel } from "../models/user";
import nodeManager from "../node-manager";
import { handleError } from "../routes/utils";

// POST /api/connect
// Connect to an LndNode
export const connectNode = async (req: Request, res: Response) => {
  console.debug("--- connect ---");
  try {
    const { host, cert, macaroon } = req.body;
    const { token, pubkey } = await nodeManager.connect(host, cert, macaroon);
    const node = new LndNodeModel({
      host,
      cert,
      macaroon,
      token,
      pubkey,
    });
    await node.save();
    await UserModel.findOneAndUpdate(
      { _id: (<any>req).user._id },
      { node: node._id }
    );
    return res.status(201).send(node);
  } catch (err) {
    handleError(err);
  }
};

// DELETE /api/node
export const deleteNode = async (req: Request, res: Response) => {
  console.debug("--- deleteNode ---");
  const token = req.get("authorization");
  if (!token) {
    throw new Error("You must authorize this request with your node's token.");
  }

  try {
    await LndNodeModel.deleteOne({ token }).exec();
    return res.status(204).send("Node deleted successfully.");
  } catch (err) {
    handleError(err);
  }
};

// GET /api/node/status
export const getNodeStatus = async (req: Request, res: Response) => {
  console.debug("--- getNodeStatus ---");
  const id = req.params.id;
  if (!id) {
    throw new Error("Cannot get status of node without id.");
  }

  try {
    const node = await LndNodeModel.findOne({ _id: id }).exec();
    if (!node) {
      return res.status(200).send({ status: "Not found." });
    }
    return res.status(200).send({ status: "Connected." });
  } catch (err) {
    handleError(err);
  }
};

// GET /api/node/info
// Get info from an LndNode
// TODO: Refactor to return public info (i.e. connection status) unless called by node owner
export const getNode = async (req: Request, res: Response) => {
  console.debug("--- getInfo ---");
  const token = req.get("authorization");
  if (!token) {
    throw new Error("Your node is not connected.");
  }

  // Find the node making the request
  const node = await LndNodeModel.findOne({ token }).exec();
  if (!node) {
    throw new Error("Node not found with this token.");
  }

  // Get node's pubkey and alias
  const rpc = nodeManager.getRpc(node.token);
  const { alias, identityPubkey: pubkey } = await rpc.getInfo();
  const { balance } = await rpc.channelBalance();
  return res.send({ alias, balance, pubkey });
};
