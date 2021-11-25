import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import app from "../app";
import { seedDb } from "../seed-db";
import { mockConnect } from "../utils";

require("dotenv").config();

describe("/api/tokens", () => {
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

  describe("/access", () => {
    describe("POST", () => {
      describe("without a refresh token", () => {
        it("should 401", async () => {
          const response = await request(app)
            .post("/api/tokens/access")
            .send({});
          expect(response.status).toBe(401);
        });
      });

      describe("with an invalid refresh token", () => {
        test.todo("should 403 if an invalid refresh token is provided");
      });

      describe("with a valid refresh token", () => {
        test.todo("should 200 if valid refresh token is provided");

        test.todo("should return newly generated access token");
      });
    });
  });

  describe("/refresh", () => {
    describe("DELETE", () => {
      test.todo("should 204 on successful deletion");
    });
  });
});
