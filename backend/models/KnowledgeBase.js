import mongoose from "mongoose";

const knowledgeBaseSchema = new mongoose.Schema(
  {
    chatbotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chatbot",
      required: true,
      index: true,
    },
    filename: { type: String, required: true },
    size: { type: Number },
    fileHash: { type: String, index: true }, // used for duplicate detection
    content: { type: String }, // raw extracted text (optional large field)
    metadata: { type: Object }, // additional metadata (mimetype, etc.)
    processed: { type: Boolean, default: true },
    chunkCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Prevent duplicate per chatbot: same fileHash reused
knowledgeBaseSchema.index({ chatbotId: 1, fileHash: 1 }, { unique: false });

export default mongoose.model("KnowledgeBase", knowledgeBaseSchema);
