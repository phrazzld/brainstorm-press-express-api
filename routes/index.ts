import express from "express";
import nodesRouter from "./lnd-nodes";
import postsRouter from "./posts";
import resetPasswordRouter from "./reset-password";
import tokensRouter from "./tokens";
import usersRouter from "./users";

const router = express.Router();

router.use("/users", usersRouter);
router.use("/posts", postsRouter);
router.use("/nodes", nodesRouter);
router.use("/tokens", tokensRouter);
router.use("/reset-password", resetPasswordRouter);

export default router;
