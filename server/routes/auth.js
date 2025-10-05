const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

// Register endpoint
router.post(
  "/register",
  [
    body("email").isEmail().normalizeEmail(),
    body("password").isLength({ min: 6 }),
    body("firstName").trim().isLength({ min: 1 }),
    body("lastName").trim().isLength({ min: 1 }),
    // Allow 'admin' for testing; restrict in production if needed
    body("role").isIn(["learner", "creator", "admin"]),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Validation failed",
            details: errors.array(),
          },
        });
      }

      const { email, password, firstName, lastName, role } = req.body;

      // If DB isn't available, use in-memory fallback for development
      if (!global.dbConnected) {
        const devUsers = global.__devUsers;

        if (devUsers.has(email)) {
          return res.status(409).json({
            error: {
              code: "USER_EXISTS",
              message: "User with this email already exists",
            },
          });
        }

        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Create a simple in-memory user object
        const user = {
          id: `dev-${Date.now()}`,
          email,
          password_hash: passwordHash,
          first_name: firstName,
          last_name: lastName,
          role,
          creator_status: role === "creator" ? "pending" : "approved",
        };

        devUsers.set(email, user);

        const token = jwt.sign(
          {
            userId: user.id,
            email: user.email,
            role: user.role,
            firstName: user.first_name,
            lastName: user.last_name,
          },
          process.env.JWT_SECRET,
          { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
        );

        return res.status(201).json({
          user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role,
            creatorStatus: user.creator_status,
          },
          token,
        });
      }

      // Check if user already exists in DB
      const existingUser = await global.pool.query(
        "SELECT id FROM users WHERE email = $1",
        [email]
      );
      if (existingUser.rows.length > 0) {
        return res.status(409).json({
          error: {
            code: "USER_EXISTS",
            message: "User with this email already exists",
          },
        });
      }

      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user
      const result = await global.pool.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, role, creator_status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, first_name, last_name, role, creator_status`,
        [
          email,
          passwordHash,
          firstName,
          lastName,
          role,
          role === "creator" ? "pending" : "approved",
        ]
      );

      const user = result.rows[0];

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
          firstName: user.first_name,
          lastName: user.last_name,
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
      );

      res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          creatorStatus: user.creator_status,
        },
        token,
      });
    } catch (error) {
      console.error(
        "Registration error:",
        error && error.stack ? error.stack : error
      );
      // Persist the full stack to a server-side error log to help debugging 500s
      try {
        const fs = require("fs");
        const logPath = require("path").join(__dirname, "..", "error.log");
        const message = `[${new Date().toISOString()}] Registration error:\n${
          error && error.stack ? error.stack : JSON.stringify(error)
        }\n\n`;
        fs.appendFileSync(logPath, message);
      } catch (e) {
        console.error("Failed to write error log:", e);
      }

      // Handle common Postgres duplicate key error
      if (error && error.code === "23505") {
        return res.status(409).json({
          error: {
            code: "USER_EXISTS",
            message: "User with this email already exists",
          },
        });
      }

      // Return helpful error in development
      if (process.env.NODE_ENV !== "production") {
        return res.status(500).json({
          error: {
            code: "INTERNAL_ERROR",
            message: error.message || "Registration failed",
            detail: error,
          },
        });
      }

      res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Registration failed" },
      });
    }
  }
);

// Login endpoint
router.post(
  "/login",
  [body("email").isEmail().normalizeEmail(), body("password").notEmpty()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Validation failed",
            details: errors.array(),
          },
        });
      }

      const { email, password } = req.body;

      // If DB isn't available, check in-memory dev store
      if (!global.dbConnected) {
        const devUsers = global.__devUsers;
        const user = devUsers.get(email);

        if (!user) {
          return res.status(401).json({
            error: {
              code: "INVALID_CREDENTIALS",
              message: "Invalid email or password",
            },
          });
        }

        const isValidPassword = await bcrypt.compare(
          password,
          user.password_hash
        );
        if (!isValidPassword) {
          return res.status(401).json({
            error: {
              code: "INVALID_CREDENTIALS",
              message: "Invalid email or password",
            },
          });
        }

        const token = jwt.sign(
          {
            userId: user.id,
            email: user.email,
            role: user.role,
            firstName: user.first_name,
            lastName: user.last_name,
          },
          process.env.JWT_SECRET,
          { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
        );

        return res.json({
          user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role,
            creatorStatus: user.creator_status,
          },
          token,
        });
      }

      // Find user in DB
      const result = await global.pool.query(
        "SELECT id, email, password_hash, first_name, last_name, role, creator_status FROM users WHERE email = $1",
        [email]
      );
      if (result.rows.length === 0) {
        return res.status(401).json({
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid email or password",
          },
        });
      }

      const user = result.rows[0];

      // Verify password
      const isValidPassword = await bcrypt.compare(
        password,
        user.password_hash
      );
      if (!isValidPassword) {
        return res.status(401).json({
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid email or password",
          },
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
          firstName: user.first_name,
          lastName: user.last_name,
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
      );

      res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          creatorStatus: user.creator_status,
        },
        token,
      });
    } catch (error) {
      console.error("Login error:", error && error.stack ? error.stack : error);
      try {
        const fs = require("fs");
        const logPath = require("path").join(__dirname, "..", "error.log");
        const message = `[${new Date().toISOString()}] Login error:\n${
          error && error.stack ? error.stack : JSON.stringify(error)
        }\n\n`;
        fs.appendFileSync(logPath, message);
      } catch (e) {
        console.error("Failed to write error log:", e);
      }

      if (error && error.code === "23505") {
        return res.status(409).json({
          error: {
            code: "USER_EXISTS",
            message: "User with this email already exists",
          },
        });
      }

      if (process.env.NODE_ENV !== "production") {
        return res.status(500).json({
          error: {
            code: "INTERNAL_ERROR",
            message: error.message || "Login failed",
            detail: error,
          },
        });
      }

      res
        .status(500)
        .json({ error: { code: "INTERNAL_ERROR", message: "Login failed" } });
    }
  }
);

// Get current user profile
router.get("/me", authMiddleware, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        firstName: req.user.first_name,
        lastName: req.user.last_name,
        role: req.user.role,
        creatorStatus: req.user.creator_status,
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to get profile",
      },
    });
  }
});

// Refresh token endpoint
router.post("/refresh", authMiddleware, async (req, res) => {
  try {
    // Generate new JWT token
    const token = jwt.sign(
      { userId: req.user.id, email: req.user.email, role: req.user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    res.json({ token });
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Token refresh failed",
      },
    });
  }
});

module.exports = router;
