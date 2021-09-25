import cors from "cors";
import express from "express";
import expressWs from "express-ws";
import mongoose from "mongoose";
import nodeManager, { NodeEvents } from "./node-manager";
import { SocketEvents } from "./posts-db";
import * as routes from "./routes";

require("dotenv").config();

const PORT: number = 4000;

// Create Express server
const { app } = expressWs(express());
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

// Database setup
const mongoUri: string = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_CLUSTER}.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;

mongoose.connect(mongoUri);
const db = mongoose.connection;
db.on("error", (err) => {
  console.error(err);
});
db.once("open", () => {
  console.log("Successfully connected to database.");
});

app.post("/api/connect", routes.connect);
app.get("/api/info", routes.getInfo);
app.get("/api/posts", routes.getPosts);
app.post("/api/posts", routes.createPost);
app.delete("/api/posts/:id", routes.deletePost);
app.post("/api/posts/:id/invoice", routes.postInvoice);
app.post("/api/posts/:id/upvote", routes.upvotePost);
app.post("/api/users", routes.createUser);
app.post("/api/login", routes.login);

// Configure Websocket
app.ws("/api/events", (ws) => {
  // When a websocket connection is made, add listeners for invoices
  const paymentsListener = (info: any) => {
    const event = { type: SocketEvents.invoicePaid, data: info };
    ws.send(JSON.stringify(event));
  };

  // Add listeners to send data over the socket
  nodeManager.on(NodeEvents.invoicePaid, paymentsListener);

  // Remove listeners when the socket is closed
  ws.on("close", () => {
    nodeManager.off(NodeEvents.invoicePaid, paymentsListener);
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`Listening on port ${PORT}`);
});
