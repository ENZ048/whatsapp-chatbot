import express from "express";
import { embedDocument } from "../controllers/embedController.js";

const router = express.Router();

router.post("/:docId", embedDocument);

export default router;
