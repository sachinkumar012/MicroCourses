const express = require("express");
const { body, validationResult, query } = require("express-validator");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

// Apply admin middleware to all routes
router.use(requireAdmin);

// Get all creator applications
router.get(
  "/creator-applications",
  [
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("offset").optional().isInt({ min: 0 }),
    query("status").optional().isIn(["pending", "approved", "rejected"]),
  ],
  async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 20;
      const offset = parseInt(req.query.offset) || 0;
      const status = req.query.status;

      let whereClause = "";
      let params = [limit, offset];
      let paramCount = 2;

      if (status) {
        whereClause = `WHERE ca.status = $${++paramCount}`;
        params.push(status);
      }

      const result = await global.pool.query(
        `SELECT 
        ca.*,
        u.email,
        u.first_name,
        u.last_name,
        u.created_at as user_created_at,
        reviewer.first_name as reviewer_first_name,
        reviewer.last_name as reviewer_last_name
      FROM creator_applications ca
      JOIN users u ON ca.user_id = u.id
      LEFT JOIN users reviewer ON ca.reviewed_by = reviewer.id
      ${whereClause}
      ORDER BY ca.created_at DESC
      LIMIT $1 OFFSET $2`,
        params
      );

      // Get total count
      const countResult = await global.pool.query(
        `SELECT COUNT(*) as total FROM creator_applications ca ${whereClause}`,
        params.slice(2)
      );

      const total = parseInt(countResult.rows[0].total);
      const nextOffset = offset + limit < total ? offset + limit : null;

      res.json({
        items: result.rows,
        total,
        limit,
        offset,
        next_offset: nextOffset,
      });
    } catch (error) {
      console.error("Get creator applications error:", error);
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch creator applications",
        },
      });
    }
  }
);

// Review creator application
router.post(
  "/creator-applications/:applicationId/review",
  [
    body("status").isIn(["approved", "rejected"]),
    body("adminNotes").optional().trim(),
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

      const { applicationId } = req.params;
      const { status, adminNotes } = req.body;
      const adminId = req.user.id;

      // Check if application exists and is pending
      const applicationResult = await global.pool.query(
        "SELECT * FROM creator_applications WHERE id = $1 AND status = $2",
        [applicationId, "pending"]
      );

      if (applicationResult.rows.length === 0) {
        return res.status(404).json({
          error: {
            code: "APPLICATION_NOT_FOUND",
            message: "Application not found or already reviewed",
          },
        });
      }

      const application = applicationResult.rows[0];

      // Update application status
      const result = await global.pool.query(
        `UPDATE creator_applications 
       SET status = $1, admin_notes = $2, reviewed_by = $3, reviewed_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
        [status, adminNotes, adminId, applicationId]
      );

      // Update user's creator status
      await global.pool.query(
        "UPDATE users SET creator_status = $1 WHERE id = $2",
        [status, application.user_id]
      );

      res.json(result.rows[0]);
    } catch (error) {
      console.error("Review creator application error:", error);
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to review application",
        },
      });
    }
  }
);

// Get all courses pending review
router.get(
  "/courses/review",
  [
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("offset").optional().isInt({ min: 0 }),
    query("status")
      .optional()
      .isIn(["pending_review", "published", "rejected"]),
  ],
  async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 20;
      const offset = parseInt(req.query.offset) || 0;
      const status = req.query.status;

      let whereClause = "";
      let params = [limit, offset];
      let paramCount = 2;

      if (status) {
        whereClause = `WHERE c.status = $${++paramCount}`;
        params.push(status);
      } else {
        whereClause =
          "WHERE c.status IN ('pending_review', 'published', 'rejected')";
      }

      const result = await global.pool.query(
        `SELECT 
        c.*,
        u.first_name as creator_first_name,
        u.last_name as creator_last_name,
        u.email as creator_email,
        COUNT(l.id) as lesson_count,
        reviewer.first_name as reviewer_first_name,
        reviewer.last_name as reviewer_last_name
      FROM courses c
      JOIN users u ON c.creator_id = u.id
      LEFT JOIN lessons l ON c.id = l.course_id
      LEFT JOIN users reviewer ON c.reviewed_by = reviewer.id
      ${whereClause}
      GROUP BY c.id, u.first_name, u.last_name, u.email, reviewer.first_name, reviewer.last_name
      ORDER BY c.created_at DESC
      LIMIT $1 OFFSET $2`,
        params
      );

      // Get total count
      const countResult = await global.pool.query(
        `SELECT COUNT(*) as total FROM courses c ${whereClause}`,
        params.slice(2)
      );

      const total = parseInt(countResult.rows[0].total);
      const nextOffset = offset + limit < total ? offset + limit : null;

      res.json({
        items: result.rows,
        total,
        limit,
        offset,
        next_offset: nextOffset,
      });
    } catch (error) {
      console.error("Get courses for review error:", error);
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch courses",
        },
      });
    }
  }
);

// Review course
router.post(
  "/courses/:courseId/review",
  [
    body("status").isIn(["published", "rejected"]),
    body("adminNotes").optional().trim(),
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

      const { courseId } = req.params;
      const { status, adminNotes } = req.body;
      const adminId = req.user.id;

      // Check if course exists and is pending review
      const courseResult = await global.pool.query(
        "SELECT * FROM courses WHERE id = $1 AND status = $2",
        [courseId, "pending_review"]
      );

      if (courseResult.rows.length === 0) {
        return res.status(404).json({
          error: {
            code: "COURSE_NOT_FOUND",
            message: "Course not found or not pending review",
          },
        });
      }

      // Update course status
      const updateData = {
        status,
        admin_notes: adminNotes,
        reviewed_by: adminId,
        reviewed_at: new Date(),
      };

      if (status === "published") {
        updateData.published_at = new Date();
      }

      const result = await global.pool.query(
        `UPDATE courses 
       SET status = $1, admin_notes = $2, reviewed_by = $3, reviewed_at = $4, published_at = $5
       WHERE id = $6
       RETURNING *`,
        [
          status,
          adminNotes,
          adminId,
          updateData.reviewed_at,
          updateData.published_at,
          courseId,
        ]
      );

      res.json(result.rows[0]);
    } catch (error) {
      console.error("Review course error:", error);
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to review course",
        },
      });
    }
  }
);

// Get admin dashboard statistics
router.get("/dashboard", async (req, res) => {
  try {
    const stats = await Promise.all([
      // Total users by role
      global.pool.query(`
        SELECT role, COUNT(*) as count 
        FROM users 
        GROUP BY role
      `),

      // Creator applications by status
      global.pool.query(`
        SELECT status, COUNT(*) as count 
        FROM creator_applications 
        GROUP BY status
      `),

      // Courses by status
      global.pool.query(`
        SELECT status, COUNT(*) as count 
        FROM courses 
        GROUP BY status
      `),

      // Recent enrollments (last 30 days)
      global.pool.query(`
        SELECT COUNT(*) as count 
        FROM enrollments 
        WHERE enrolled_at >= CURRENT_DATE - INTERVAL '30 days'
      `),

      // Recent certificates issued (last 30 days)
      global.pool.query(`
        SELECT COUNT(*) as count 
        FROM certificates 
        WHERE issued_at >= CURRENT_DATE - INTERVAL '30 days'
      `),

      // Top courses by enrollment
      global.pool.query(`
        SELECT 
          c.title,
          c.id,
          COUNT(e.id) as enrollment_count
        FROM courses c
        LEFT JOIN enrollments e ON c.id = e.course_id
        WHERE c.status = 'published'
        GROUP BY c.id, c.title
        ORDER BY enrollment_count DESC
        LIMIT 5
      `),
    ]);

    const [
      usersByRole,
      applicationsByStatus,
      coursesByStatus,
      recentEnrollments,
      recentCertificates,
      topCourses,
    ] = stats;

    res.json({
      usersByRole: usersByRole.rows,
      applicationsByStatus: applicationsByStatus.rows,
      coursesByStatus: coursesByStatus.rows,
      recentEnrollments: parseInt(recentEnrollments.rows[0].count),
      recentCertificates: parseInt(recentCertificates.rows[0].count),
      topCourses: topCourses.rows,
    });
  } catch (error) {
    console.error("Get admin dashboard error:", error);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch dashboard statistics",
      },
    });
  }
});

// Get all users (admin only)
router.get(
  "/users",
  [
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("offset").optional().isInt({ min: 0 }),
    query("role").optional().isIn(["learner", "creator", "admin"]),
  ],
  async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 20;
      const offset = parseInt(req.query.offset) || 0;
      const role = req.query.role;

      let whereClause = "";
      let params = [limit, offset];
      let paramCount = 2;

      if (role) {
        whereClause = `WHERE u.role = $${++paramCount}`;
        params.push(role);
      }

      const result = await global.pool.query(
        `SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.role,
        u.creator_status,
        u.created_at,
        COUNT(DISTINCT c.id) as courses_created,
        COUNT(DISTINCT e.id) as courses_enrolled
      FROM users u
      LEFT JOIN courses c ON u.id = c.creator_id
      LEFT JOIN enrollments e ON u.id = e.user_id
      ${whereClause}
      GROUP BY u.id, u.email, u.first_name, u.last_name, u.role, u.creator_status, u.created_at
      ORDER BY u.created_at DESC
      LIMIT $1 OFFSET $2`,
        params
      );

      // Get total count
      const countResult = await global.pool.query(
        `SELECT COUNT(*) as total FROM users u ${whereClause}`,
        params.slice(2)
      );

      const total = parseInt(countResult.rows[0].total);
      const nextOffset = offset + limit < total ? offset + limit : null;

      res.json({
        items: result.rows,
        total,
        limit,
        offset,
        next_offset: nextOffset,
      });
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch users",
        },
      });
    }
  }
);

// Admin: list courses created by the admin
router.get(
  "/courses",
  [query("limit").optional().isInt({ min: 1, max: 500 }), query("offset").optional().isInt({ min: 0 })],
  async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 100;
      const offset = parseInt(req.query.offset) || 0;

      const result = await global.pool.query(
        `SELECT 
        c.*,
        COUNT(l.id) as lesson_count
      FROM courses c
      LEFT JOIN lessons l ON c.id = l.course_id
      WHERE c.creator_id = $1
      GROUP BY c.id
      ORDER BY c.created_at DESC
      LIMIT $2 OFFSET $3`,
        [req.user.id, limit, offset]
      );

      res.json({ items: result.rows, total: result.rows.length, limit, offset });
    } catch (error) {
      console.error("Admin list courses error:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to fetch courses" } });
    }
  }
);

// Admin: delete a course (admin can remove any course they created)
router.delete("/courses/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Verify course exists and belongs to this admin
    const courseResult = await global.pool.query("SELECT * FROM courses WHERE id = $1 AND creator_id = $2", [id, req.user.id]);
    if (courseResult.rows.length === 0) {
      return res.status(404).json({ error: { code: "COURSE_NOT_FOUND", message: "Course not found or access denied" } });
    }

    await global.pool.query("DELETE FROM courses WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (error) {
    console.error("Admin delete course error:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to delete course" } });
  }
});

// Admin: create course (admin acts as creator and publishes for learners)
router.post(
  "/courses",
  [
    body("title").trim().isLength({ min: 1, max: 255 }),
    body("description").trim().isLength({ min: 1 }),
    body("price").optional().isFloat({ min: 0 }),
    body("thumbnailUrl").optional().isURL(),
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

      const { title, description, price = 0, thumbnailUrl } = req.body;

      const result = await global.pool.query(
        `INSERT INTO courses (creator_id, title, description, thumbnail_url, price, status, published_at)
             VALUES ($1, $2, $3, $4, $5, 'published', CURRENT_TIMESTAMP)
             RETURNING *`,
        [req.user.id, title, description, thumbnailUrl, price]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error("Admin create course error:", error);
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to create course",
        },
      });
    }
  }
);

// Admin: upload video/pdf notes (reuses local uploads directory)
const multer = require("multer");
const path = require("path");
const uploadDir = path.join(__dirname, "..", "uploads");
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(
      null,
      `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${ext}`
    );
  },
});
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } }); // 500MB

router.post("/lessons/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ error: { code: "NO_FILE", message: "No file uploaded" } });
    }

    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${
      req.file.filename
    }`;
    res.status(201).json({ url: fileUrl, filename: req.file.filename });
  } catch (error) {
    console.error("Admin upload error:", error);
    res
      .status(500)
      .json({
        error: { code: "INTERNAL_ERROR", message: "Failed to upload file" },
      });
  }
});

// Admin: delete an uploaded file by filename
router.delete("/uploads/:filename", async (req, res) => {
  try {
    const { filename } = req.params;
    const fs = require("fs");
    const filePath = path.join(uploadDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "File not found" } });
    }

    fs.unlinkSync(filePath);
    res.json({ success: true });
  } catch (error) {
    console.error("Admin delete upload error:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to delete file" } });
  }
});

// Admin: create lesson for a course
router.post(
  "/courses/:courseId/lessons",
  [
    body("title").trim().isLength({ min: 1, max: 255 }),
    body("description").optional().trim(),
    body("videoUrl").optional().isURL(),
    body("fileUrl").optional().isURL(),
    body("duration").optional().isInt({ min: 0 }),
    body("orderIndex").isInt({ min: 1 }),
    body("transcript").optional().trim(),
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

      const { courseId } = req.params;
      const {
        title,
        description,
        videoUrl,
        fileUrl,
        duration = 0,
        orderIndex,
        transcript,
      } = req.body;

      // Verify course exists
      const courseResult = await global.pool.query(
        "SELECT * FROM courses WHERE id = $1",
        [courseId]
      );
      if (courseResult.rows.length === 0) {
        return res
          .status(404)
          .json({
            error: { code: "COURSE_NOT_FOUND", message: "Course not found" },
          });
      }

      const result = await global.pool.query(
        `INSERT INTO lessons (course_id, title, description, video_url, file_url, duration, order_index, transcript)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
        [
          courseId,
          title,
          description,
          videoUrl || fileUrl || null,
          fileUrl || null,
          duration,
          orderIndex,
          transcript,
        ]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error("Admin create lesson error:", error);
      res
        .status(500)
        .json({
          error: { code: "INTERNAL_ERROR", message: "Failed to create lesson" },
        });
    }
  }
);

module.exports = router;
