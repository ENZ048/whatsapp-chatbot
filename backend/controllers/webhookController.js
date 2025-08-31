import axios from "axios";
import Chatbot from "../models/Chatbot.js";
import Conversation from "../models/Conversation.js";
import { updateUsage } from "../utils/usageTracker.js";
import { queryChatbot } from "./queryController.js";

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
    // Handle webhook verification
    if (req.method === "GET") {
      const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
      const mode = req.query["hub.mode"];
      const token = req.query["hub.verify_token"];
      const challenge = req.query["hub.challenge"];

      console.log("🌐 Webhook verification request:", { mode, token, challenge });

      if (mode === "subscribe" && token === verifyToken) {
        return res.status(200).send(challenge);
      } else {
        return res.sendStatus(403);
      }
    }

    // Log full body for debugging
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
        const phoneNumberId = value.metadata.phone_number_id; // business number

        console.log("👤 From:", from, "📞 Business:", phoneNumberId, "💬 Text:", text);

        // 🔎 Find chatbot by phoneNumberId
        const chatbot = await Chatbot.findOne({ phoneNumberId });
        console.log("🤖 Matched chatbot:", chatbot);

        if (!chatbot) {
          await sendWhatsAppMessage(phoneNumberId, from, "❌ Chatbot not found.");
          return res.sendStatus(200);
        }

        // 🔮 Run RAG pipeline
        const ragReq = { body: { chatbotId: chatbot._id, query: text } };
        const ragRes = {
          json: async (data) => {
            console.log("📤 RAG Answer:", data.answer);

            // 1️⃣ Send answer back to WhatsApp
            await sendWhatsAppMessage(phoneNumberId, from, data.answer);

            // 2️⃣ Log Conversation
            await Conversation.create({
              chatbotId: chatbot._id,
              userNumber: from,
              question: text,
              answer: data.answer,
            });

            // 3️⃣ Update Usage
            await updateUsage(chatbot._id, chatbot.companyId, from);
          },
        };

        await queryChatbot(ragReq, ragRes);
      }

      return res.sendStatus(200);
    }

    console.log("⚠️ No body.object in webhook event");
    res.sendStatus(404);
  } catch (error) {
    console.error("❌ Webhook Error:", error.response?.data || error.message);
    res.sendStatus(500);
  }
};
