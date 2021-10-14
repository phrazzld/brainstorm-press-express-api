import bcrypt from "bcryptjs";
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import * as _ from "lodash";
import {
  LndNodeModel,
  PostModel,
  PostPaymentModel,
  RefreshTokenModel,
  UserModel,
} from "./models";
import nodeManager from "./node-manager";

const handleError = (err: any) => {
  console.error(err);
  if (err instanceof Error) {
    throw new Error(err.message);
  } else {
    console.warn(err);
  }
};

const generateAccessToken = (user: any): string => {
  console.debug("--- generateAccessToken ---");
  return jwt.sign(
    { _id: user._id, name: user.name },
    process.env.ACCESS_TOKEN_SECRET as string,
    {
      expiresIn: "5s",
    }
  );
};

const generateRefreshToken = async (user: any): Promise<string> => {
  console.debug("--- generateRefreshToken ---");
  const refreshToken = jwt.sign(
    { _id: user._id, name: user.name },
    process.env.REFRESH_TOKEN_SECRET as string
  );

  await RefreshTokenModel.create({ token: refreshToken });

  return refreshToken;
};

export const verifyAccessToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.debug("--- verifyAccessToken ---");
  const authHeader = req.get("authorization");

  if (!authHeader) {
    return res.status(403).json("No authorization header sent.");
  }

  const accessToken = authHeader.replace("Bearer", "").trim();

  if (!accessToken) {
    return res.status(403).json("Access token required for authorization.");
  }

  try {
    const decoded = jwt.verify(
      accessToken,
      process.env.ACCESS_TOKEN_SECRET as string
    );
    _.assign(req, { user: decoded });
  } catch (err) {
    return res.status(401).json("Invalid access token.");
  }

  return next();
};

// POST /api/connect
// Connect to an LndNode
export const connect = async (req: Request, res: Response) => {
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
    console.log("req.user:", (<any>req).user);
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

// GET /api/node/info
// Get info from an LndNode
// TODO: Rethink auth strat w/JWT vs LND
export const getInfo = async (req: Request, res: Response) => {
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

// GET /api/posts
export const getPosts = async (req: Request, res: Response) => {
  console.debug("--- getPosts ---");
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
  console.debug("--- getUserPosts ---");
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
  console.debug("--- getPost ---");
  try {
    const post = await PostModel.findById(req.params.id)
      .populate("user", "_id name blog")
      .exec();
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
  console.debug("--- updatePost ---");
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
  console.debug("--- createPost ---");
  try {
    // TODO: verify we can remove _.assign call
    _.assign(req.body, { user: (<any>req).user._id });
    const post = new PostModel(req.body);
    await post.save();
    return res.status(201).send(post);
  } catch (err) {
    handleError(err);
  }
};

// DELETE /api/posts/:id
export const deletePost = async (req: Request, res: Response) => {
  console.debug("--- deletePost ---");
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
  console.debug("--- postInvoice ---");
  const { id } = req.params;

  // Find the post
  const post = await PostModel.findById(id).populate("user").exec();
  if (!post) {
    throw new Error("Post not found.");
  }

  const user = await UserModel.findById(post.user._id).populate("node").exec();
  if (!user) {
    throw new Error(
      "No authoring user found for this post, can't invoice a ghost."
    );
  }

  // Throw an error if the requesting user is the author
  if ((<any>req).user._id.toString() === user._id.toString()) {
    throw new Error("Cannot invoice the author.");
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
  console.debug("--- createUser ---");
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
    console.debug("newUser:", newUser);

    // Create access token
    const accessToken = generateAccessToken(newUser);
    //const accessToken = jwt.sign(
    //  newUser.toJSON(),
    //  process.env.ACCESS_TOKEN_SECRET as string,
    //  { expiresIn: "15m" }
    //);
    console.debug("accessToken:", accessToken);

    // Create refresh token
    const refreshToken = await generateRefreshToken(newUser);
    console.debug("refreshToken:", refreshToken);

    // Add the refresh token to the response cookie
    res.cookie("refreshToken", refreshToken, {
      maxAge: 3.154e10, // 1 year
      httpOnly: true,
    });

    // Return the new user
    return res.status(201).send({
      user: newUser,
      accessToken: accessToken,
      refreshToken: refreshToken,
    });
  } catch (err) {
    handleError(err);
  }
};

// PUT /api/users/:id
// Update a user
export const updateUser = async (req: Request, res: Response) => {
  console.debug("--- updateUser ---");
  const { blog } = req.body;

  try {
    const user = await UserModel.findOneAndUpdate(
      { _id: (<any>req).user._id },
      { blog: blog },
      { new: true }
    );
    res.status(204).send(user);
  } catch (err) {
    handleError(err);
  }
};

// GET /api/users/current
// Get logged in user
export const getCurrentUser = async (req: Request, res: Response) => {
  console.debug("--- getCurrentUser ---");
  try {
    const user = await UserModel.findOne({ _id: (<any>req).user._id })
      .populate("node")
      .exec();
    res.status(200).send(user);
  } catch (err) {
    handleError(err);
  }
};

// POST /api/login
export const login = async (req: Request, res: Response) => {
  console.debug("--- login ---");
  try {
    // Get user input
    const { name, password } = req.body;

    // Validate user input
    if (!(name && password)) {
      return res.status(400).send("All input is required.");
    }

    // Find user
    const user = await UserModel.findOne({ name }).populate("node").exec();
    console.debug("user:", user);

    if (user && (await bcrypt.compare(password, user.password))) {
      // Create access token
      const accessToken = generateAccessToken(user);
      console.debug("accessToken:", accessToken);

      // Create refresh token
      const refreshToken = await generateRefreshToken(user);
      console.log("refreshToken:", refreshToken);

      // Add the refresh token to the response cookie
      res.cookie("refreshToken", refreshToken, {
        maxAge: 3.154e10, // 1 year
        httpOnly: true,
      });

      // Return logged in user
      return res.status(200).send({
        user: user,
        accessToken: accessToken,
        refreshToken: refreshToken,
      });
    }
    return res.status(400).send("Invalid credentials.");
  } catch (err) {
    handleError(err);
  }
};

// GET /api/posts/:id/payments
export const getPayment = async (req: Request, res: Response) => {
  console.debug("--- getPayment ---");
  const { id } = req.params;

  const payment = await PostPaymentModel.findOne({
    userId: (<any>req).user._id,
    postId: id,
  });

  if (!payment) {
    return res.status(200).send({ paid: false });
  }

  return res.status(200).send({ paid: true });
};

// POST /api/posts/:id/payments
export const logPayment = async (req: Request, res: Response) => {
  console.debug("--- logPayment ---");
  const { id } = req.params;

  // Find the post
  const post = await PostModel.findById(id).populate("user", "_id").exec();
  if (!post) {
    throw new Error("Post not found.");
  }

  const payingUser = await UserModel.findById((<any>req).user._id).exec();
  if (!payingUser) {
    throw new Error("Must be logged in to make payments.");
  }

  const receivingUser = await UserModel.findById(post.user._id).exec();
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

// DELETE /api/refreshToken
export const deleteRefreshToken = async (req: Request, res: Response) => {
  console.debug("--- deleteRefreshToken ---")
  try {
    await RefreshTokenModel.deleteOne({ token: req.cookies.refreshToken })
    res.clearCookie("refreshToken")
    res.status(204).send("Refresh token deleted successfully.")
  } catch (err) {
    handleError(err)
  }
}

export const createAccessToken = async (req: Request, res: Response) => {
  console.debug("--- createAccessToken ---");
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    return res
      .status(401)
      .json("Cannot create access token without refresh token.");
  }

  const dbRefreshToken = await RefreshTokenModel.findOne({
    token: refreshToken,
  }).exec();
  if (!dbRefreshToken) {
    return res.status(403).json("Invalid refresh token.");
  }

  jwt.verify(
    refreshToken,
    process.env.REFRESH_TOKEN_SECRET as string,
    (err: any, user: any) => {
      if (err) {
        console.error(err);
        return res.status(403).json("Could not verify refresh token.");
      }
      console.log("jwt.verify callback, user:", user);
      const accessToken = generateAccessToken(user);
      console.log("new access token:", accessToken);
      return res.status(200).json(accessToken);
    }
  );
};
