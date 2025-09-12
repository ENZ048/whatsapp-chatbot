
import Chatbot from "../models/Chatbot.js";

// PATCH /api/chatbots/:id/persona
export const updateChatbotPersona = async (req, res) => {
  try {
    const { id } = req.params;
    const { persona } = req.body;
    if (!persona || typeof persona !== "string") {
      return res.status(400).json({ error: "Persona is required and must be a string" });
    }
    const chatbot = await Chatbot.findByIdAndUpdate(
      id,
      { persona },
      { new: true }
    );
    if (!chatbot) {
      return res.status(404).json({ error: "Chatbot not found" });
    }
    res.json({ success: true, chatbot });
  } catch (err) {
    res.status(500).json({ error: "Failed to update persona" });
  }
};

export const createChatbot = async (req, res) => {
  try {
    const { companyId, name, phoneNumberId } = req.body;

    const existing = await Chatbot.findOne({ phoneNumberId });
    if (existing) return res.status(400).json({ error: "phoneNumberId already exists" });

    const chatbot = await Chatbot.create({
      companyId,
      name,
      phoneNumberId,
      status: "active",
    });

    res.status(201).json(chatbot);
  } catch (err) {
    console.error("Create Chatbot Error:", err);
    res.status(500).json({ error: "Failed to create chatbot" });
  }
};

export const getChatbots = async (req, res) => {
  try {
    const { companyId } = req.query; // optional filter
    const filter = companyId ? { companyId } : {};
    const chatbots = await Chatbot.find(filter).sort({ createdAt: -1 });
    res.json(chatbots);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch chatbots" });
  }
};

export const getChatbotById = async (req, res) => {
  try {
    const chatbot = await Chatbot.findById(req.params.id);
    if (!chatbot) return res.status(404).json({ error: "Chatbot not found" });
    res.json(chatbot);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch chatbot" });
  }
};

export const updateChatbot = async (req, res) => {
  try {
    const chatbot = await Chatbot.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!chatbot) return res.status(404).json({ error: "Chatbot not found" });
    res.json(chatbot);
  } catch (err) {
    res.status(500).json({ error: "Failed to update chatbot" });
  }
};

export const deleteChatbot = async (req, res) => {
  try {
    const chatbot = await Chatbot.findByIdAndDelete(req.params.id);
    if (!chatbot) return res.status(404).json({ error: "Chatbot not found" });
    res.json({ message: "Chatbot deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete chatbot" });
  }
};
