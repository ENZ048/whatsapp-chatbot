import mongoose from "mongoose";

const chunkSchema = new mongoose.Schema(
  {
    chatbotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chatbot",
      required: true,
    },
    docId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "KnowledgeBase",
      required: true,
    },
    chunk: { type: String, required: true },
    embedding: { type: [Number], required: true }, // vector array
  },
  { timestamps: true }
);

// Required for MongoDB Atlas Vector Search
chunkSchema.index({ embedding: "vectorSearch" });

export default mongoose.model("Chunk", chunkSchema);
