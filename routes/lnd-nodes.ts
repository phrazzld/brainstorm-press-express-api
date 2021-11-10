import express from "express";
import {
  connectNode,
  deleteNode,
  getNode,
  getNodeStatus,
} from "../controllers/lnd-nodes";
import { verifyAccessToken } from "./utils";

const router = express.Router();

router.post("/", verifyAccessToken, connectNode);

router.get("/", getNode);
router.delete("/", deleteNode);

router.get("/:id", getNodeStatus);

export default router;