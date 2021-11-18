import mongoose from "mongoose";
import app from "./app";
import { LndNodeModel } from "./models/lnd-node";
import nodeManager from "./node-manager";
import { seedDb } from "./seed-db";

require("dotenv").config();

const PORT: number = 4000;

// Database setup
// TODO: Differentiate between dev and prod
const mongoUri: string = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_CLUSTER}.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;

mongoose.connect(mongoUri);
const db = mongoose.connection;
db.on("error", (err) => {
  console.error(err);
});
db.once("open", () => {
  console.log("Successfully connected to the database.");
  // If the database is empty, and we're in a development environment, seed it
  console.log(`Environment: ${process.env.NODE_ENV}.`);
  if (process.env.NODE_ENV === "development") {
    seedDb();
  }
});

// Start server
app.listen(PORT, async () => {
  console.log(`Listening on port ${PORT}.`);

  const allNodes = await LndNodeModel.find({});
  await nodeManager.reconnectNodes(allNodes);
});
