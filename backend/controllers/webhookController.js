import axios from "axios";
import Chatbot from "../models/Chatbot.js";
import Conversation from "../models/Conversation.js";
import { updateUsage } from "../utils/usageTracker.js";
import { queryChatbot } from "../services/queryService.js";

// Send message back to WhatsApp API
async function sendWhatsAppMessage(phoneNumberId, to, text) {
  const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
  try {
    const resp = await axios.post(
      url,
      {
        messaging_product: "whatsapp",
        to,
        text: { body: text },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log("✅ WhatsApp message sent:", resp.data);
  } catch (err) {
    console.error("❌ Send WhatsApp Error:", err.response?.data || err.message);
  }
}

// Main webhook
export const whatsappWebhook = async (req, res) => {
  try {
    // ✅ Verification handshake
    if (req.method === "GET") {
      const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
      const mode = req.query["hub.mode"];
      const token = req.query["hub.verify_token"];
      const challenge = req.query["hub.challenge"];

      if (mode === "subscribe" && token === verifyToken) {
        return res.status(200).send(challenge);
      } else {
        return res.sendStatus(403);
      }
    }

    // ✅ Handle messages
    console.log("📩 Incoming Webhook Body:", JSON.stringify(req.body, null, 2));
    const body = req.body;

    if (body.object) {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const messages = value?.messages;

      if (messages && messages[0]) {
        const msg = messages[0];
        const from = msg.from; // user number
        const text = msg.text?.body; // user message
        const phoneNumberId = value.metadata.phone_number_id;

        console.log("👤 From:", from, "📞 Business:", phoneNumberId, "💬 Text:", text);

        // 🔎 Find chatbot
        const chatbot = await Chatbot.findOne({ phoneNumberId });
        console.log("🤖 Matched chatbot:", chatbot);

        if (!chatbot) {
          await sendWhatsAppMessage(phoneNumberId, from, "❌ Chatbot not found.");
          return res.sendStatus(200);
        }


        // � Fetch last 10 messages for this user/chatbot for context
        let history = [];
        try {
          const previousConvos = await Conversation.find({
            chatbotId: chatbot._id,
            userNumber: from
          })
            .sort({ timestamp: -1 })
            .limit(10)
            .lean();
          history = previousConvos
            .map(c => [
              { role: "user", content: c.question },
              { role: "assistant", content: c.answer }
            ])
            .flat()
            .reverse();
        } catch (err) {
          // fallback: no history
        }

        // 🔮 Run RAG pipeline with user-specific history (now includes confidence + structured sources)
        let answer, sources, confidence;
        try {
          const result = await queryChatbot(chatbot._id, text, history);
          answer = result.answer;
          sources = result.sources || [];
          confidence = result.confidence;
        } catch (err) {
          console.error("❌ Query Error:", err.message);
          answer = "⚠️ Sorry, I couldn't process that right now.";
        }

        // 1️⃣ Send reply
        await sendWhatsAppMessage(phoneNumberId, from, answer);

        // 2️⃣ Log conversation (store confidence + source doc ids if available)
        try {
          const convo = await Conversation.create({
            chatbotId: chatbot._id,
            userNumber: from,
            question: text,
            answer,
            confidence,
            sourceDocs: sources.map(s => s.id).filter(Boolean), // optional
          });
          console.log("✅ Conversation logged:", convo._id);
        } catch (err) {
          console.error("❌ Conversation Log Error:", err.message);
        }

        // 3️⃣ Update usage
        try {
          await updateUsage(chatbot._id, chatbot.companyId, from);
          console.log("✅ Usage updated");
        } catch (err) {
          console.error("❌ Usage Update Error:", err.message);
        }
      }

      return res.sendStatus(200);
    }

    res.sendStatus(404);
  } catch (error) {
    console.error("❌ Webhook Error:", error.response?.data || error.message);
    res.sendStatus(500);
  }
};
