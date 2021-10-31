import { Request, Response } from "express";
import * as _ from "lodash";
import { LndNodeModel } from "../models/lnd-node";
import { PostModel } from "../models/post";
import { PostPaymentModel } from "../models/post-payment";
import { UserModel } from "../models/user";
import nodeManager from "../node-manager";
import { handleError, PUBLIC_USER_INFO } from "../routes/utils";

const POSTS_LIMIT = 5;

// GET /api/posts
export const getPosts = async (req: Request, res: Response) => {
  console.debug("--- getPosts ---");
  const page: number = Number(req.query.page);
  const free = req.query.free;
  const search = req.query.search;

  let filter = { published: true };
  if (free) {
    _.assign(filter, { price: 0 });
  }
  if (search) {
    _.assign(filter, { $text: { $search: search } });
  }

  try {
    const posts = await PostModel.paginate(filter, {
      page: page,
      limit: POSTS_LIMIT,
      populate: [
        { path: "user", select: PUBLIC_USER_INFO },
        { path: "payments" },
      ],
    });
    return res.send(posts);
  } catch (err) {
    handleError(err);
  }
};

// GET /api/users/:id/posts
// Get all posts written by a user
export const getUserPosts = async (req: Request, res: Response) => {
  console.debug("--- getUserPosts ---");
  console.log("req.params:", req.params);
  const page: number = Number(req.query.page);
  const free = req.query.free;
  const search = req.query.search;

  try {
    const user = await UserModel.findOne({
      username: req.params.username,
    }).exec();
    if (!user) {
      throw new Error("Cannot find user to get posts for.");
    }

    let filter = { user: user._id, published: true };
    if (free) {
      _.assign(filter, { price: 0 });
    }
    if (search) {
      _.assign(filter, { $text: { $search: search } });
    }

    const posts = await PostModel.paginate(filter, {
      page: page,
      limit: POSTS_LIMIT,
      populate: [
        { path: "user", select: PUBLIC_USER_INFO },
        { path: "payments" },
      ],
    });
    return res.status(200).send(posts);
  } catch (err) {
    handleError(err);
  }
};

// GET /api/drafts
// Get all of your unpublished posts
export const getDraftPosts = async (req: Request, res: Response) => {
  console.debug("--- getDraftPosts ---");
  const page: number = Number(req.query.page);

  try {
    const user = await UserModel.findById((<any>req).user._id).exec();
    if (!user) {
      throw new Error("Cannot find user to get drafts for.");
    }

    const drafts = await PostModel.paginate(
      {
        user: user._id,
        published: false,
      },
      {
        page: page,
        limit: POSTS_LIMIT,
        populate: { path: "user", select: PUBLIC_USER_INFO },
      }
    );
    return res.status(200).send(drafts);
  } catch (err) {
    handleError(err);
  }
};

// GET /api/posts/:id
export const getPost = async (req: Request, res: Response) => {
  console.debug("--- getPost ---");
  try {
    const post = await PostModel.findById(req.params.id)
      .populate("user", "_id username blog node")
      .populate("payments")
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

  const user = await UserModel.findById(post.user).populate("node").exec();
  if (!user) {
    throw new Error(
      "No authoring user found for this post, can't invoice a ghost."
    );
  }

  // Throw an error if the requesting user is the author
  if ((<any>req).user._id.toString() === user._id.toString()) {
    throw new Error("Cannot invoice the author.");
  }

  // TODO: Handle the case where the authoring user's node is not connected
  if (!user.node) {
    throw new Error("Author has no node connected.");
  }

  const node = await LndNodeModel.findById(user.node).exec();
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
  console.log("post:", post);

  const payingUser = await UserModel.findById((<any>req).user._id).exec();
  if (!payingUser) {
    throw new Error("Must be logged in to make payments.");
  }
  console.log("payingUser:", payingUser);

  const receivingUser = await UserModel.findById(post.user).exec();
  if (!receivingUser) {
    throw new Error("No user found to make payment to.");
  }
  console.log("receivingUser:", receivingUser);

  const { hash } = req.body;
  if (!hash) {
    throw new Error("Hash is required.");
  }
  console.log("hash:", hash);

  const node = await LndNodeModel.findById(receivingUser.node).exec();
  if (!node) {
    throw new Error("Node not found for receiving user.");
  }
  console.log("node:", node);

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

  // Save payment to the post
  post.payments.push(postPayment._id);
  await post.save();

  return res.status(200).send(post);
};
