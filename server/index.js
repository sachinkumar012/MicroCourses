require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const { Pool } = require("pg");

// Import routes
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const courseRoutes = require("./routes/courses");
const lessonRoutes = require("./routes/lessons");
const enrollmentRoutes = require("./routes/enrollments");
const progressRoutes = require("./routes/progress");
const certificateRoutes = require("./routes/certificates");
const adminRoutes = require("./routes/admin");

const app = express();
const PORT = process.env.PORT || 5000;
const path = require("path");

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

// Make pool available globally
global.pool = pool;
// Track DB connectivity status so routes can fail fast with a helpful message
global.dbConnected = false;

(async () => {
  try {
    // quick test query
    await pool.query("SELECT 1");
    global.dbConnected = true;
    console.log("✅ Database connection OK");
  } catch (err) {
    global.dbConnected = false;
    console.error(
      "❌ Database connection test failed. API endpoints that require the database will return 503."
    );
    console.error(err && err.message ? err.message : err);
  }
})();

// If pool emits an error later, mark DB as disconnected
pool.on &&
  pool.on("error", (err) => {
    console.error(
      "Postgres pool error:",
      err && err.message ? err.message : err
    );
    global.dbConnected = false;
  });

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration
// CORS configuration: in development allow localhost origins used by the client.
const devOrigins = ["http://localhost:3000", "http://localhost:3001"];
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? ["https://yourdomain.com"]
        : devOrigins,
    credentials: true,
    // Ensure preflight responses include the headers/methods our client uses
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Idempotency-Key",
      "X-Requested-With",
    ],
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 60, // 60 requests per minute
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return req.user ? req.user.id : req.ip;
  },
  handler: (req, res) => {
    res.status(429).json({
      error: {
        code: "RATE_LIMIT",
        message: "Too many requests. Please try again later.",
      },
    });
  },
});

app.use("/api/", limiter);

// Body parsing middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Serve uploaded files (videos, images) from /uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Idempotency middleware
const idempotencyMiddleware = require("./middleware/idempotency");
app.use("/api/", idempotencyMiddleware);

// Authentication middleware (import the actual middleware function)
const { authMiddleware } = require("./middleware/auth");

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", authMiddleware, userRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/lessons", authMiddleware, lessonRoutes);
app.use("/api/enrollments", authMiddleware, enrollmentRoutes);
app.use("/api/progress", authMiddleware, progressRoutes);
app.use("/api/certificates", authMiddleware, certificateRoutes);
app.use("/api/admin", authMiddleware, adminRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// Feature flags endpoint (simple)
app.get("/api/features", (req, res) => {
  res.json({
    ENABLE_GPT5_MINI: process.env.ENABLE_GPT5_MINI === "true",
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);

  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      error: {
        code: "INVALID_JSON",
        message: "Invalid JSON in request body",
      },
    });
  }

  res.status(err.status || 500).json({
    error: {
      code: err.code || "INTERNAL_ERROR",
      message: err.message || "An unexpected error occurred",
    },
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "The requested resource was not found",
    },
  });
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  pool.end(() => {
    console.log("Database pool closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully");
  pool.end(() => {
    console.log("Database pool closed");
    process.exit(0);
  });
});

app.listen(PORT, () => {
  console.log(`🚀 MicroCourses server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
