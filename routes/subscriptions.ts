import express from "express";
import {
  createSubscription,
  deleteSubscription,
  getSubscriptions,
} from "../controllers/subscriptions";
import { verifyAccessToken } from "./utils";

const router = express.Router();

router.get("/", verifyAccessToken, getSubscriptions);
router.post("/", verifyAccessToken, createSubscription);
router.delete("/:id", verifyAccessToken, deleteSubscription);

export default router;
