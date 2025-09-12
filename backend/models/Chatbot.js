import mongoose from "mongoose";

const chatbotSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    name: { type: String, required: true },
    phoneNumberId: { type: String, required: true }, // Meta WhatsApp number
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    persona: { type: String, default: "" }, // Persona for the chatbot
  },
  { timestamps: true }
);

export default mongoose.model("Chatbot", chatbotSchema);
