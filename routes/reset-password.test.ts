import crypto from "crypto";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import app from "../app";
import { PasswordResetTokenModel } from "../models/password-reset-token";
import { UserModel } from "../models/user";
import { seedDb } from "../seed-db";
import { mockConnect } from "../utils";

require("dotenv").config();

jest.mock("nodemailer", () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest
      .fn()
      .mockReturnValue((mailoptions: any, callback: any) => {}),
  }),
}));

describe("/api/reset-password", () => {
  let mongoServer: any;
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    await seedDb(mockConnect);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await PasswordResetTokenModel.deleteMany({});
  });

  describe("/", () => {
    describe("POST", () => {
      it("should return 400 if email is not provided", async () => {
        const res = await request(app).post("/api/reset-password").send({});
        expect(res.status).toBe(400);
      });

      it("should return 400 if no user exists with the provided email", async () => {
        const email = "superfake" + Math.random() + "@gmail.com";
        const res = await request(app)
          .post("/api/reset-password")
          .send({ email: email });
        const user = await UserModel.findOne({ email: email }).exec();
        expect(user).toBe(null);
        expect(res.status).toBe(400);
      });

      it("should return 200 if an email associated with a user is provided", async () => {
        const user = await UserModel.findOne({}).exec();
        if (!user) {
          throw new Error("No user found");
        }
        const res = await request(app)
          .post("/api/reset-password")
          .send({ email: user.email });
        expect(res.status).toBe(200);
      });
    });
  });

  describe("/:userId/:token", () => {
    describe("POST", () => {
      it("should 400 if no user exists with the provided ID", async () => {
        const userId = new mongoose.Types.ObjectId();
        const res = await request(app)
          .post(`/api/reset-password/${userId}/12345`)
          .send({ password: "12345" });
        expect(res.status).toBe(400);
      });

      it("should 400 if no password token is provided", async () => {
        const user = await UserModel.findOne({}).exec();
        if (!user) {
          throw new Error("No user found");
        }
        const passwordToken = "";
        const res = await request(app)
          .post("/api/reset-password/" + user._id + "/" + passwordToken + "/")
          .send({ password: "12345" });
        expect(res.status).toBe(404);
      });

      it("should 400 if no password is provided", async () => {
        const user = await UserModel.findOne({}).exec();
        if (!user) {
          throw new Error("No user found");
        }
        const res = await request(app)
          .post("/api/reset-password/" + user._id + "/12345")
          .send({});
        expect(res.status).toBe(400);
      });

      it("should 200 when valid userId, token, and password are provided", async () => {
        const user = await UserModel.findOne({ username: "Alice" }).exec();
        if (!user) {
          throw new Error("No user found");
        }
        const token = crypto.randomBytes(32).toString("hex");
        await PasswordResetTokenModel.create({
          userId: user._id,
          token: token,
        });
        const res = await request(app)
          .post("/api/reset-password/" + user._id + "/" + token)
          .send({ password: "newpassword" });
        expect(res.status).toBe(200);
      });
    });
  });
});
