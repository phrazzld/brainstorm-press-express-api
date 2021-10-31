import express from "express";
import { createAccessToken, deleteRefreshToken } from "../controllers/tokens";

const router = express.Router();

router.post("/access", createAccessToken);
router.delete("/refresh", deleteRefreshToken);

export default router;
