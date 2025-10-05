const express = require("express");
const { body, validationResult, query } = require("express-validator");
const {
  authMiddleware,
  requireApprovedCreator,
  optionalAuth,
} = require("../middleware/auth");

const router = express.Router();

// Get all published courses (public endpoint with pagination)
router.get(
  "/",
  [
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("offset").optional().isInt({ min: 0 }),
  ],
  optionalAuth,
  async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 20;
      const offset = parseInt(req.query.offset) || 0;

      // Build query based on user role
      let whereClause = "WHERE c.status = 'published'";
      let params = [limit, offset];
      let paramCount = 2;

      // If user is authenticated, also show their own courses
      if (req.user) {
        whereClause += ` OR c.creator_id = $${++paramCount}`;
        params.push(req.user.id);
      }

      const result = await global.pool.query(
        `SELECT 
        c.id,
        c.title,
        c.description,
        c.thumbnail_url,
        c.price,
        c.published_at,
        c.created_at,
        u.first_name as creator_first_name,
        u.last_name as creator_last_name,
        COUNT(l.id) as lesson_count,
        CASE 
          WHEN e.user_id IS NOT NULL THEN true 
          ELSE false 
        END as is_enrolled
      FROM courses c
      LEFT JOIN users u ON c.creator_id = u.id
      LEFT JOIN lessons l ON c.id = l.course_id
      LEFT JOIN enrollments e ON c.id = e.course_id ${
        req.user ? `AND e.user_id = '${req.user.id}'` : "AND e.user_id IS NULL"
      }
      ${whereClause}
      GROUP BY c.id, u.first_name, u.last_name, e.user_id
      ORDER BY c.published_at DESC
      LIMIT $1 OFFSET $2`,
        params
      );

      // Get total count — build separate params so placeholders start at $1 for this query
      let countWhere = "WHERE c.status = 'published'";
      const countParams = [];
      if (req.user) {
        countWhere += " OR c.creator_id = $1";
        countParams.push(req.user.id);
      }

      const countResult = await global.pool.query(
        `SELECT COUNT(*) as total
      FROM courses c
      ${countWhere}`,
        countParams
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
      console.error("Get courses error:", error);
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch courses",
        },
      });
    }
  }
);

// Get single course by ID
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await global.pool.query(
      `SELECT 
        c.*,
        u.first_name as creator_first_name,
        u.last_name as creator_last_name,
        COUNT(l.id) as lesson_count,
        CASE 
          WHEN e.user_id IS NOT NULL THEN true 
          ELSE false 
        END as is_enrolled
      FROM courses c
      LEFT JOIN users u ON c.creator_id = u.id
      LEFT JOIN lessons l ON c.id = l.course_id
      LEFT JOIN enrollments e ON c.id = e.course_id ${
        req.user ? `AND e.user_id = '${req.user.id}'` : "AND e.user_id IS NULL"
      }
      WHERE c.id = $1 AND (c.status = 'published' ${
        req.user && req.user.id ? `OR c.creator_id = '${req.user.id}'` : ""
      })
      GROUP BY c.id, u.first_name, u.last_name, e.user_id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: "COURSE_NOT_FOUND",
          message: "Course not found",
        },
      });
    }

    // Get lessons for the course
    const lessonsResult = await global.pool.query(
      `SELECT id, title, description, duration, order_index
      FROM lessons
      WHERE course_id = $1
      ORDER BY order_index`,
      [id]
    );

    res.json({
      ...result.rows[0],
      lessons: lessonsResult.rows,
    });
  } catch (error) {
    console.error("Get course error:", error);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch course",
      },
    });
  }
});

// Create new course (creator only)
router.post(
  "/",
  authMiddleware,
  requireApprovedCreator,
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
        `INSERT INTO courses (creator_id, title, description, thumbnail_url, price, status)
       VALUES ($1, $2, $3, $4, $5, 'draft')
       RETURNING *`,
        [req.user.id, title, description, thumbnailUrl, price]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error("Create course error:", error);
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to create course",
        },
      });
    }
  }
);

// Update course (creator only, own courses)
router.put(
  "/:id",
  authMiddleware,
  requireApprovedCreator,
  [
    body("title").optional().trim().isLength({ min: 1, max: 255 }),
    body("description").optional().trim().isLength({ min: 1 }),
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

      const { id } = req.params;
      const { title, description, price, thumbnailUrl } = req.body;

      // Check if course exists and belongs to user
      const courseResult = await global.pool.query(
        "SELECT * FROM courses WHERE id = $1 AND creator_id = $2",
        [id, req.user.id]
      );

      if (courseResult.rows.length === 0) {
        return res.status(404).json({
          error: {
            code: "COURSE_NOT_FOUND",
            message: "Course not found or access denied",
          },
        });
      }

      // Build update query dynamically
      const updates = [];
      const values = [];
      let paramCount = 0;

      if (title !== undefined) {
        updates.push(`title = $${++paramCount}`);
        values.push(title);
      }
      if (description !== undefined) {
        updates.push(`description = $${++paramCount}`);
        values.push(description);
      }
      if (price !== undefined) {
        updates.push(`price = $${++paramCount}`);
        values.push(price);
      }
      if (thumbnailUrl !== undefined) {
        updates.push(`thumbnail_url = $${++paramCount}`);
        values.push(thumbnailUrl);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          error: {
            code: "NO_UPDATES",
            message: "No valid updates provided",
          },
        });
      }

      values.push(id);
      const result = await global.pool.query(
        `UPDATE courses SET ${updates.join(
          ", "
        )}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${++paramCount}
       RETURNING *`,
        values
      );

      res.json(result.rows[0]);
    } catch (error) {
      console.error("Update course error:", error);
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to update course",
        },
      });
    }
  }
);

// Submit course for review (creator only)
router.post(
  "/:id/submit",
  authMiddleware,
  requireApprovedCreator,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Check if course exists and belongs to user
      const courseResult = await global.pool.query(
        "SELECT * FROM courses WHERE id = $1 AND creator_id = $2",
        [id, req.user.id]
      );

      if (courseResult.rows.length === 0) {
        return res.status(404).json({
          error: {
            code: "COURSE_NOT_FOUND",
            message: "Course not found or access denied",
          },
        });
      }

      const course = courseResult.rows[0];

      if (course.status !== "draft") {
        return res.status(400).json({
          error: {
            code: "INVALID_STATUS",
            message: "Only draft courses can be submitted for review",
          },
        });
      }

      // Check if course has at least one lesson
      const lessonsResult = await global.pool.query(
        "SELECT COUNT(*) as count FROM lessons WHERE course_id = $1",
        [id]
      );

      if (parseInt(lessonsResult.rows[0].count) === 0) {
        return res.status(400).json({
          error: {
            code: "NO_LESSONS",
            message: "Course must have at least one lesson before submission",
          },
        });
      }

      const result = await global.pool.query(
        `UPDATE courses 
       SET status = 'pending_review', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
        [id]
      );

      res.json(result.rows[0]);
    } catch (error) {
      console.error("Submit course error:", error);
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to submit course",
        },
      });
    }
  }
);

// Delete course (creator only, own courses)
router.delete(
  "/:id",
  authMiddleware,
  requireApprovedCreator,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Check if course exists and belongs to user
      const courseResult = await global.pool.query(
        "SELECT * FROM courses WHERE id = $1 AND creator_id = $2",
        [id, req.user.id]
      );

      if (courseResult.rows.length === 0) {
        return res.status(404).json({
          error: {
            code: "COURSE_NOT_FOUND",
            message: "Course not found or access denied",
          },
        });
      }

      // Delete course (cascade will handle related records)
      await global.pool.query("DELETE FROM courses WHERE id = $1", [id]);

      res.status(204).send();
    } catch (error) {
      console.error("Delete course error:", error);
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to delete course",
        },
      });
    }
  }
);

// Get creator's courses
router.get(
  "/creator/my-courses",
  authMiddleware,
  requireApprovedCreator,
  async (req, res) => {
    try {
      const result = await global.pool.query(
        `SELECT 
        c.*,
        COUNT(l.id) as lesson_count,
        COUNT(e.id) as enrollment_count
      FROM courses c
      LEFT JOIN lessons l ON c.id = l.course_id
      LEFT JOIN enrollments e ON c.id = e.course_id
      WHERE c.creator_id = $1
      GROUP BY c.id
      ORDER BY c.created_at DESC`,
        [req.user.id]
      );

      res.json(result.rows);
    } catch (error) {
      console.error("Get creator courses error:", error);
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch courses",
        },
      });
    }
  }
);

module.exports = router;
