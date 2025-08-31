import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    domain: { type: String },
    email: { type: String, required: true, unique: true }, // login identity
    password: { type: String, required: true }, // hashed password
  },
  { timestamps: true }
);

export default mongoose.model("Company", companySchema);
