import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import app from "../app";
import { PostModel } from "../models/post";
import { UserModel } from "../models/user";
import { seedDb } from "../seed-db";
import { generateAccessToken } from "./utils";

require("dotenv").config();

describe("/api/reset-password", () => {
  let mongoServer: any;
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    await seedDb();
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoose.disconnect();
    await mongoServer.stop();
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
      test.todo("should 400 if no user exists with the provided ID");

      test.todo("should 400 if no password token is provided");

      test.todo("should 400 if no password is provided");

      test.todo(
        "should 200 when valid userId, token, and password are provided"
      );
    });
  });
});
