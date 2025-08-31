import Conversation from "../models/Conversation.js";

// Get all conversations for a chatbot
export const getConversations = async (req, res) => {
  try {
    const { chatbotId } = req.params;
    const { userNumber, fromDate, toDate } = req.query;

    const filter = { chatbotId };

    if (userNumber) filter.userNumber = userNumber;
    if (fromDate || toDate) {
      filter.timestamp = {};
      if (fromDate) filter.timestamp.$gte = new Date(fromDate);
      if (toDate) filter.timestamp.$lte = new Date(toDate);
    }

    const conversations = await Conversation.find(filter).sort({ timestamp: -1 });
    res.json(conversations);
  } catch (err) {
    console.error("❌ Get Conversations Error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// Get single conversation
export const getConversationById = async (req, res) => {
  try {
    const convo = await Conversation.findById(req.params.id);
    if (!convo) return res.status(404).json({ error: "Conversation not found" });
    res.json(convo);
  } catch (err) {
    console.error("❌ Get Conversation Error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};
