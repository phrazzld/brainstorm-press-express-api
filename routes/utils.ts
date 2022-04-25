import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import * as _ from "lodash";

export const PUBLIC_USER_INFO =
  "_id username blog subscriptionPrice btcAddress";

export const handleError = (err: any) => {
  console.error(err);
  if (err instanceof Error) {
    throw new Error(err.message);
  } else {
    console.warn(err);
  }
};

export const generateAccessToken = (user: any): string => {
  return jwt.sign(
    { _id: user._id, username: user.username },
    process.env.ACCESS_TOKEN_SECRET as string,
    {
      expiresIn: "15m",
    }
  );
};

export const verifyAccessToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.get("authorization");

  if (!authHeader) {
    return res.status(403).json("No authorization header sent.");
  }

  const accessToken = authHeader.replace("Bearer", "").trim();

  if (!accessToken) {
    return res.status(403).json("Access token required for authorization.");
  }

  try {
    const decoded = jwt.verify(
      accessToken,
      process.env.ACCESS_TOKEN_SECRET as string
    );
    _.assign(req, { user: decoded });
  } catch (err) {
    return res.status(401).json("Invalid access token.");
  }

  return next();
};
