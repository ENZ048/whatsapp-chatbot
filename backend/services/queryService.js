// Query service: enhanced RAG pipeline focusing on higher answer fidelity
import dotenv from 'dotenv';
import OpenAI from 'openai';
import mongoose from 'mongoose';
import Chatbot from "../models/Chatbot.js";
import Chunk from "../models/Chunk.js";

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- Simple in-memory LRU/TTL cache for embeddings ---
// NOTE: For multi-instance deployments, replace with Redis or external cache.
const EMBEDDING_CACHE_MAX = 200; // max distinct queries
const EMBEDDING_TTL_MS = 5 * 60 * 1000; // 5 minutes
const embeddingCache = new Map(); // key -> { vector, ts }

function getCachedEmbedding(key) {
  const entry = embeddingCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > EMBEDDING_TTL_MS) {
    embeddingCache.delete(key);
    return null;
  }
  // LRU touch: delete & re-set
  embeddingCache.delete(key);
  embeddingCache.set(key, entry);
  return entry.vector;
}

function setCachedEmbedding(key, vector) {
  embeddingCache.set(key, { vector, ts: Date.now() });
  if (embeddingCache.size > EMBEDDING_CACHE_MAX) {
    // remove oldest (first inserted)
    const firstKey = embeddingCache.keys().next().value;
    embeddingCache.delete(firstKey);
  }
}

/**
 * Query chatbot RAG pipeline (pure function, no Express res)
 * @param {string} chatbotId
 * @param {string} query
 * @param {Array<{role: string, content: string}>} [history=[]] - Optional chat history for context
 * @returns {Promise<{ answer: string, sources: any[] }>}
 */
export const queryChatbot = async (chatbotId, query, history = []) => {
  try {
    if (!chatbotId || !query) {
      throw new Error("chatbotId and query are required");
    }

    // 1️⃣ Embed user query (with cache)
    let queryVector = getCachedEmbedding(query);
    if (!queryVector) {
      const embeddingRes = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: query,
      });
      queryVector = embeddingRes.data[0].embedding;
      setCachedEmbedding(query, queryVector);
    }

    // 2️⃣ Vector Search with chatbotId filter
    // NOTE: Adjust index name if different in Atlas configuration
    let rawResults = [];
    try {
      rawResults = await Chunk.aggregate([
        {
          $vectorSearch: {
            index: "embedding_index",
            queryVector,
            path: "embedding",
            numCandidates: 60,
            limit: 8,
            filter: { chatbotId: new mongoose.Types.ObjectId(chatbotId) },
          },
        },
        // Optionally project similarity score if Atlas returns it under 'score'
        { $project: { chunk: 1, docId: 1, chatbotId: 1, embedding: 0, score: { $meta: "searchScore" } } }
      ]);
    } catch (e) {
      console.error('Vector search failed:', e.message);
    }

    // 2b️⃣ Filter low-similarity chunks (absolute + relative threshold)
    let filtered = rawResults;
    let topChunks = [];
    if (rawResults.length && typeof rawResults[0].score === 'number') {
      const topScore = rawResults[0].score;
      const MIN_ABSOLUTE = 0.15; // adjust empirically based on index score scale
      const MIN_RELATIVE = 0.55; // keep chunks >= 55% of top

      if (topScore < MIN_ABSOLUTE) {
        // Treat as NO CONTEXT; clear all
        filtered = [];
      } else {
        filtered = rawResults.filter(r => r.score >= topScore * MIN_RELATIVE);
      }
      topChunks = filtered.slice(0, 5);
    } else {
      // If scores unavailable just take first few results as-is
      topChunks = rawResults.slice(0, 5);
    }

    // --- 2c️⃣ Token budgeting (naive estimation) ---
    // Rough heuristic: tokens ≈ words * 1.3 (English, OpenAI tiktoken-like)
    const MAX_CONTEXT_TOKENS = 900; // adjust based on model + desired answer size
    let running = 0;
    const budgeted = [];
    for (const c of topChunks) {
      const wordCount = c.chunk.trim().split(/\s+/).length;
      const estTokens = Math.round(wordCount * 1.3);
      if (running + estTokens > MAX_CONTEXT_TOKENS) break;
      running += estTokens;
      budgeted.push({ ...c, estTokens });
    }

    const context = budgeted
      .map((r, i) => `[[CHUNK_${i+1} id:${r._id?.toString()} score:${r.score?.toFixed(3) ?? 'n/a'} tokens:${r.estTokens}]]\n${r.chunk.trim()}`)
      .join("\n\n");

    // 3️⃣ Fetch persona for chatbot, with fallback
    let persona = null;
    try {
      const bot = await Chatbot.findById(chatbotId).lean();
      if (bot && bot.persona && bot.persona.trim().length > 0) {
        persona = bot.persona;
      }
    } catch (err) {
      // ignore, fallback below
    }

    const fallbackPersona = `You are Supa Agent — a friendly, professional, and knowledgeable company representative.\nYour role is to:\n- Explain what the company offers, how it works, and where it can be used.\n- Make the concept easy to understand, and encourage users to explore the product or service.\nINSTRUCTIONS:\n- ONLY elaborate when the user explicitly asks for more detail (e.g., \"explain\", \"how\", \"details\", \"steps\", \"examples\").\n- Stick to role: Never say you're an AI. For details not in your knowledge base, direct users to company support channels.\n- Do NOT provide any links.`;

    // 4️⃣ Build messages array with system prompt, history, and user query
  const SYSTEM_INSTRUCTIONS = `You are answering a user using ONLY the provided context chunks when relevant.
RULES:
1. If the answer is not clearly supported by the context, respond: "I'm not fully certain based on the available information." and optionally offer a clarifying question.
2. Never fabricate product features or external links.
3. If multiple chunks conflict, prefer the one with higher score.
4. Keep answers concise unless user explicitly asks for more detail.
5. If the user asks about something outside scope, politely deflect.
6. When you use information from a chunk, append a citation like [n] where n is the chunk number (e.g., [1], [2,3]).
7. If no chunks were used (no relevant context), do NOT hallucinate—state uncertainty.`;

    const messages = [
      { role: 'system', content: persona || fallbackPersona },
      { role: 'system', content: SYSTEM_INSTRUCTIONS },
      { role: 'system', content: `Context Chunks Begin\n${context || '[NO CONTEXT RETRIEVED]'}\nContext Chunks End` },
      ...history.map(h => ({
        role: h.role === 'bot' ? 'assistant' : h.role,
        content: h.content,
      })),
      { role: 'user', content: query }
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.4
    });

    let answer = completion.choices[0].message.content;
    if (!topChunks.length) {
      // Override with insufficient context message per rule 1
      answer = `I'm not fully certain based on the available information. Could you clarify or provide more detail?`;
    }
    // Compute a naive confidence heuristic (improve later): average relative score
    let confidence = null;
    if (topChunks.length && typeof topChunks[0].score === 'number') {
      const scores = topChunks.map(c => c.score);
      const max = scores[0];
      const rel = scores.map(s => s / max);
      confidence = Number((rel.reduce((a,b)=>a+b,0)/rel.length).toFixed(3));
    }

    return {
      answer,
      confidence,
      sources: topChunks.map((c, i) => ({
        id: c._id?.toString(),
        rank: i + 1,
        citation: `[${i + 1}]`,
        score: c.score,
        preview: c.chunk.slice(0, 160)
      }))
    };
  } catch (error) {
    console.error("❌ Query Error:", error.message);
    throw error;
  }
};
