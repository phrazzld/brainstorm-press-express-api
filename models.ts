import { model, Schema } from "mongoose";

//
// Posts
//

export interface Post {
  title: string;
  content: string;
  price: number;
  user: Schema.Types.ObjectId;
}

const PostSchema = new Schema<Post>({
  title: { type: String, required: true },
  content: { type: String, required: true },
  price: { type: Number, required: true },
  user: { type: Schema.Types.ObjectId, ref: "User" },
});

export const PostModel = model("Post", PostSchema);

//
// Nodes
//

export interface LndNode {
  token: string;
  host: string;
  cert: string;
  macaroon: string;
  pubkey: string;
}

const LndNodeSchema = new Schema<LndNode>({
  token: { type: String, required: true },
  host: { type: String, required: true },
  cert: { type: String, required: true },
  macaroon: { type: String, required: true },
  pubkey: { type: String, required: true },
});

export const LndNodeModel = model("LndNode", LndNodeSchema);

//
// Users
//

export interface User {
  name: string;
  blog: string;
  password: string;
  node: Schema.Types.ObjectId;
  refreshToken?: string;
}

const UserSchema = new Schema<User>({
  name: { type: String, required: true },
  blog: { type: String, required: true },
  password: { type: String, required: true },
  node: { type: Schema.Types.ObjectId, ref: "LndNode" },
  refreshToken: { type: String }
});

export const UserModel = model("User", UserSchema);

//
// PostPayments
//

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

//
// RefreshTokens
//

export interface RefreshToken {
  token: string;
}

const RefreshTokenSchema = new Schema<RefreshToken>({
  token: { type: String, required: true }
})

export const RefreshTokenModel = model("RefreshToken", RefreshTokenSchema)
