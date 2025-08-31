import express from "express";
import { getConversations, getConversationById } from "../controllers/conversationController.js";

const router = express.Router();

// GET /api/conversations/:chatbotId?userNumber=...&fromDate=...&toDate=...
router.get("/:chatbotId", getConversations);

// GET /api/conversations/single/:id
router.get("/single/:id", getConversationById);

export default router;
