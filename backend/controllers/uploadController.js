import mammoth from "mammoth";
import OpenAI from "openai";
import KnowledgeBase from "../models/KnowledgeBase.js";
import Chunk from "../models/Chunk.js";

let pdfParse; // 🔹 lazy import for PDF
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 🔹 Helper: Split text into ~200 word chunks
function splitIntoChunks(text, chunkSize = 200) {
  const words = text.split(/\s+/);
  const chunks = [];
  for (let i = 0; i < words.length; i += chunkSize) {
    chunks.push(words.slice(i, i + chunkSize).join(" "));
  }
  return chunks;
}

export const uploadFile = async (req, res) => {
  try {
    const { chatbotId } = req.body;
    if (!chatbotId) {
      return res.status(400).json({ error: "chatbotId is required" });
    }

    const file = req.file;
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    let extractedText = "";

    // 🔹 PDF
    if (file.mimetype === "application/pdf") {
      if (!pdfParse) {
        pdfParse = (await import("pdf-parse")).default;
      }
      const pdfData = await pdfParse(file.buffer); // ✅ use buffer
      extractedText = pdfData.text || "";

    // 🔹 DOCX
    } else if (
      file.mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const result = await mammoth.extractRawText({ buffer: file.buffer }); // ✅ use buffer
      extractedText = result.value || "";

    // 🔹 TXT
    } else if (file.mimetype === "text/plain") {
      extractedText = file.buffer.toString("utf-8") || "";

    } else {
      return res.status(400).json({ error: "Unsupported file type" });
    }

    if (!extractedText.trim()) {
      return res.status(400).json({ error: "File has no readable text" });
    }

    // 🔹 Save file metadata
    const knowledgeBase = await KnowledgeBase.create({
      chatbotId,
      filename: file.originalname,
      metadata: { size: file.size, mimetype: file.mimetype },
    });

    // 🔹 Chunk + Embed
    const chunks = splitIntoChunks(extractedText, 200);

    for (const chunk of chunks) {
      const embeddingRes = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: chunk,
      });

      await Chunk.create({
        chatbotId,
        docId: knowledgeBase._id,
        chunk,
        embedding: embeddingRes.data[0].embedding,
      });
    }

    res.json({ success: true, message: "File uploaded & processed" });
  } catch (error) {
    console.error("❌ Upload Error:", error.message);
    res.status(500).json({ error: "Failed to process file" });
  }
};
