import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import app from "../app";
import { seedDb } from "../seed-db";
import { mockConnect } from "../utils";

require("dotenv").config();

describe("/api/users", () => {
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

  describe("/", () => {
    describe("GET", () => {
      describe("without an access token", () => {
        it("should 403", async () => {
          const response = await request(app).get("/api/users");
          expect(response.status).toBe(403);
        });
      });

      describe("with an invalid access token", () => {
        test.todo("should 401");
      });

      describe("with a valid access token", () => {
        test.todo("should 200");
      });
    });

    describe("POST", () => {});
  });

  describe("/session", () => {
    describe("POST", () => {});
  });

  describe("/:id", () => {
    describe("PUT", () => {});
    describe("DELETE", () => {});
  });

  describe("/:username", () => {
    describe("GET", () => {});
  });

  describe("/:id/payments", () => {
    describe("GET", () => {});
    describe("POST", () => {});
  });

  describe("/:id/access", () => {
    describe("GET", () => {});
  });
});
