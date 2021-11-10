import { Request, Response } from "express";
import { SubscriptionModel } from "../models/subscription";
import { UserModel } from "../models/user";
import { handleError } from "../routes/utils";

export const getSubscriptions = async (req: Request, res: Response) => {
  try {
    const user = await UserModel.findById((<any>req).user._id).exec();
    if (!user) {
      throw new Error("Cannot find user to get subscriptions.");
    }

    const subs = await SubscriptionModel.find({ reader: user._id }).exec();
    return res.status(200).send(subs);
  } catch (err) {
    handleError(err);
  }
};

export const createSubscription = async (req: Request, res: Response) => {
  try {
    const { authorId } = req.body;
    const sub = new SubscriptionModel({
      reader: (<any>req).user._id,
      author: authorId,
    });
    await sub.save();
    return res.status(201).send(sub);
  } catch (err) {
    handleError(err);
  }
};

export const deleteSubscription = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await SubscriptionModel.deleteOne({ _id: id }).exec();
    return res.status(204).send("Subscription deleted successfully.");
  } catch (err) {
    handleError(err);
  }
};
