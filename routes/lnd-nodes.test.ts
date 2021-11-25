import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import app from "../app";
import { LnNodeModel } from "../models/ln-node";
import { seedDb } from "../seed-db";
import { mockConnect } from "../utils";

require("dotenv").config();

describe("/api/nodes", () => {
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
    describe("POST", () => {
      describe("without an access token", () => {
        test.todo("should 403");
      });

      describe("with an invalid access token", () => {
        test.todo("should 401");
      });

      describe("with a valid access token", () => {
        test.todo("should 201");
      });
    });

    describe("GET", () => {
      describe("without an access token", () => {
        test.todo("should 200");
      });

      describe("with an invalid access token", () => {
        test.todo("should 200");
      });

      describe("with a valid access token", () => {
        test.todo("should 200");
      });
    });

    describe("DELETE", () => {
      describe("without an access token", () => {
        test.todo("should 204");
      });

      describe("with an invalid access token", () => {
        test.todo("should 204");
      });

      describe("with a valid access token", () => {
        test.todo("should 204");
      });
    });
  });

  describe("/:id", () => {
    describe("GET", () => {
      describe("without an access token", () => {
        it("should 200", async () => {
          const node = await LnNodeModel.findOne().exec();
          if (!node) {
            throw new Error("No node found");
          }

          await request(app).get(`/api/nodes/${node._id}`).expect(200);
        });
      });

      describe("with an invalid access token", () => {
        test.todo("should 200");
      });

      describe("with a valid access token", () => {
        test.todo("should 200");
      });
    });
  });
});
