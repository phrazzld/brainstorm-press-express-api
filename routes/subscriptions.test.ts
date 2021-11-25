import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import app from "../app";
import { SubscriptionModel } from "../models/subscription";
import { UserModel } from "../models/user";
import { seedDb } from "../seed-db";
import { mockConnect } from "../utils";
import { generateAccessToken } from "./utils";

require("dotenv").config();

describe("/api/subscriptions", () => {
  let mongoServer: any;
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    await seedDb(mockConnect);
    const reader = await UserModel.findOne({}).exec();
    const author = await UserModel.findOne({}).exec();
    await SubscriptionModel.create({ reader, author });
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe("/", () => {
    describe("GET", () => {
      describe("without an access token", () => {
        it("should return 403", async () => {
          const res = await request(app).get("/api/subscriptions");
          expect(res.status).toBe(403);
        });
      });

      describe("with an invalid access token", () => {
        it("should return 401", async () => {
          const res = await request(app)
            .get("/api/subscriptions")
            .set("Authorization", "Bearer invalid-token");
          expect(res.status).toBe(401);
        });
      });

      describe("with a valid access token", () => {
        it("should return 200", async () => {
          const user = await UserModel.findOne({}).exec();
          const accessToken = generateAccessToken(user);
          const res = await request(app)
            .get("/api/subscriptions")
            .set("Authorization", `Bearer ${accessToken}`);
          expect(res.status).toBe(200);
        });
      });
    });

    describe("POST", () => {
      describe("without an access token", () => {
        it("should return 403", async () => {
          const res = await request(app).post("/api/subscriptions");
          expect(res.status).toBe(403);
        });
      });

      describe("with an invalid access token", () => {
        it("should return 401", async () => {
          const res = await request(app)
            .post("/api/subscriptions")
            .set("Authorization", "Bearer invalid-token");
          expect(res.status).toBe(401);
        });
      });

      describe("with a valid access token", () => {
        it("should return 201", async () => {
          const user = await UserModel.findOne({}).exec();
          const accessToken = generateAccessToken(user);
          const res = await request(app)
            .post("/api/subscriptions")
            .set("Authorization", `Bearer ${accessToken}`);
          expect(res.status).toBe(201);
        });
      });
    });
  });

  describe("/:id", () => {
    describe("DELETE", () => {
      describe("without an access token", () => {
        it("should return 403", async () => {
          const sub = await SubscriptionModel.findOne({}).exec();
          if (!sub) {
            throw new Error("No subscription found");
          }
          const res = await request(app).delete(
            "/api/subscriptions/" + sub._id
          );
          expect(res.status).toBe(403);
        });
      });

      describe("with an invalid access token", () => {
        it("should return 401", async () => {
          const sub = await SubscriptionModel.findOne({}).exec();
          if (!sub) {
            throw new Error("No subscription found");
          }
          const res = await request(app)
            .delete("/api/subscriptions/" + sub._id)
            .set("Authorization", "Bearer invalid-token");
          expect(res.status).toBe(401);
        });
      });

      describe("with a valid access token", () => {
        it("should return 204", async () => {
          const sub = await SubscriptionModel.findOne({}).exec();
          if (!sub) {
            throw new Error("No subscription found");
          }
          const user = await UserModel.findOne({}).exec();
          const accessToken = generateAccessToken(user);
          const res = await request(app)
            .delete("/api/subscriptions/" + sub._id)
            .set("Authorization", `Bearer ${accessToken}`);
          expect(res.status).toBe(204);
        });
      });
    });
  });
});
