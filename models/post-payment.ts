import { model, Schema } from "mongoose";

export interface PostPayment {
  userId: string;
  postId: string;
}

const PostPaymentSchema = new Schema<PostPayment>({
  userId: { type: String, required: true },
  postId: { type: String, required: true },
});

PostPaymentSchema.index({ userId: 1, postId: 1 }, { unique: true });

export const PostPaymentModel = model("PostPayment", PostPaymentSchema);
