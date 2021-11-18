import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import app from "./app";

describe("Test basics", () => {
  let mongoServer: any;
  beforeEach(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterEach(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("should run", () => {
    expect(true).toBe(true);
  });

  it("should return 200", async () => {
    const response = await request(app).get("/api/posts?page=1");
    expect(response.status).toBe(200);
  });
});
