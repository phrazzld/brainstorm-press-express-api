import { Request, Response } from "express";
import * as _ from "lodash";
import { LndNodeModel } from "../models/lnd-node";
import { PaymentModel } from "../models/payment";
import { PostModel } from "../models/post";
import { SubscriptionModel } from "../models/subscription";
import { UserModel } from "../models/user";
import nodeManager from "../node-manager";
import { handleError, PUBLIC_USER_INFO } from "../routes/utils";
import { getThirtyDaysAgo } from "../utils";

const POSTS_LIMIT = 5;

export const getPosts = async (req: Request, res: Response) => {
  const page: number = Number(req.query.page);
  const free = req.query.free;
  const search = req.query.search;

  let filter = { published: true };
  if (free) {
    _.assign(filter, { premium: 0 });
  }
  if (search) {
    _.assign(filter, { $text: { $search: search } });
  }

  try {
    const posts = await PostModel.paginate(filter, {
      page: page,
      limit: POSTS_LIMIT,
      populate: [{ path: "user", select: PUBLIC_USER_INFO }],
    });
    return res.send(posts);
  } catch (err) {
    handleError(err);
  }
};

export const getUserPosts = async (req: Request, res: Response) => {
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
      _.assign(filter, { premium: 0 });
    }
    if (search) {
      _.assign(filter, { $text: { $search: search } });
    }

    const posts = await PostModel.paginate(filter, {
      page: page,
      limit: POSTS_LIMIT,
      populate: [{ path: "user", select: PUBLIC_USER_INFO }],
    });
    return res.status(200).send(posts);
  } catch (err) {
    handleError(err);
  }
};

export const getDraftPosts = async (req: Request, res: Response) => {
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

export const getPostsFromSubscriptions = async (
  req: Request,
  res: Response
) => {
  const page: number = Number(req.query.page);

  try {
    const user = await UserModel.findById((<any>req).user._id).exec();
    if (!user) {
      throw new Error("Cannot find user to get subs for.");
    }
    const subs = await SubscriptionModel.find({ reader: user._id }).exec();
    const posts = await PostModel.paginate(
      {
        user: { $in: subs.map((sub) => sub.author) },
        published: true,
      },
      {
        page: page,
        limit: POSTS_LIMIT,
        populate: { path: "user", select: PUBLIC_USER_INFO },
      }
    );
    return res.status(200).send(posts);
  } catch (err) {
    handleError(err);
  }
};

export const getPost = async (req: Request, res: Response) => {
  try {
    const post = await PostModel.findById(req.params.id)
      .populate("user", "_id username blog node")
      .exec();
    if (!post) {
      throw new Error("No post found.");
    }
    return res.status(200).send(post);
  } catch (err) {
    handleError(err);
  }
};

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

export const createPost = async (req: Request, res: Response) => {
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

export const deletePost = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await PostModel.deleteOne({ _id: id }).exec();
    return res.status(204).send("Post deleted successfully.");
  } catch (err) {
    handleError(err);
  }
};

export const postInvoice = async (req: Request, res: Response) => {
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

  if (!user.subscriptionPrice) {
    throw new Error("Authoring user has no subscription price.");
  }

  if (user.subscriptionPrice === 0) {
    throw new Error("Authoring user has a free subscription.");
  }

  // Throw an error if the user is already paying for this post
  const payments = await PaymentModel.find({
    reader: (<any>req).user._id,
    author: user._id,
    createdAt: { $gte: getThirtyDaysAgo() },
  }).exec();

  if (payments.length > 0) {
    throw new Error("User is already paying for this post.");
  }

  // Throw an error if the requesting user is the author
  if ((<any>req).user._id.toString() === user._id.toString()) {
    throw new Error("Cannot invoice the author.");
  }

  if (!user.node) {
    throw new Error("Author has no node connected.");
  }

  const node = await LndNodeModel.findById(user.node).exec();
  if (!node) {
    throw new Error("Node not found for this post.");
  }

  // Create an invoice on the poster's node
  const rpc = nodeManager.getRpc(node.token);
  const amount = user.subscriptionPrice;
  const inv = await rpc.addInvoice({ value: amount.toString() });
  res.send({
    payreq: inv.paymentRequest,
    hash: (inv.rHash as Buffer).toString("base64"),
    amount,
  });
};
