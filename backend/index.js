import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import bodyParser from "body-parser";

import whatsappRoutes from "./routes/whatsappRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import embedRoutes from "./routes/embedRoutes.js";
import queryRoutes from "./routes/queryRoutes.js";
import companyRoutes from "./routes/companyRoutes.js";
import chatbotRoutes from "./routes/chatbotRoutes.js";
import conversationRoutes from "./routes/conversationRoutes.js";
import usageRoutes from "./routes/usageRoutes.js";

dotenv.config();
const app = express();

app.use(bodyParser.json());
app.use("/webhook", whatsappRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/embed", embedRoutes);
app.use("/api/query", queryRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/chatbots", chatbotRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/usage", usageRoutes);

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB connected"))
.catch((err) => console.error("❌ MongoDB connection error:", err));

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
