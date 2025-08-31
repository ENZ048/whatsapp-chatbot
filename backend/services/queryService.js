import OpenAI from "openai";
import mongoose from "mongoose";
import Chunk from "../models/Chunk.js";
import dotenv from 'dotenv'

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Query chatbot RAG pipeline (pure function, no Express res)
 * @param {string} chatbotId
 * @param {string} query
 * @returns {Promise<{ answer: string, sources: any[] }>}
 */
export const queryChatbot = async (chatbotId, query) => {
  try {
    if (!chatbotId || !query) {
      throw new Error("chatbotId and query are required");
    }

    // 1️⃣ Embed user query
    const embeddingRes = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });
    const queryVector = embeddingRes.data[0].embedding;

    // 2️⃣ Vector Search with chatbotId filter
    const results = await Chunk.aggregate([
      {
        $vectorSearch: {
          index: "embedding_index", // 👈 must match Atlas Vector Search index name
          queryVector,
          path: "embedding",
          numCandidates: 50,
          limit: 5,
          filter: { chatbotId: new mongoose.Types.ObjectId(chatbotId) },
        },
      },
    ]);

    const context = results.map(r => r.chunk).join("\n\n");

    // 3️⃣ Generate Answer with OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant. Answer only based on the provided context.",
        },
        {
          role: "user",
          content: `Context:\n${context}\n\nQuestion: ${query}`,
        },
      ],
    });

    const answer = completion.choices[0].message.content;

    return { answer, sources: results };
  } catch (error) {
    console.error("❌ Query Error:", error.message);
    throw error;
  }
};
