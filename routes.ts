import bcrypt from "bcryptjs";
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import * as _ from "lodash";
import { LndNodeModel, PostModel, PostPaymentModel, UserModel } from "./models";
import nodeManager from "./node-manager";

const handleError = (err: any) => {
  console.error(err);
  if (err instanceof Error) {
    throw new Error(err.message);
  } else {
    console.warn(err);
  }
};

export const verifyJWT = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.get("authorization");

  if (!authHeader) {
    return res.status(403).send("No authorization header sent.");
  }

  const jwtToken = authHeader.replace("Bearer", "").trim();

  if (!jwtToken) {
    return res.status(403).send("JWT required for authorization.");
  }

  try {
    const decoded = jwt.verify(jwtToken, process.env.TOKEN_KEY as string);
    _.assign(req, { user: decoded });
  } catch (err) {
    return res.status(401).send("Invalid JWT.");
  }

  return next();
};

// POST /api/connect
// Connect to an LndNode
export const connect = async (req: Request, res: Response) => {
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
      { _id: (<any>req).user.user_id },
      { node: node._id }
    );
    return res.status(201).send(node);
  } catch (err) {
    handleError(err);
  }
};

// DELETE /api/node
export const deleteNode = async (req: Request, res: Response) => {
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

// GET /api/node/info
// Get info from an LndNode
// TODO: Rethink auth strat w/JWT vs LND
export const getInfo = async (req: Request, res: Response) => {
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

// GET /api/posts
export const getPosts = async (req: Request, res: Response) => {
  try {
    const posts = await PostModel.find({})
      .populate("user", "_id name blog")
      .exec();
    return res.send(posts);
  } catch (err) {
    handleError(err);
  }
};

// GET /api/users/:id/posts
// Get all posts written by a user
export const getUserPosts = async (req: Request, res: Response) => {
  try {
    const user = await UserModel.findById(req.params.id).exec();
    const posts = await PostModel.find({ user: user._id })
      .populate("user", "_id name blog")
      .exec();
    return res.status(200).send(posts);
  } catch (err) {
    handleError(err);
  }
};

// GET /api/posts/:id
export const getPost = async (req: Request, res: Response) => {
  try {
    const post = await PostModel.findById(req.params.id).exec();
    if (!post) {
      throw new Error("No post found.");
    }
    return res.status(200).send(post);
  } catch (err) {
    handleError(err);
  }
};

// PUT /api/posts/:id
export const updatePost = async (req: Request, res: Response) => {
  try {
    const post = await PostModel.findOneAndUpdate(
      { _id: req.params.id },
      req.body
    ).exec();
    return res.status(200).send(post);
  } catch (err) {
    handleError(err);
  }
};

// POST /api/posts
export const createPost = async (req: Request, res: Response) => {
  try {
    _.assign(req.body, { user: (<any>req).user.user_id });
    const post = new PostModel(req.body);
    await post.save();
    return res.status(201).send(post);
  } catch (err) {
    handleError(err);
  }
};

// DELETE /api/posts/:id
export const deletePost = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await PostModel.deleteOne({ _id: id }).exec();
    return res.status(204).send("Post deleted successfully.");
  } catch (err) {
    handleError(err);
  }
};

// POST /api/posts/:id/invoice
export const postInvoice = async (req: Request, res: Response) => {
  const { id } = req.params;

  // Find the post
  const post = await PostModel.findById(id).exec();
  if (!post) {
    throw new Error("Post not found.");
  }

  const user = await UserModel.findById(post.userId).populate("node").exec();
  if (!user) {
    throw new Error(
      "No authoring user found for this post, can't invoice a ghost."
    );
  }

  const node = await LndNodeModel.findById(user.node._id).exec();
  if (!node) {
    throw new Error("Node not found for this post.");
  }

  // Create an invoice on the poster's node
  const rpc = nodeManager.getRpc(node.token);
  const amount = post.price;
  const inv = await rpc.addInvoice({ value: amount.toString() });
  res.send({
    payreq: inv.paymentRequest,
    hash: (inv.rHash as Buffer).toString("base64"),
    amount,
  });
};

// POST /api/users
// Register a new user
export const createUser = async (req: Request, res: Response) => {
  try {
    // Get user input
    const { name, blog, password } = req.body;

    // Validate user input
    if (!(name && blog && password)) {
      return res.status(400).send("All inputs are required.");
    }

    // Check if user already exists
    const existingUser = await UserModel.findOne({ name }).exec();
    if (existingUser) {
      return res.status(409).send("User already exists. Please login.");
    }

    // Encrypt password
    const encryptedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await UserModel.create({
      name,
      blog,
      password: encryptedPassword,
    });

    // Create JWT token
    const jwtToken = jwt.sign(
      { user_id: newUser._id, name },
      process.env.TOKEN_KEY as string,
      { expiresIn: "2h" }
    );

    // Save JWT token to the new user
    newUser.jwtToken = jwtToken;

    // Return the new user
    return res.status(201).send(newUser);
  } catch (err) {
    handleError(err);
  }
};

// POST /api/login
export const login = async (req: Request, res: Response) => {
  try {
    // Get user input
    const { name, password } = req.body;

    // Validate user input
    if (!(name && password)) {
      return res.status(400).send("All input is required.");
    }

    // Find user
    const user = await UserModel.findOne({ name }).populate("node").exec();

    if (user && (await bcrypt.compare(password, user.password))) {
      // Create JWT
      const jwtToken = jwt.sign(
        { user_id: user._id, name },
        process.env.TOKEN_KEY as string,
        { expiresIn: "2h" }
      );

      // Save JWT to user
      user.jwtToken = jwtToken;

      // Return logged in user
      return res.status(200).send(user);
    }
    return res.status(400).send("Invalid credentials.");
  } catch (err) {
    handleError(err);
  }
};

// GET /api/posts/:id/payments
export const getPayment = async (req: Request, res: Response) => {
  const { id } = req.params;

  const payment = await PostPaymentModel.findOne({
    userId: (<any>req).user.user_id,
    postId: id,
  });

  if (!payment) {
    return res.status(200).send({ paid: false });
  }

  return res.status(200).send({ paid: true });
};

// POST /api/posts/:id/payments
export const logPayment = async (req: Request, res: Response) => {
  const { id } = req.params;

  // Find the post
  const post = await PostModel.findById(id).exec();
  if (!post) {
    throw new Error("Post not found.");
  }

  const payingUser = await UserModel.findById((<any>req).user.user_id).exec();
  if (!payingUser) {
    throw new Error("Must be logged in to make payments.");
  }

  const receivingUser = await UserModel.findById(post.userId).exec();
  if (!receivingUser) {
    throw new Error("No user found to make payment to.");
  }

  const { hash } = req.body;
  if (!hash) {
    throw new Error("Hash is required.");
  }

  const node = await LndNodeModel.findById(receivingUser.node).exec();
  if (!node) {
    throw new Error("Node not found for receiving user.");
  }

  const rpc = nodeManager.getRpc(node.token);
  const rHash = Buffer.from(hash, "base64");

  // See if invoice has been paid
  // TODO: Check PostPayments collection as well
  const { settled } = await rpc.lookupInvoice({ rHash });
  if (!settled) {
    throw new Error("The payment has not been paid yet.");
  }

  // Create PostPayments record
  const postPayment = new PostPaymentModel({
    userId: payingUser._id,
    postId: post._id,
  });
  await postPayment.save();

  return res.status(200).send(post);
};
