import express from "express";
import {
  createPost,
  deletePost,
  getDraftPosts,
  getPayment,
  getPost,
  getPosts,
  getUserPosts,
  logPayment,
  postInvoice,
  updatePost,
} from "../controllers/posts";
import { verifyAccessToken } from "./utils";

const router = express.Router();

router.get("/", getPosts);
router.post("/", verifyAccessToken, createPost);

router.get("/:id", getPost);
router.put("/:id", verifyAccessToken, updatePost);
router.delete("/:id", verifyAccessToken, deletePost);

router.post("/:id/invoice", verifyAccessToken, postInvoice);

router.get("/:id/payments", verifyAccessToken, getPayment);
router.post("/:id/payments", verifyAccessToken, logPayment);

router.get("/users/:username", getUserPosts);
router.get("/users/:username/drafts", verifyAccessToken, getDraftPosts);

export default router;
