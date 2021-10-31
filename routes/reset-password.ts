import express from "express";
import {
  resetPassword,
  sendResetPasswordEmail,
} from "../controllers/reset-password";

const router = express.Router();

router.post("/", sendResetPasswordEmail);
router.post("/:userId/:token", resetPassword);

export default router;
