import express from "express";
import {
  connectNode,
  deleteNode,
  getNode,
  getNodeStatus,
} from "../controllers/lnd-nodes";

const router = express.Router();

router.post("/", connectNode);

router.get("/", getNode);
router.delete("/", deleteNode);

router.get("/:id", getNodeStatus);

export default router;
