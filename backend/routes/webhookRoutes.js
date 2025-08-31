import express from "express";
import { whatsappWebhook } from "../controllers/webhookController.js";

const router = express.Router();

// Meta Webhook endpoint
router.get("/webhook/whatsapp", whatsappWebhook); // verification
router.post("/webhook/whatsapp", whatsappWebhook); // incoming messages

export default router;
