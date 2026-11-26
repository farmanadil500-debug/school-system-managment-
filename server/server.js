import app from "./src/app.js";
import { env } from "./src/config/env.js";
import { connectDB } from "./src/config/db.js";
import Student from "./models/Student.js";
import { INITIAL_STUDENTS } from "./data/seedData.js";

async function startServer() {
  try {
    // Connect to MongoDB Atlas with connection caching
    await connectDB();
    console.log("✅ MongoDB Atlas Connected Successfully!");

    // Auto-seed initial students if collection is empty
    const count = await Student.countDocuments();
    if (count === 0) {
      console.log("🌱 Database is empty. Seeding initial students from mock data...");
      await Student.insertMany(INITIAL_STUDENTS);
      console.log(`✅ Successfully seeded ${INITIAL_STUDENTS.length} students into MongoDB!`);
    }

    // Start Express HTTP listener
    const server = app.listen(env.PORT, () => {
      console.log(`🚀 Server running on http://localhost:${env.PORT} in ${env.NODE_ENV} mode`);
      console.log(`📡 Health endpoint available at: http://localhost:${env.PORT}/api/v1/health`);
    });

    // Graceful shutdown
    const shutdown = () => {
      console.log("Shutting down gracefully...");
      server.close(() => {
        console.log("HTTP server closed.");
        process.exit(0);
      });
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  } catch (err) {
    console.error("❌ Failed to start server:", err.message);
    process.exit(1);
  }
}

startServer();
