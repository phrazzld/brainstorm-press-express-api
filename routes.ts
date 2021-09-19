import { Request, Response } from "express";
import nodeManager from "./node-manager";
import db from "./posts-db";

// POST /api/connect
export const connect = async (req: Request, res: Response) => {
  console.group("Request made to connect to LND")
  const { host, cert, macaroon } = req.body;
  console.debug("host:", host)
  console.debug("cert:", cert)
  console.debug("macaroon:", macaroon)
  const { token, pubkey } = await nodeManager.connect(host, cert, macaroon);
  console.debug("token:", token)
  console.debug("pubkey:", pubkey)
  console.debug("Adding node...")
  await db.addNode({ host, cert, macaroon, token, pubkey });
  console.debug("Responding to client with token...")
  console.groupEnd()
  res.send({ token });
};

// GET /api/info
export const getInfo = async (req: Request, res: Response) => {
  const { token } = req.body;
  if (!token) {
    throw new Error("Your node is not connected");
  }

  // Find the node making the request
  const node = db.getNodeByToken(token);
  if (!node) {
    throw new Error("Node not found with this token");
  }

  // Get node's pubkey and alias
  const rpc = nodeManager.getRpc(node.token);
  const { alias, identityPubkey: pubkey } = await rpc.getInfo();
  const { balance } = await rpc.channelBalance();
  res.send({ alias, balance, pubkey });
};

// GET /api/posts
export const getPosts = (req: Request, res: Response) => {
  const posts = db.getAllPosts();
  res.send(posts);
};

// POST /api/posts
export const createPost = async (req: Request, res: Response) => {
  const { token, title, content } = req.body;
  const rpc = nodeManager.getRpc(token);

  const { alias, identityPubkey: pubkey } = await rpc.getInfo();
  // lnd requires the message being signed to be base64 encoded
  const msg = Buffer.from(content).toString("base64");
  // Sign the message to obtain a signature
  const { signature } = await rpc.signMessage({ msg });

  const post = await db.createPost(alias, title, content, signature, pubkey);
  res.status(201).send(post);
};

// POST /api/posts/:id/upvote
export const upvotePost = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { hash } = req.body;

  // Validate that an invoice hash was provided
  if (!hash) {
    throw new Error("Hash is required");
  }

  // Find the post
  const post = db.getPostById(parseInt(id));
  if (!post) {
    throw new Error("Post not found");
  }

  // Find the node that made this post
  const node = db.getNodeByPubkey(post.pubkey);
  if (!node) {
    throw new Error("Node not found for this post");
  }

  const rpc = nodeManager.getRpc(node.token);
  const rHash = Buffer.from(hash, "base64");
  const { settled } = await rpc.lookupInvoice({ rHash });
  if (!settled) {
    throw new Error("The payment has not been paid yet");
  }

  db.upvotePost(post.id);
  res.send(post);
};

// POST /api/posts/:id/invoice
export const postInvoice = async (req: Request, res: Response) => {
  const { id } = req.params;

  // Find the post
  const post = db.getPostById(parseInt(id));
  if (!post) {
    throw new Error("Post not found.");
  }

  const node = db.getNodeByPubkey(post.pubkey);
  if (!node) {
    throw new Error("Node not found for this post.");
  }

  // Create an invoice on the poster's node
  const rpc = nodeManager.getRpc(node.token);
  const amount = 100;
  const inv = await rpc.addInvoice({ value: amount.toString() });
  res.send({
    payreq: inv.paymentRequest,
    hash: (inv.rHash as Buffer).toString("base64"),
    amount,
  });
};
