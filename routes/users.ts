import express from "express";
import {
  createUser,
  hasPaidAuthor,
  deleteUser,
  getCurrentUser,
  getUser,
  login,
  updateUser,
  getPaymentsToUser,
  logPayment,
} from "../controllers/users";
import { verifyAccessToken } from "./utils";

const router = express.Router();

router.get("/", verifyAccessToken, getCurrentUser);
router.post("/", createUser);

router.post("/session", login);

router.put("/:id", verifyAccessToken, updateUser);
router.get("/:username", getUser);
router.delete("/:id", verifyAccessToken, deleteUser);

router.get("/:id/payments", verifyAccessToken, getPaymentsToUser);
router.post("/:id/payments", verifyAccessToken, logPayment);

router.get("/:id/access", verifyAccessToken, hasPaidAuthor);

export default router;
