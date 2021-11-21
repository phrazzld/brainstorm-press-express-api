import { model, Schema } from "mongoose";

export interface LnNode {
  token: string;
  host: string;
  cert: string;
  macaroon: string;
  pubkey: string;
  createdAt: Date;
  updatedAt: Date;
}

const LnNodeSchema = new Schema<LnNode>(
  {
    token: { type: String, required: true },
    host: { type: String, required: true },
    cert: { type: String, required: true },
    macaroon: { type: String, required: true },
    pubkey: { type: String, required: true },
  },
  { timestamps: true }
);

export const LnNodeModel = model("LnNode", LnNodeSchema);
