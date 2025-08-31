import axios from "axios";
import { queryKnowledgeBase } from "../services/queryService.js";

export const verifyWebhook = (req, res) => {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token) {
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("✅ Webhook verified!");
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
};

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

        console.log(`📩 Message from ${from}: ${userMessage}`);

        // 🔥 Run RAG pipeline
        let reply;
        try {
          const response = await queryKnowledgeBase(userMessage);
          reply = response.answer;
        } catch (err) {
          console.error("❌ RAG error:", err.message);
          reply = "Sorry, I couldn’t find an answer right now.";
        }

        // Send back answer
        await sendMessage(from, reply);
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("❌ Error in receiveMessage:", error.message);
    res.sendStatus(500);
  }
};

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
