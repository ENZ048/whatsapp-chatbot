import axios from "axios";
import Chatbot from "../models/Chatbot.js";
import Conversation from "../models/Conversation.js";
import { updateUsage } from "../utils/usageTracker.js";
import { queryChatbot } from "../services/queryService.js";

// ✅ Webhook verification
export const verifyWebhook = (req, res) => {
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN; // keep consistent with env
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token) {
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("✅ Webhook verified!");
      return res.status(200).send(challenge);
    } else {
      return res.sendStatus(403);
    }
  }
};

// ✅ Handle incoming messages
export const receiveMessage = async (req, res) => {
  try {
    const data = req.body;

    if (data.object) {
      const entry = data.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const message = value?.messages?.[0];

      if (message && message.type === "text") {
        const from = message.from; // user phone number
        const userMessage = message.text.body;
        const phoneNumberId = value.metadata.phone_number_id;

        console.log(`📩 Message from ${from}: ${userMessage}`);

        // 🔎 Find chatbot by phone number
        const chatbot = await Chatbot.findOne({ phoneNumberId });
        if (!chatbot) {
          await sendMessage(from, "❌ Chatbot not found.");
          return res.sendStatus(200);
        }

        // 🔥 Run RAG pipeline
        let answer, sources;
        try {
          const response = await queryChatbot(chatbot._id, userMessage);
          answer = response.answer;
          sources = response.sources || [];
        } catch (err) {
          console.error("❌ RAG error:", err.message);
          answer = "⚠️ Sorry, I couldn’t process that right now.";
        }

        // Send reply back to user
        await sendMessage(from, answer);

        // ✅ Log conversation
        try {
          const convo = await Conversation.create({
            chatbotId: chatbot._id,
            userNumber: from,
            question: userMessage,
            answer,
            sourceDocs: sources.map(s => s._id),
          });
          console.log("✅ Conversation logged:", convo._id);
        } catch (err) {
          console.error("❌ Conversation Log Error:", err.message);
        }

        // ✅ Update usage stats
        try {
          await updateUsage(chatbot._id, chatbot.companyId, from);
          console.log("✅ Usage updated");
        } catch (err) {
          console.error("❌ Usage Update Error:", err.message);
        }
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("❌ Error in receiveMessage:", error.message);
    res.sendStatus(500);
  }
};

// ✅ Helper: send WhatsApp message
const sendMessage = async (to, message) => {
  try {
    await axios.post(
      `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to,
        text: { body: message },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log("✅ Sent to user:", message);
  } catch (error) {
    console.error("❌ Error sending message:", error.response?.data || error.message);
  }
};
