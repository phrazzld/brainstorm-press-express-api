import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import app from "./app";
import { UserModel } from "./models/user";
import { generateAccessToken } from "./routes/utils";
import { seedDb } from "./seed-db";

require("dotenv").config();

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

    describe("POST", () => {
      describe("with access token", () => {
        describe("with valid params", () => {
          it("should 201", async () => {
            const user = await UserModel.findOne({ username: "Alice" }).exec();
            const accessToken = generateAccessToken(user);
            const response = await request(app)
              .post("/api/posts")
              .set("Authorization", `Bearer ${accessToken}`)
              .send({
                title: "Test Post",
                content: "test content whadup",
              });
            expect(response.status).toBe(201);
          });
        });

        describe("with invalid params", () => {
          it("should 400", async () => {
            const user = await UserModel.findOne({ username: "Alice" }).exec();
            const accessToken = generateAccessToken(user);
            const response = await request(app)
              .post("/api/posts")
              .set("Authorization", `Bearer ${accessToken}`)
              .send({
                content: "test content whadup",
              });
            expect(response.status).toBe(400);
          });
        });
      });

      describe("without an access token", () => {
        it("should 403", async () => {
          const response = await request(app).post("/api/posts").send({
            title: "Test Post",
            content: "test content whadup",
          });
          expect(response.status).toBe(403);
        });
      });

      describe("with an invalid access token", () => {
        it("should 401", async () => {
          const response = await request(app)
            .post("/api/posts")
            .set("Authorization", `Bearer invalid`)
            .send({
              title: "Test Post",
              content: "test content whadup",
            });
          expect(response.status).toBe(401);
        });
      });
    });
  });
});
