import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import app from "./app";
import { seedDb } from "./seed-db";

describe("/api", () => {
  let mongoServer: any;
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    await seedDb();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe("/posts", () => {
    describe("GET", () => {
      describe("with page param", () => {
        describe("present", () => {
          it("should 200", async () => {
            const response = await request(app).get("/api/posts?page=1");
            expect(response.status).toBe(200);
          });

          it("should return the page of posts requested", async () => {
            const response = await request(app).get("/api/posts?page=2");
            expect(response.body.page).toBe(2);
          });
        });

        describe("missing", () => {
          it("should 200", async () => {
            const response = await request(app).get("/api/posts");
            expect(response.status).toBe(200);
          });

          it("should return the first page of posts", async () => {
            const response = await request(app).get("/api/posts");
            expect(response.body.page).toBe(1);
          });
        });
      });

      describe("with free param", () => {});

      describe("with search param", () => {});
    });
  });
});
