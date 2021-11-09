import { model, Schema } from "mongoose";

export interface RefreshToken {
  token: string;
  createdAt: Date;
  updatedAt: Date;
}

const RefreshTokenSchema = new Schema<RefreshToken>(
  {
    token: { type: String, required: true },
  },
  { timestamps: true }
);

export const RefreshTokenModel = model("RefreshToken", RefreshTokenSchema);
