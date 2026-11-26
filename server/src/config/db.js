import mongoose from "mongoose";
import dns from "dns";
import { env } from "./env.js";

// Fix for Windows DNS SRV resolution when connecting to MongoDB Atlas
try {
  dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
} catch {
  // Ignore in restricted environments
}

// Module-level connection cache for long-running servers & serverless
let cachedConnection = null;

export async function connectDB(customUri = null) {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  const uri = customUri || env.MONGODB_URI;

  try {
    const conn = await mongoose.connect(uri, {
      bufferCommands: false,
    });
    cachedConnection = conn;
    return conn;
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    throw error;
  }
}

export async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    cachedConnection = null;
  }
}
