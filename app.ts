import cors from "cors";
import express from "express";
import expressWs from "express-ws";
import mongoose from "mongoose";
import { LndNodeModel } from "./models";
import nodeManager, { NodeEvents } from "./node-manager";
import * as routes from "./routes";

require("dotenv").config();

const PORT: number = 4000;

const SocketEvents = {
  postUpdated: "post-updated",
  invoicePaid: "invoice-paid",
};

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

app.post("/api/connect", routes.verifyJWT, routes.connect);
app.delete("/api/node", routes.deleteNode);
app.get("/api/node/info", routes.getInfo);
app.get("/api/posts/:id", routes.getPost);
app.put("/api/posts/:id", routes.verifyJWT, routes.updatePost);
app.get("/api/posts", routes.getPosts);
app.post("/api/posts", routes.verifyJWT, routes.createPost);
app.delete("/api/posts/:id", routes.verifyJWT, routes.deletePost);
app.post("/api/posts/:id/invoice", routes.verifyJWT, routes.postInvoice);
app.post("/api/users", routes.createUser);
app.get("/api/users/:id/posts", routes.getUserPosts);
app.put("/api/users/:id", routes.verifyJWT, routes.updateUser)
app.post("/api/login", routes.login);
app.get("/api/posts/:id/payments", routes.verifyJWT, routes.getPayment);
app.post("/api/posts/:id/payments", routes.verifyJWT, routes.logPayment);

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

  const allNodes = await LndNodeModel.find({});
  await nodeManager.reconnectNodes(allNodes);
});
