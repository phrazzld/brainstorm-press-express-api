import { model, Schema } from "mongoose";

export interface User {
  username: string;
  email: string;
  password: string;
  blog: string;
  node: Schema.Types.ObjectId;
  btcAddress?: string;
  refreshToken?: string;
  subscriptionPrice: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<User>(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    blog: { type: String, required: true },
    node: { type: Schema.Types.ObjectId, ref: "LnNode" },
    btcAddress: { type: String },
    refreshToken: { type: String },
    subscriptionPrice: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

export const UserModel = model("User", UserSchema);
