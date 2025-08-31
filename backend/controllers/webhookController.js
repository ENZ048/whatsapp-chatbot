import axios from "axios";
import Chatbot from "../models/Chatbot.js";
import Conversation from "../models/Conversation.js";
import { updateUsage } from "../utils/usageTracker.js";
import { queryChatbot } from "./queryController.js";

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

export const whatsappWebhook = async (req, res) => {
  try {
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

    console.log("📩 Incoming Webhook Body:", JSON.stringify(req.body, null, 2));

    const body = req.body;
    if (body.object) {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const messages = value?.messages;

      if (messages && messages[0]) {
        const msg = messages[0];
        const from = msg.from;
        const text = msg.text?.body;
        const phoneNumberId = value.metadata.phone_number_id;

        console.log("👤 From:", from, "📞 Business:", phoneNumberId, "💬 Text:", text);

        const chatbot = await Chatbot.findOne({ phoneNumberId });
        console.log("🤖 Matched chatbot:", chatbot);

        if (!chatbot) {
          await sendWhatsAppMessage(phoneNumberId, from, "❌ Chatbot not found.");
          return res.sendStatus(200);
        }

        const ragReq = { body: { chatbotId: chatbot._id, query: text } };
        const ragRes = {
          json: async (data) => {
            console.log("📤 RAG Answer:", data.answer);

            await sendWhatsAppMessage(phoneNumberId, from, data.answer);

            // Conversation log with error handling
            try {
              const convo = await Conversation.create({
                chatbotId: chatbot._id,
                userNumber: from,
                question: text,
                answer: data.answer,
              });
              console.log("✅ Conversation logged:", convo._id);
            } catch (err) {
              console.error("❌ Conversation Log Error:", err.message);
            }

            // Usage update with error handling
            try {
              await updateUsage(chatbot._id, chatbot.companyId, from);
              console.log("✅ Usage updated");
            } catch (err) {
              console.error("❌ Usage Update Error:", err.message);
            }
          },
        };

        await queryChatbot(ragReq, ragRes);
      }

      return res.sendStatus(200);
    }

    res.sendStatus(404);
  } catch (error) {
    console.error("❌ Webhook Error:", error.response?.data || error.message);
    res.sendStatus(500);
  }
};
