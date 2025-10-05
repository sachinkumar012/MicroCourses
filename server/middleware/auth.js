const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// Simple in-memory dev user store fallback (used when Postgres is not connected)
if (!global.__devUsers) {
  // Map keyed by email -> user object
  global.__devUsers = new Map();
}

// Authentication middleware
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Access token required",
        },
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // If DB is available use it, otherwise fall back to in-memory dev store
    if (!global.dbConnected) {
      const devUsers = global.__devUsers;
      const user =
        devUsers && decoded && decoded.email
          ? devUsers.get(decoded.email)
          : null;

      if (!user) {
        // If token contains basic user info we'll accept it (useful in dev)
        req.user = {
          id: decoded.userId,
          email: decoded.email,
          first_name: decoded.firstName || "",
          last_name: decoded.lastName || "",
          role: decoded.role || "learner",
          creator_status:
            decoded.creator_status ||
            (decoded.role === "creator" ? "pending" : "approved"),
        };
      } else {
        req.user = {
          id: user.id,
          email: user.email,
          first_name: user.first_name || user.firstName || "",
          last_name: user.last_name || user.lastName || "",
          role: user.role || "learner",
          creator_status: user.creator_status || "approved",
        };
      }

      return next();
    }

    // Get user from database
    const result = await global.pool.query(
      "SELECT id, email, first_name, last_name, role, creator_status FROM users WHERE id = $1",
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid token",
        },
      });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid token",
        },
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        error: {
          code: "TOKEN_EXPIRED",
          message: "Token has expired",
        },
      });
    }

    console.error("Auth middleware error:", error);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Authentication error",
      },
    });
  }
};

// Role-based authorization middleware
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        },
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Insufficient permissions",
        },
      });
    }

    next();
  };
};

// Creator status check
const requireApprovedCreator = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required",
      },
    });
  }

  if (req.user.role !== "creator") {
    return res.status(403).json({
      error: {
        code: "FORBIDDEN",
        message: "Creator access required",
      },
    });
  }

  if (req.user.creator_status !== "approved") {
    return res.status(403).json({
      error: {
        code: "CREATOR_NOT_APPROVED",
        message: "Creator account not approved yet",
      },
    });
  }

  next();
};

// Admin access check
const requireAdmin = requireRole(["admin"]);

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (!global.dbConnected) {
        const devUsers = global.__devUsers;
        const user =
          devUsers && decoded && decoded.email
            ? devUsers.get(decoded.email)
            : null;
        if (user) {
          req.user = {
            id: user.id,
            email: user.email,
            first_name: user.first_name || user.firstName || "",
            last_name: user.last_name || user.lastName || "",
            role: user.role || "learner",
            creator_status: user.creator_status || "approved",
          };
        } else {
          req.user = {
            id: decoded.userId,
            email: decoded.email,
            first_name: decoded.firstName || "",
            last_name: decoded.lastName || "",
            role: decoded.role || "learner",
            creator_status:
              decoded.creator_status ||
              (decoded.role === "creator" ? "pending" : "approved"),
          };
        }
      } else {
        const result = await global.pool.query(
          "SELECT id, email, first_name, last_name, role, creator_status FROM users WHERE id = $1",
          [decoded.userId]
        );

        if (result.rows.length > 0) {
          req.user = result.rows[0];
        }
      }
    }

    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};

module.exports = {
  authMiddleware,
  requireRole,
  requireApprovedCreator,
  requireAdmin,
  optionalAuth,
};
