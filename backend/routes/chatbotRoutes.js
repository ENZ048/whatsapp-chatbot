import express from "express";
import {
  createChatbot,
  getChatbots,
  getChatbotById,
  updateChatbot,
  deleteChatbot,
  updateChatbotPersona,
} from "../controllers/chatbotController.js";


const router = express.Router();

// CRUD for chatbots
router.post("/", createChatbot);
router.get("/", getChatbots);
router.get("/:id", getChatbotById);
router.put("/:id", updateChatbot);
router.delete("/:id", deleteChatbot);

// Knowledge management for a chatbot
router.get("/:id/knowledge", listKnowledgeForChatbot);
router.delete("/:id/knowledge/:kbId", deleteKnowledgeForChatbot);

// Persona update for a chatbot
router.patch("/:id/persona", updateChatbotPersona);
import { listKnowledgeForChatbot, deleteKnowledgeForChatbot } from "../controllers/knowledgeController.js";

export default router;
