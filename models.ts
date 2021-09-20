import { model, Schema } from "mongoose";

//
// Posts
//

interface Post {
  title: string;
  content: string;
  // userId: string;
}

const PostSchema = new Schema<Post>({
  title: { type: String, required: true },
  content: { type: String, required: true },
});

export const PostModel = model("Post", PostSchema);

//
// Nodes
//

interface LndNode {
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

interface User {
  name: string;
  blog: string;
  // nodeId: string;
}

const UserSchema = new Schema<User>({
  name: { type: String, required: true },
  blog: { type: String, required: true },
});

export const UserModel = model("User", UserSchema);
