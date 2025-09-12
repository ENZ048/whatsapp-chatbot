import { queryChatbot } from "../services/queryService.js";
import Conversation from "../models/Conversation.js";

/**
 * Express route controller for /api/query
 */
export const queryChatbotRoute = async (req, res) => {
  try {
    const { chatbotId, query, userNumber } = req.body;
    if (!chatbotId || !query || !userNumber) {
      return res.status(400).json({ error: "chatbotId, query, and userNumber are required" });
    }

    // Fetch last 10 messages for this user/chatbot for context
    const previousConvos = await Conversation.find({
      chatbotId,
      userNumber
    })
      .sort({ timestamp: -1 })
      .limit(10)
      .lean();

    // Build history array (oldest first)
    const history = previousConvos
      .map(c => [
        { role: "user", content: c.question },
        { role: "assistant", content: c.answer }
      ])
      .flat()
      .reverse();

    const result = await queryChatbot(chatbotId, query, history);
    // Ensure only answer-quality related fields are exposed (answer, confidence, sources)
    res.json({
      answer: result.answer,
      confidence: result.confidence,
      sources: result.sources
    });
  } catch (err) {
    console.error("❌ Query Route Error:", err.message);
    res.status(500).json({ error: "Failed to process query" });
  }
};
