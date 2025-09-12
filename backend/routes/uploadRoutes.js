import express from "express";
import multer from "multer";
import { uploadFile } from "../controllers/uploadController.js";

const router = express.Router();

// Use memory storage instead of disk
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Legacy generic upload (expects chatbotId in body)
router.post("/", upload.single("file"), uploadFile);

// Preferred chatbot-scoped upload (chatbotId in path)
router.post("/chatbots/:chatbotId", upload.single("file"), uploadFile);

export default router;
