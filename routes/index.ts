import express from "express";
import nodesRouter from "./lnd-nodes";
import postsRouter from "./posts";
import resetPasswordRouter from "./reset-password";
import subsRouter from "./subscriptions";
import tokensRouter from "./tokens";
import usersRouter from "./users";

const router = express.Router();

router.use("/nodes", nodesRouter);
router.use("/posts", postsRouter);
router.use("/reset-password", resetPasswordRouter);
router.use("/subscriptions", subsRouter);
router.use("/tokens", tokensRouter);
router.use("/users", usersRouter);

export default router;
