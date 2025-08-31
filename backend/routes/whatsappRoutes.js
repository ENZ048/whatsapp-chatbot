import express from "express";
import { verifyWebhook, receiveMessage } from "../controllers/whatsappController.js";

const router = express.Router();

// For Meta webhook verification
router.get("/", verifyWebhook);

// For receiving messages
router.post("/", receiveMessage);

export default router;
