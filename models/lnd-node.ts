import { model, Schema } from "mongoose";

export interface LndNode {
  token: string;
  host: string;
  cert: string;
  macaroon: string;
  pubkey: string;
  createdAt: Date;
  updatedAt: Date;
}

const LndNodeSchema = new Schema<LndNode>(
  {
    token: { type: String, required: true },
    host: { type: String, required: true },
    cert: { type: String, required: true },
    macaroon: { type: String, required: true },
    pubkey: { type: String, required: true },
  },
  { timestamps: true }
);

export const LndNodeModel = model("LndNode", LndNodeSchema);
