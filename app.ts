import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import expressWs from "express-ws";
import nodeManager, { NodeEvents } from "./node-manager";
import * as routes from "./routes";

const SocketEvents = {
  postUpdated: "post-updated",
  invoicePaid: "invoice-paid",
};

// Create Express server
const { app } = expressWs(express());
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());
app.use(cookieParser());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Origin", req.headers.origin);
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
  res.header(
    "Access-Control-Allow-Headers",
    "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, Authorization"
  );
  next();
});

// TODO: Refactor LND routes to verify both LND token and access token
app.post("/api/connect", routes.verifyAccessToken, routes.connect);
app.delete("/api/node", routes.deleteNode);
app.get("/api/node/info", routes.getInfo);
app.get("/api/nodes/:id/status", routes.getNodeStatus);
app.get("/api/drafts", routes.verifyAccessToken, routes.getDraftPosts);
app.get("/api/posts/:id", routes.getPost);
app.put("/api/posts/:id", routes.verifyAccessToken, routes.updatePost);
app.get("/api/posts", routes.getPosts);
app.post("/api/posts", routes.verifyAccessToken, routes.createPost);
app.delete("/api/posts/:id", routes.verifyAccessToken, routes.deletePost);
app.post(
  "/api/posts/:id/invoice",
  routes.verifyAccessToken,
  routes.postInvoice
);
app.post("/api/users", routes.createUser);
app.get("/api/users/:id/posts", routes.getUserPosts);
app.put("/api/users/:id", routes.verifyAccessToken, routes.updateUser);
app.get("/api/users/current", routes.verifyAccessToken, routes.getCurrentUser);
app.post("/api/login", routes.login);
app.get("/api/posts/:id/payments", routes.verifyAccessToken, routes.getPayment);
app.post(
  "/api/posts/:id/payments",
  routes.verifyAccessToken,
  routes.logPayment
);
app.post("/api/accessToken", routes.createAccessToken);
app.delete("/api/refreshToken", routes.deleteRefreshToken);
app.get("/api/users/:id", routes.getUser);

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

export default app;
