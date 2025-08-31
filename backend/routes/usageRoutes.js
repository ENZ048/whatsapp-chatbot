import express from "express";
import { getUsageByChatbot, getUsageByCompany } from "../controllers/usageController.js";

const router = express.Router();

// GET /api/usage/chatbot/:chatbotId
router.get("/chatbot/:chatbotId", getUsageByChatbot);

// GET /api/usage/company/:companyId
router.get("/company/:companyId", getUsageByCompany);

export default router;
