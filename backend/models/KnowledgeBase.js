import mongoose from "mongoose";

const knowledgeBaseSchema = new mongoose.Schema(
  {
    chatbotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chatbot",
      required: true,
    },
    filename: { type: String, required: true },
    metadata: { type: Object }, // file size, page count, etc.
  },
  { timestamps: true }
);

export default mongoose.model("KnowledgeBase", knowledgeBaseSchema);
