import mammoth from "mammoth";
import OpenAI from "openai";
import KnowledgeBase from "../models/KnowledgeBase.js";
import Chunk from "../models/Chunk.js";
import Chatbot from "../models/Chatbot.js";
import crypto from "crypto";

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

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export const uploadFile = async (req, res) => {
  try {
    const chatbotId = req.params.chatbotId || req.body.chatbotId;
    if (!chatbotId) {
      return res.status(400).json({ error: "chatbotId is required (path /chatbots/:chatbotId or body)" });
    }

    // Validate chatbot exists
    const chatbot = await Chatbot.findById(chatbotId);
    if (!chatbot) {
      return res.status(404).json({ error: "Chatbot not found" });
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

    // Duplicate detection by hash
    const fileHash = sha256(file.buffer);
    const existing = await KnowledgeBase.findOne({ chatbotId, fileHash });
    if (existing) {
      return res.status(200).json({
        success: true,
        message: "File already processed for this chatbot",
        knowledgeBaseId: existing._id,
        duplicate: true,
      });
    }

    // 🔹 Save file metadata + content (optional for audit)
    const knowledgeBase = await KnowledgeBase.create({
      chatbotId,
      filename: file.originalname,
      size: file.size,
      fileHash,
      content: extractedText,
      metadata: { mimetype: file.mimetype },
      processed: false,
    });

    // 🔹 Chunk + Batch Embed
    const chunks = splitIntoChunks(extractedText, 200);
    if (!chunks.length) {
      return res.status(500).json({ error: "No chunks produced from document" });
    }

    const embedStart = Date.now();
    const embeddingResp = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: chunks,
    });
    const embedMs = Date.now() - embedStart;

    const docs = chunks.map((c, i) => ({
      chatbotId,
      docId: knowledgeBase._id,
      chunk: c,
      embedding: embeddingResp.data[i].embedding,
    }));
  await Chunk.insertMany(docs);
  console.log(`📦 Embedded ${docs.length} chunks for chatbot ${chatbotId} in ${embedMs}ms (~${(embedMs / docs.length).toFixed(1)} ms/chunk)`);

    knowledgeBase.processed = true;
    knowledgeBase.chunkCount = docs.length;
    await knowledgeBase.save();

    res.json({
      success: true,
      message: "File uploaded & processed",
      knowledgeBaseId: knowledgeBase._id,
      chunks: docs.length,
      duplicate: false,
    });
  } catch (error) {
    console.error("❌ Upload Error:", error.message);
    res.status(500).json({ error: "Failed to process file" });
  }
};
