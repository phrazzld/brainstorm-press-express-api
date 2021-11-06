import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { LndNodeModel } from "../models/lnd-node";
import { PostModel } from "../models/post";
import { PostPaymentModel } from "../models/post-payment";
import { RefreshTokenModel } from "../models/refresh-token";
import { UserModel } from "../models/user";
import {
  generateAccessToken,
  handleError,
  PUBLIC_USER_INFO,
} from "../routes/utils";

const generateRefreshToken = async (user: any): Promise<string> => {
  console.debug("--- generateRefreshToken ---");
  const refreshToken = jwt.sign(
    { _id: user._id, username: user.username },
    process.env.REFRESH_TOKEN_SECRET as string
  );

  await RefreshTokenModel.create({ token: refreshToken });

  return refreshToken;
};

export const createUser = async (req: Request, res: Response) => {
  console.debug("--- createUser ---");
  try {
    // Get user input
    const { username, email, blog, password } = req.body;

    // Validate user input
    if (!(username && email && blog && password)) {
      return res
        .status(400)
        .send({ error: "Please enter a username, email, and password." });
    }

    // Validate username
    const invalidUsernameCheck = new RegExp(/[^a-zA-Z0-9_-]/gi);
    if (invalidUsernameCheck.test(username)) {
      return res.status(400).send({ error: "Invalid username." });
    }

    // Check if username is taken
    const usernameTaken = await UserModel.findOne({ username }).exec();
    if (usernameTaken) {
      return res.status(409).send({ error: "Username taken." });
    }

    // Check if email is taken
    const emailTaken = await UserModel.findOne({ email }).exec();
    if (emailTaken) {
      return res.status(409).send({ error: "Email taken." });
    }

    // Encrypt password
    const encryptedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await UserModel.create({
      username,
      email,
      blog,
      password: encryptedPassword,
    });
    console.debug("newUser:", newUser);

    // Create access token
    const accessToken = generateAccessToken(newUser);
    console.debug("accessToken:", accessToken);

    // Create refresh token
    const refreshToken = await generateRefreshToken(newUser);
    console.debug("refreshToken:", refreshToken);

    // Add the refresh token to the response cookie
    res.cookie("refreshToken", refreshToken, {
      maxAge: 3.154e10, // 1 year
      httpOnly: true,
    });

    // Return the new user
    return res.status(201).send({
      user: newUser,
      accessToken: accessToken,
      refreshToken: refreshToken,
    });
  } catch (err) {
    handleError(err);
  }
};

export const updateUser = async (req: Request, res: Response) => {
  console.debug("--- updateUser ---");
  const { email, blog, btcAddress } = req.body;

  try {
    const user = await UserModel.findOneAndUpdate(
      { _id: (<any>req).user._id },
      { email: email, blog: blog, btcAddress: btcAddress },
      { new: true }
    );
    res.status(204).send(user);
  } catch (err) {
    handleError(err);
  }
};

export const getCurrentUser = async (req: Request, res: Response) => {
  console.debug("--- getCurrentUser ---");
  try {
    const user = await UserModel.findOne({ _id: (<any>req).user._id })
      .populate("node")
      .exec();

    res.status(200).send(user);
  } catch (err) {
    handleError(err);
  }
};

export const getUser = async (req: Request, res: Response) => {
  console.debug("--- getUser ---");
  try {
    console.log("req.params:", req.params);
    const { username } = req.params;
    const user = await UserModel.findOne({ username: username })
      .select(PUBLIC_USER_INFO)
      .exec();
    res.status(200).send(user);
  } catch (err) {
    handleError(err);
  }
};

export const login = async (req: Request, res: Response) => {
  console.debug("--- login ---");
  try {
    // Get user input
    const { email, password } = req.body;

    // Validate user input
    if (!(email && password)) {
      return res.status(400).send({ error: "Invalid credentials." });
    }

    // Find user
    const user = await UserModel.findOne({ email }).populate("node").exec();
    console.debug("user:", user);

    if (user && (await bcrypt.compare(password, user.password))) {
      // Create access token
      const accessToken = generateAccessToken(user);
      console.debug("accessToken:", accessToken);

      // Create refresh token
      const refreshToken = await generateRefreshToken(user);
      console.log("refreshToken:", refreshToken);

      // Add the refresh token to the response cookie
      res.cookie("refreshToken", refreshToken, {
        maxAge: 3.154e10, // 1 year
        httpOnly: true,
      });

      // Return logged in user
      return res.status(200).send({
        user: user,
        accessToken: accessToken,
        refreshToken: refreshToken,
      });
    }
    return res.status(400).send({ error: "Invalid credentials." });
  } catch (err) {
    handleError(err);
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  console.debug("--- deleteUser ---");
  const { id } = req.params;
  if (!id) {
    throw new Error("Cannot find user to delete.");
  }

  try {
    const user = await UserModel.findById(id).exec();
    if (!user) {
      throw new Error("Cannot find user to delete.");
    }

    // Delete associated data
    await PostModel.deleteMany({ user: user._id }).exec();
    if (user.node) {
      await LndNodeModel.deleteOne({ _id: user.node }).exec();
    }
    await PostPaymentModel.deleteMany({ userId: user._id }).exec();
    if (user.refreshToken) {
      await RefreshTokenModel.deleteOne({ _id: user.refreshToken }).exec();
    }

    // Delete user
    await UserModel.deleteOne({ _id: id }).exec();

    return res.status(204).send("User deleted successfully.");
  } catch (err) {
    handleError(err);
  }
};
