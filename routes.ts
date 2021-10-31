import express from "express";
import nodesRouter from "./routes/lnd-nodes";
import postsRouter from "./routes/posts";
import resetPasswordRouter from "./routes/reset-password";
import tokensRouter from "./routes/tokens";
import usersRouter from "./routes/users";

const router = express.Router();

router.use("/users", usersRouter);
router.use("/posts", postsRouter);
router.use("/nodes", nodesRouter);
router.use("/tokens", tokensRouter);
router.use("/reset-password", resetPasswordRouter);

export default router;
