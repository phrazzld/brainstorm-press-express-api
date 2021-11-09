import { model, Schema } from "mongoose";

export interface Subscription {
  reader: Schema.Types.ObjectId;
  author: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<Subscription>(
  {
    reader: { type: Schema.Types.ObjectId, ref: "User" },
    author: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

SubscriptionSchema.index({ reader: 1, author: 1 }, { unique: true });

export const SubscriptionModel = model("Subscription", SubscriptionSchema);
