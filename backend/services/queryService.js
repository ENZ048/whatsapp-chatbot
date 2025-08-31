import OpenAI from "openai";
import Chunk from "../models/Chunk.js";
import dotenv from 'dotenv'

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const queryKnowledgeBase = async (question) => {
  // 1. Embed the question
  const queryEmbedding = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: question,
  });
  const vector = queryEmbedding.data[0].embedding;

  // 2. Search top-k chunks from MongoDB Atlas
  const results = await Chunk.aggregate([
    {
      $vectorSearch: {
        index: "embedding_index",   // must match your Atlas index name
        path: "embedding",
        queryVector: vector,
        numCandidates: 50,
        limit: 5
      }
    },
    {
      $project: {
        chunk: 1,
        docId: 1,
        uploadedBy: 1,
        score: { $meta: "vectorSearchScore" }
      }
    }
  ]);

  const contexts = results.map(r => r.chunk);

  // 3. Build prompt for OpenAI
  const prompt = `
You are a helpful assistant. Use only the context below to answer the question. 
If the context does not contain the answer, reply: "I don't know based on the knowledge base."

Context:
${contexts.join("\n\n")}

Question: ${question}
Answer:
`;

  // 4. Call OpenAI
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
  });

  return {
    answer: completion.choices[0].message.content,
    matches: results
  };
};
