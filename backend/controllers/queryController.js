import { queryChatbot } from "../services/queryService.js";

/**
 * Express route controller for /api/query
 */
export const queryChatbotRoute = async (req, res) => {
  try {
    const { chatbotId, query } = req.body;
    if (!chatbotId || !query) {
      return res.status(400).json({ error: "chatbotId and query are required" });
    }

    const result = await queryChatbot(chatbotId, query);
    res.json(result);
  } catch (err) {
    console.error("❌ Query Route Error:", err.message);
    res.status(500).json({ error: "Failed to process query" });
  }
};
