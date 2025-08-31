import express from "express";
import {
  createChatbot,
  getChatbots,
  getChatbotById,
  updateChatbot,
  deleteChatbot,
} from "../controllers/chatbotController.js";

const router = express.Router();

// CRUD for chatbots
router.post("/", createChatbot);
router.get("/", getChatbots);
router.get("/:id", getChatbotById);
router.put("/:id", updateChatbot);
router.delete("/:id", deleteChatbot);

export default router;
