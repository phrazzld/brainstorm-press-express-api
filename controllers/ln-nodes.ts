import { Request, Response } from "express";
import { LnNodeModel } from "../models/ln-node";
import { UserModel } from "../models/user";
import nodeManager from "../node-manager";
import { handleError } from "../routes/utils";

export const connectNode = async (req: Request, res: Response) => {
  console.debug("Connecting to node...");
  try {
    const { host, cert, macaroon } = req.body;
    console.debug("host:", host);
    console.debug("cert:", cert);
    console.debug("macaroon:", macaroon);
    const { token, pubkey } = await nodeManager.connect(host, cert, macaroon);
    console.debug("token:", token);
    console.debug("pubkey:", pubkey);

    const node = new LnNodeModel({
      host,
      cert,
      macaroon,
      token,
      pubkey,
    });
    console.debug("Ready to save node:", node);
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

export const deleteNode = async (req: Request, res: Response) => {
  const token = req.get("authorization");
  if (!token) {
    throw new Error("You must authorize this request with your node's token.");
  }

  try {
    await LnNodeModel.deleteOne({ token }).exec();
    return res.status(204).send("Node deleted successfully.");
  } catch (err) {
    handleError(err);
  }
};

export const getNodeStatus = async (req: Request, res: Response) => {
  const id = req.params.id;
  if (!id) {
    throw new Error("Cannot get status of node without id.");
  }

  try {
    const node = await LnNodeModel.findOne({ _id: id }).exec();
    if (!node) {
      return res.status(200).send({ status: "Not found." });
    }
    return res.status(200).send({ status: "Connected." });
  } catch (err) {
    handleError(err);
  }
};

// TODO: Refactor to return public info (i.e. connection status) unless called by node owner
export const getNode = async (req: Request, res: Response) => {
  const token = req.get("authorization");
  if (!token) {
    throw new Error("Your node is not connected.");
  }

  // Find the node making the request
  const node = await LnNodeModel.findOne({ token }).exec();
  if (!node) {
    throw new Error("Node not found with this token.");
  }

  // Get node's pubkey and alias
  const rpc = nodeManager.getRpc(node.token);
  const { alias, identityPubkey: pubkey } = await rpc.getInfo();
  const { balance } = await rpc.channelBalance();
  return res.send({ alias, balance, pubkey });
};
