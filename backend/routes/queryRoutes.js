import express from "express";
import { queryChatbot } from "../controllers/queryController.js";


const router = express.Router();

router.post("/", queryChatbot);

export default router;
