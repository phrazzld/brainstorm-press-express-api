import { model, Schema } from "mongoose";

export interface User {
  username: string;
  email: string;
  password: string;
  blog: string;
  node: Schema.Types.ObjectId;
  btcAddress?: string;
  refreshToken?: string;
}

const UserSchema = new Schema<User>({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  blog: { type: String, required: true },
  node: { type: Schema.Types.ObjectId, ref: "LndNode" },
  btcAddress: { type: String },
  refreshToken: { type: String },
});

export const UserModel = model("User", UserSchema);
