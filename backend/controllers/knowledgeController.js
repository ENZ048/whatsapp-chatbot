import KnowledgeBase from "../models/KnowledgeBase.js";
import Chunk from "../models/Chunk.js";
import mongoose from "mongoose";

// GET /api/chatbots/:id/knowledge
export const listKnowledgeForChatbot = async (req, res) => {
  try {
    const { id } = req.params; // chatbot id
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid chatbot id" });
    }

    const docs = await KnowledgeBase.find({ chatbotId: id })
      .sort({ createdAt: -1 })
      .select("filename size chunkCount processed createdAt fileHash");

    res.json({ success: true, count: docs.length, knowledge: docs });
  } catch (err) {
    console.error("❌ List Knowledge Error:", err.message);
    res.status(500).json({ error: "Failed to list knowledge" });
  }
};

// DELETE /api/chatbots/:id/knowledge/:kbId  (unembed / cleanup)
export const deleteKnowledgeForChatbot = async (req, res) => {
  try {
    const { id, kbId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(kbId)) {
      return res.status(400).json({ error: "Invalid id(s)" });
    }

    const kb = await KnowledgeBase.findOne({ _id: kbId, chatbotId: id });
    if (!kb) return res.status(404).json({ error: "Knowledge file not found for this chatbot" });

    // Delete chunks first
    const chunkDelete = await Chunk.deleteMany({ docId: kb._id, chatbotId: id });
    await kb.deleteOne();

    res.json({ success: true, message: "Knowledge deleted", deletedChunks: chunkDelete.deletedCount });
  } catch (err) {
    console.error("❌ Delete Knowledge Error:", err.message);
    res.status(500).json({ error: "Failed to delete knowledge" });
  }
};
