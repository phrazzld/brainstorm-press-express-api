import { model, Schema, Document, PaginateModel } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

//
// Posts
//

export interface Post extends Document {
  title: string;
  content: string;
  price: number;
  published: boolean;
  user: Schema.Types.ObjectId;
  payments: Array<Schema.Types.ObjectId>;
  paginate: () => void;
}

const PostSchema: Schema = new Schema<Post>({
  title: { type: String, required: true },
  content: { type: String, required: true },
  price: { type: Number, required: true },
  published: { type: Boolean, required: true, default: false },
  user: { type: Schema.Types.ObjectId, ref: "User" },
  payments: [{ type: Schema.Types.ObjectId, ref: "PostPayment" }],
});

PostSchema.plugin(mongoosePaginate);

PostSchema.index({ "$**": "text" });

interface PostModel<T extends Document> extends PaginateModel<T> {}

export const PostModel: PostModel<Post> = model<Post>("Post", PostSchema);

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
  token: { type: String, required: true },
});

export const RefreshTokenModel = model("RefreshToken", RefreshTokenSchema);
