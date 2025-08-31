import OpenAI from "openai";
import mongoose from "mongoose";
import Chunk from "../models/Chunk.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const queryChatbot = async (req, res) => {
  try {
    const { chatbotId, query } = req.body;
    if (!chatbotId || !query) {
      return res.status(400).json({ error: "chatbotId and query are required" });
    }

    // 1. Embed user query
    const embeddingRes = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });
    const queryVector = embeddingRes.data[0].embedding;

    // 2. Vector Search with chatbotId filter
    const results = await Chunk.aggregate([
      {
        $vectorSearch: {
          index: "embedding_index", // 👈 name of your Atlas Vector Search index
          queryVector,
          path: "embedding",
          numCandidates: 50,
          limit: 5,
          filter: { chatbotId: new mongoose.Types.ObjectId(chatbotId) },
        },
      },
    ]);

    const context = results.map(r => r.chunk).join("\n\n");

    // 3. Generate Answer with OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant. Answer based on the provided context.",
        },
        {
          role: "user",
          content: `Context:\n${context}\n\nQuestion: ${query}`,
        },
      ],
    });

    const answer = completion.choices[0].message.content;

    res.json({ answer });
  } catch (error) {
    console.error("Query Error:", error);
    res.status(500).json({ error: "Failed to answer query" });
  }
};
