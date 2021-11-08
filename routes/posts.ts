import express from "express";
import {
  createPost,
  deletePost,
  getDraftPosts,
  getPost,
  getPosts,
  getPostsFromSubscriptions,
  getUserPosts,
  postInvoice,
  updatePost,
} from "../controllers/posts";
import { verifyAccessToken } from "./utils";

const router = express.Router();

router.get("/", getPosts);
router.post("/", verifyAccessToken, createPost);

router.get("/subscriptions", verifyAccessToken, getPostsFromSubscriptions);

router.get("/:id", getPost);
router.put("/:id", verifyAccessToken, updatePost);
router.delete("/:id", verifyAccessToken, deletePost);

router.post("/:id/invoice", verifyAccessToken, postInvoice);

router.get("/users/:username", getUserPosts);
router.get("/users/:username/drafts", verifyAccessToken, getDraftPosts);

export default router;
