import { Request, Response } from "express";
import { SubscriptionModel } from "../models/subscription";
import { UserModel } from "../models/user";
import { handleError } from "../routes/utils";

export const getSubscriptions = async (req: Request, res: Response) => {
  console.debug("--- getSubscriptions ---");
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
  console.debug("--- createSubscription ---");
  try {
    const { authorId } = req.body;
    const sub = new SubscriptionModel({
      reader: (<any>req).user._id,
      author: authorId,
    });
    await sub.save();
    console.log("new sub:", sub);
    return res.status(201).send(sub);
  } catch (err) {
    handleError(err);
  }
};

export const deleteSubscription = async (req: Request, res: Response) => {
  console.debug("--- deleteSubscription ---");
  const { id } = req.params;
  try {
    await SubscriptionModel.deleteOne({ _id: id }).exec();
    return res.status(204).send("Subscription deleted successfully.");
  } catch (err) {
    handleError(err);
  }
};
