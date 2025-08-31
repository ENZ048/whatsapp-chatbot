const mongoose = require("mongoose");

const usageSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  chatbotId: { type: mongoose.Schema.Types.ObjectId, ref: "Chatbot", required: true },
  totalMessages: { type: Number, default: 0 },  // all messages handled
  uniqueUsers: [{ type: String }],  // WhatsApp numbers
  lastReset: { type: Date, default: Date.now }, // for monthly reset
}, { timestamps: true });

module.exports = mongoose.model("Usage", usageSchema);
