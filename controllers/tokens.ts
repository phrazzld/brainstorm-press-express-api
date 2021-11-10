import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { RefreshTokenModel } from "../models/refresh-token";
import { generateAccessToken, handleError } from "../routes/utils";

export const deleteRefreshToken = async (req: Request, res: Response) => {
  try {
    await RefreshTokenModel.deleteOne({ token: req.cookies.refreshToken });
    res.clearCookie("refreshToken");
    res.status(204).send("Refresh token deleted successfully.");
  } catch (err) {
    handleError(err);
  }
};

export const createAccessToken = async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    return res
      .status(401)
      .json("Cannot create access token without refresh token.");
  }

  const dbRefreshToken = await RefreshTokenModel.findOne({
    token: refreshToken,
  }).exec();
  if (!dbRefreshToken) {
    return res.status(403).json("Invalid refresh token.");
  }

  jwt.verify(
    refreshToken,
    process.env.REFRESH_TOKEN_SECRET as string,
    (err: any, user: any) => {
      if (err) {
        console.error(err);
        return res.status(403).json("Could not verify refresh token.");
      }
      const accessToken = generateAccessToken(user);
      return res.status(200).json(accessToken);
    }
  );
};
