import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import expressWs from "express-ws";
import nodeManager, { NodeEvents } from "./node-manager";
import router from "./routes/index";

const SocketEvents = {
  postUpdated: "post-updated",
  invoicePaid: "invoice-paid",
};

// Create Express server
const { app } = expressWs(express());
app.use(cors({ origin: process.env.BASE_URL }));
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

app.use("/api", router);

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
