import cors from "cors";
import express, { Request, Response } from "express";
import expressWs from "express-ws";
import nodeManager, { NodeEvents } from "./node-manager";
import db, { Post, PostEvents, SocketEvents } from "./posts-db";
import * as routes from "./routes";

const PORT: number = 4000;

// Create Express server
const { app } = expressWs(express());
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

// Middleware to grab the token from the header and add it to the req.body
app.use((req, res, next) => {
  req.body.token = req.header("X-Token");
  next();
});

const catchAsyncErrors = (
  routeHandler: (req: Request, res: Response) => Promise<void> | void
) => {
  return async (req: Request, res: Response) => {
    try {
      const promise = routeHandler(req, res);
      if (promise) await promise;
    } catch (err: any) {
      res.status(400).send({ error: err.message });
    }
  };
};

// Routes
app.get("/", (req: Request, res: Response) => {
  res.send("Hello, World!");
});

app.post("/api/connect", catchAsyncErrors(routes.connect));
app.get("/api/info", catchAsyncErrors(routes.getInfo));
app.get("/api/posts", catchAsyncErrors(routes.getPosts));
app.post("/api/posts", catchAsyncErrors(routes.createPost));
app.post("/api/posts/:id/invoice", catchAsyncErrors(routes.postInvoice));
app.post("/api/posts/:id/upvote", catchAsyncErrors(routes.upvotePost));

// Configure Websocket
app.ws("/api/events", (ws) => {
  // When a websocket connection is made, add listeners for posts and invoices
  const postsListener = (posts: Array<Post>) => {
    const event = { type: SocketEvents.postUpdated, data: posts };
    ws.send(JSON.stringify(event));
  };

  const paymentsListener = (info: any) => {
    const event = { type: SocketEvents.invoicePaid, data: info };
    ws.send(JSON.stringify(event));
  };

  // Add listeners to send data over the socket
  db.on(PostEvents.updated, postsListener);
  nodeManager.on(NodeEvents.invoicePaid, paymentsListener);

  // Remove listeners when the socket is closed
  ws.on("close", () => {
    db.off(PostEvents.updated, postsListener);
    nodeManager.off(NodeEvents.invoicePaid, paymentsListener);
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`Listening on port ${PORT}`);

  // Restore data from DB file
  await db.restore();
  await nodeManager.reconnectNodes(db.getAllNodes());
});
