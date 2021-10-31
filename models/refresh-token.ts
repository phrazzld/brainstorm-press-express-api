import { model, Schema } from "mongoose";

export interface RefreshToken {
  token: string;
}

const RefreshTokenSchema = new Schema<RefreshToken>({
  token: { type: String, required: true },
});

export const RefreshTokenModel = model("RefreshToken", RefreshTokenSchema);
