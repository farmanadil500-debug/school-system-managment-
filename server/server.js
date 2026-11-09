import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import studentRoutes from "./routes/studentRoutes.js";
import Student from "./models/Student.js";
import { INITIAL_STUDENTS } from "./data/seedData.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from server/.env
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGODB_URI;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
if (!MONGO_URI) {
  console.warn("⚠️ Warning: MONGODB_URI is not set in server/.env yet!");
  console.warn("👉 Please add: MONGODB_URI=your_connection_string into server/.env");
} else {
  mongoose
    .connect(MONGO_URI)
    .then(async () => {
      console.log("✅ MongoDB Atlas Connected Successfully!");
      
      // Auto-seed initial 24 students if collection is empty
      const count = await Student.countDocuments();
      if (count === 0) {
        console.log("🌱 Database is empty. Seeding initial students from mock data...");
        await Student.insertMany(INITIAL_STUDENTS);
        console.log(`✅ Successfully seeded ${INITIAL_STUDENTS.length} students into MongoDB!`);
      } else {
        console.log(`ℹ️ Database already contains ${count} students.`);
      }
    })
    .catch((err) => {
      console.error("❌ MongoDB Connection Error:", err.message);
    });
}

// Routes
app.use("/api/students", studentRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  const dbStates = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  res.json({
    status: "ok",
    database: dbStates[mongoose.connection.readyState] || "unknown",
    message: "Apex School Management API is running!",
    timestamp: new Date().toISOString(),
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
