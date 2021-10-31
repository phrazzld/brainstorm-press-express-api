import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Request, Response } from "express";
import { PasswordResetTokenModel } from "../models/password-reset-token";
import { UserModel } from "../models/user";
import { handleError } from "../routes/utils";
import { sendEmail } from "../send-email";

export const sendResetPasswordEmail = async (req: Request, res: Response) => {
  console.debug("--- sendResetPasswordEmail ---");
  try {
    const { email } = req.body;
    if (!email) {
      return res
        .status(400)
        .send({ error: "Email is required to reset password." });
    }

    const user = await UserModel.findOne({ email }).exec();
    if (!user) {
      return res.status(400).send({ error: "No user found with that email." });
    }

    let passwordResetToken = await PasswordResetTokenModel.findOne({
      userId: user._id,
    }).exec();
    if (!passwordResetToken) {
      passwordResetToken = await PasswordResetTokenModel.create({
        userId: user._id,
        token: crypto.randomBytes(32).toString("hex"),
      });
    }

    const link = `${process.env.BASE_URL}/reset-password/${user._id}/${passwordResetToken.token}`;
    const message = `
      Use this link to change your password:
      ${link}
    `;
    await sendEmail(user.email, "Password reset", message);

    res.send({ message: "Password reset link emailed." });
  } catch (err) {
    handleError(err);
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  console.debug("--- resetPassword ---");
  try {
    const { userId, token } = req.params;
    const { password } = req.body;

    const user = await UserModel.findById(userId).exec();
    if (!user) {
      return res.status(400).send({ error: "No user found with that ID." });
    }

    const passwordResetToken = await PasswordResetTokenModel.findOne({
      userId: user._id,
      token: token,
    }).exec();
    if (!passwordResetToken) {
      return res
        .status(400)
        .send({ error: "Invalid link, or token has expired." });
    }

    const encryptedPassword = await bcrypt.hash(password, 10);
    user.password = encryptedPassword;
    await user.save();
    await PasswordResetTokenModel.deleteOne({
      userId: user._id,
      token: token,
    }).exec();

    res.send("Successfully reset password.");
  } catch (err) {
    handleError(err);
  }
};
