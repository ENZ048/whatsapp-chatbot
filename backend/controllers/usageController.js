import Usage from "../models/Usage.js";

// Get usage for a chatbot
export const getUsageByChatbot = async (req, res) => {
  try {
    const { chatbotId } = req.params;
    const usage = await Usage.findOne({ chatbotId });

    if (!usage) return res.json({ totalMessages: 0, uniqueUsers: 0 });

    res.json({
      totalMessages: usage.totalMessages,
      uniqueUsers: usage.uniqueUsers.length,
      lastReset: usage.lastReset,
    });
  } catch (err) {
    console.error("❌ Get Usage Error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// Get usage for a company (aggregate)
export const getUsageByCompany = async (req, res) => {
  try {
    const { companyId } = req.params;

    const usages = await Usage.find({ companyId });

    const totalMessages = usages.reduce((acc, u) => acc + u.totalMessages, 0);
    const uniqueUsers = [...new Set(usages.flatMap((u) => u.uniqueUsers))];

    res.json({
      totalMessages,
      uniqueUsers: uniqueUsers.length,
    });
  } catch (err) {
    console.error("❌ Get Company Usage Error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};
