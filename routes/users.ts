import express from "express";
import {
  createUser,
  deleteUser,
  getCurrentUser,
  getUser,
  login,
  updateUser,
} from "../controllers/users";
import { verifyAccessToken } from "./utils";

const router = express.Router();

router.get("/", verifyAccessToken, getCurrentUser);
router.post("/", createUser);

router.put("/:id", verifyAccessToken, updateUser);
router.get("/:username", getUser);
router.delete("/:id", verifyAccessToken, deleteUser);

router.post("/session", login);

export default router;
