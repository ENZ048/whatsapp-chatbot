import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema({
  chatbotId: { type: mongoose.Schema.Types.ObjectId, ref: "Chatbot", required: true },
  userNumber: { type: String, required: true }, // WhatsApp number of the end-user
  question: { type: String, required: true },
  answer: { type: String, required: true },
  confidence: { type: Number }, // optional, from RAG retrieval score
  sourceDocs: [{ type: mongoose.Schema.Types.ObjectId, ref: "KnowledgeBase" }], // optional: docs that were used
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model("Conversation", conversationSchema);
