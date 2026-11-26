import { connectDB } from "../server/src/config/db.js";
import app from "../server/src/app.js";

// Ensure DB is connected before handling requests in Vercel Serverless
export default async function handler(req, res) {
  try {
    await connectDB();
  } catch (err) {
    console.error("Vercel DB connection error:", err.message);
  }
  return app(req, res);
}
