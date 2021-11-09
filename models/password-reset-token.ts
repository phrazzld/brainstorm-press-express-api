import { model, Schema } from "mongoose";

interface PasswordResetToken {
  token: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

const PasswordResetTokenSchema = new Schema<PasswordResetToken>(
  {
    userId: { type: String, required: true },
    token: { type: String, required: true },
  },
  { timestamps: true }
);

PasswordResetTokenSchema.index({ userId: 1 }, { unique: true });

export const PasswordResetTokenModel = model(
  "PasswordResetToken",
  PasswordResetTokenSchema
);
