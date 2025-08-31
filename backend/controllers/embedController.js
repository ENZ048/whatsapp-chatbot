import { generateEmbeddings } from "../services/embeddingService.js";

export const embedDocument = async (req, res) => {
  try {
    const { docId } = req.params;
    const chunks = await generateEmbeddings(docId);
    res.json({ message: "Embeddings generated", chunks: chunks.length });
  } catch (err) {
    console.error("❌ Embedding error:", err.message);
    res.status(500).json({ error: "Failed to generate embeddings" });
  }
};
