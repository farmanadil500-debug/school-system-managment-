import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import studentRoutes from "../server/routes/studentRoutes.js";
import Student from "../server/models/Student.js";
import { INITIAL_STUDENTS } from "../server/data/seedData.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

let isConnected = false;

async function connectDB() {
  if (isConnected) return;
  const MONGO_URI = process.env.MONGODB_URI;
  if (!MONGO_URI) {
    console.warn("⚠️ MONGODB_URI is not set in environment variables!");
    return;
  }
  try {
    const db = await mongoose.connect(MONGO_URI);
    isConnected = db.connections[0].readyState === 1;
    console.log("✅ MongoDB connected via Vercel Serverless");

    const count = await Student.countDocuments();
    if (count === 0) {
      await Student.insertMany(INITIAL_STUDENTS);
      console.log(`✅ Seeded ${INITIAL_STUDENTS.length} initial students into MongoDB!`);
    }
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
  }
}

// Middleware to ensure DB connection before handling requests
app.use(async (req, res, next) => {
  await connectDB();
  next();
});

// Mount Routes
app.use("/api/students", studentRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    environment: "vercel-serverless",
    database: isConnected ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

export default app;

