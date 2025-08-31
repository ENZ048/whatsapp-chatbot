import express from "express";
import { queryChatbotRoute } from "../controllers/queryController.js";

const router = express.Router();

// POST /api/query
router.post("/", queryChatbotRoute);

export default router;
