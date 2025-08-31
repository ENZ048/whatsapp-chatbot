import OpenAI from "openai";
import KnowledgeBase from "../models/KnowledgeBase.js";
import Chunk from "../models/Chunk.js";
import dotenv from 'dotenv'

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Simple chunking function (200 words per chunk)
function chunkText(text, chunkSize = 200) {
  const words = text.split(/\s+/);
  const chunks = [];
  for (let i = 0; i < words.length; i += chunkSize) {
    chunks.push(words.slice(i, i + chunkSize).join(" "));
  }
  return chunks;
}

export const generateEmbeddings = async (docId) => {
  const doc = await KnowledgeBase.findById(docId);
  if (!doc) throw new Error("Document not found");

  // Split into chunks
  const textChunks = chunkText(doc.content, 200);

  // Clear old chunks for this doc (if re-embedding)
  await Chunk.deleteMany({ docId: doc._id });

  const chunkDocs = [];
  for (const chunk of textChunks) {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: chunk,
    });

    const embedding = response.data[0].embedding;

    const newChunk = await Chunk.create({
      docId: doc._id,
      chunk,
      embedding,
      uploadedBy: doc.uploadedBy,
    });

    chunkDocs.push(newChunk);
  }

  return chunkDocs;
};
