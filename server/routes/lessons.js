const express = require("express");
const { body, validationResult } = require("express-validator");
const { requireApprovedCreator } = require("../middleware/auth");

const router = express.Router();
const multer = require("multer");
const path = require("path");

// Multer setup for local uploads
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
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } }); // 500MB limit

// Upload video file (creator only) - exposed at POST /api/lessons/upload
router.post(
  "/upload",
  requireApprovedCreator,
  upload.single("video"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ error: { code: "NO_FILE", message: "No file uploaded" } });
      }

      // Build public URL to the uploaded file
      const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${
        req.file.filename
      }`;

      res.status(201).json({ url: fileUrl, filename: req.file.filename });
    } catch (error) {
      console.error("Upload error:", error);
      res
        .status(500)
        .json({
          error: { code: "INTERNAL_ERROR", message: "Failed to upload file" },
        });
    }
  }
);

// Get lesson by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await global.pool.query(
      `SELECT 
        l.*,
        c.title as course_title,
        c.status as course_status,
        c.creator_id,
        u.first_name as creator_first_name,
        u.last_name as creator_last_name
      FROM lessons l
      JOIN courses c ON l.course_id = c.id
      JOIN users u ON c.creator_id = u.id
      WHERE l.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: "LESSON_NOT_FOUND",
          message: "Lesson not found",
        },
      });
    }

    const lesson = result.rows[0];

    // Check if user has access to this lesson
    // - If course is published, anyone can view
    // - If course is not published, only creator can view
    if (
      lesson.course_status !== "published" &&
      (!req.user || req.user.id !== lesson.creator_id)
    ) {
      return res.status(403).json({
        error: {
          code: "ACCESS_DENIED",
          message: "Access denied to this lesson",
        },
      });
    }

    // Get previous and next lessons
    const [prevResult, nextResult] = await Promise.all([
      global.pool.query(
        "SELECT id, title FROM lessons WHERE course_id = $1 AND order_index < $2 ORDER BY order_index DESC LIMIT 1",
        [lesson.course_id, lesson.order_index]
      ),
      global.pool.query(
        "SELECT id, title FROM lessons WHERE course_id = $1 AND order_index > $2 ORDER BY order_index ASC LIMIT 1",
        [lesson.course_id, lesson.order_index]
      ),
    ]);

    res.json({
      ...lesson,
      navigation: {
        previous: prevResult.rows[0] || null,
        next: nextResult.rows[0] || null,
      },
    });
  } catch (error) {
    console.error("Get lesson error:", error);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch lesson",
      },
    });
  }
});

// Create new lesson (creator only)
router.post(
  "/",
  requireApprovedCreator,
  [
    body("courseId").isUUID(),
    body("title").trim().isLength({ min: 1, max: 255 }),
    body("description").optional().trim(),
    body("videoUrl").optional().isURL(),
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

      const {
        courseId,
        title,
        description,
        videoUrl,
        duration,
        orderIndex,
        transcript,
      } = req.body;

      // Verify course belongs to creator
      const courseResult = await global.pool.query(
        "SELECT * FROM courses WHERE id = $1 AND creator_id = $2",
        [courseId, req.user.id]
      );

      if (courseResult.rows.length === 0) {
        return res.status(404).json({
          error: {
            code: "COURSE_NOT_FOUND",
            message: "Course not found or access denied",
          },
        });
      }

      // Check if order index is unique within course
      const existingLesson = await global.pool.query(
        "SELECT id FROM lessons WHERE course_id = $1 AND order_index = $2",
        [courseId, orderIndex]
      );

      if (existingLesson.rows.length > 0) {
        return res.status(409).json({
          error: {
            code: "ORDER_INDEX_EXISTS",
            message:
              "A lesson with this order index already exists in the course",
          },
        });
      }

      const result = await global.pool.query(
        `INSERT INTO lessons (course_id, title, description, video_url, duration, order_index, transcript)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
        [
          courseId,
          title,
          description,
          videoUrl,
          duration,
          orderIndex,
          transcript,
        ]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error("Create lesson error:", error);
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to create lesson",
        },
      });
    }
  }
);

// Update lesson (creator only)
router.put(
  "/:id",
  requireApprovedCreator,
  [
    body("title").optional().trim().isLength({ min: 1, max: 255 }),
    body("description").optional().trim(),
    body("videoUrl").optional().isURL(),
    body("duration").optional().isInt({ min: 0 }),
    body("orderIndex").optional().isInt({ min: 1 }),
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

      const { id } = req.params;
      const { title, description, videoUrl, duration, orderIndex, transcript } =
        req.body;

      // Verify lesson belongs to creator's course
      const lessonResult = await global.pool.query(
        `SELECT l.*, c.creator_id 
       FROM lessons l
       JOIN courses c ON l.course_id = c.id
       WHERE l.id = $1 AND c.creator_id = $2`,
        [id, req.user.id]
      );

      if (lessonResult.rows.length === 0) {
        return res.status(404).json({
          error: {
            code: "LESSON_NOT_FOUND",
            message: "Lesson not found or access denied",
          },
        });
      }

      const lesson = lessonResult.rows[0];

      // Check if order index is unique within course (if being changed)
      if (orderIndex !== undefined && orderIndex !== lesson.order_index) {
        const existingLesson = await global.pool.query(
          "SELECT id FROM lessons WHERE course_id = $1 AND order_index = $2 AND id != $3",
          [lesson.course_id, orderIndex, id]
        );

        if (existingLesson.rows.length > 0) {
          return res.status(409).json({
            error: {
              code: "ORDER_INDEX_EXISTS",
              message:
                "A lesson with this order index already exists in the course",
            },
          });
        }
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
      if (videoUrl !== undefined) {
        updates.push(`video_url = $${++paramCount}`);
        values.push(videoUrl);
      }
      if (duration !== undefined) {
        updates.push(`duration = $${++paramCount}`);
        values.push(duration);
      }
      if (orderIndex !== undefined) {
        updates.push(`order_index = $${++paramCount}`);
        values.push(orderIndex);
      }
      if (transcript !== undefined) {
        updates.push(`transcript = $${++paramCount}`);
        values.push(transcript);
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
        `UPDATE lessons SET ${updates.join(
          ", "
        )}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${++paramCount}
       RETURNING *`,
        values
      );

      res.json(result.rows[0]);
    } catch (error) {
      console.error("Update lesson error:", error);
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to update lesson",
        },
      });
    }
  }
);

// Delete lesson (creator only)
router.delete("/:id", requireApprovedCreator, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify lesson belongs to creator's course
    const lessonResult = await global.pool.query(
      `SELECT l.*, c.creator_id 
       FROM lessons l
       JOIN courses c ON l.course_id = c.id
       WHERE l.id = $1 AND c.creator_id = $2`,
      [id, req.user.id]
    );

    if (lessonResult.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: "LESSON_NOT_FOUND",
          message: "Lesson not found or access denied",
        },
      });
    }

    // Delete lesson
    await global.pool.query("DELETE FROM lessons WHERE id = $1", [id]);

    res.status(204).send();
  } catch (error) {
    console.error("Delete lesson error:", error);
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to delete lesson",
      },
    });
  }
});

// Reorder lessons in a course
router.post(
  "/reorder",
  requireApprovedCreator,
  [
    body("courseId").isUUID(),
    body("lessonOrders").isArray().isLength({ min: 1 }),
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

      const { courseId, lessonOrders } = req.body;

      // Verify course belongs to creator
      const courseResult = await global.pool.query(
        "SELECT * FROM courses WHERE id = $1 AND creator_id = $2",
        [courseId, req.user.id]
      );

      if (courseResult.rows.length === 0) {
        return res.status(404).json({
          error: {
            code: "COURSE_NOT_FOUND",
            message: "Course not found or access denied",
          },
        });
      }

      // Validate lesson orders format
      for (const order of lessonOrders) {
        if (
          !order.lessonId ||
          !order.orderIndex ||
          typeof order.orderIndex !== "number"
        ) {
          return res.status(400).json({
            error: {
              code: "INVALID_ORDER_FORMAT",
              message: "Each lesson order must have lessonId and orderIndex",
            },
          });
        }
      }

      // Update lesson orders in transaction
      const client = await global.pool.connect();
      try {
        await client.query("BEGIN");

        for (const order of lessonOrders) {
          await client.query(
            "UPDATE lessons SET order_index = $1 WHERE id = $2 AND course_id = $3",
            [order.orderIndex, order.lessonId, courseId]
          );
        }

        await client.query("COMMIT");
        res.json({ message: "Lesson order updated successfully" });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Reorder lessons error:", error);
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to reorder lessons",
        },
      });
    }
  }
);

// Auto-generate transcript (placeholder for future implementation)
router.post(
  "/:id/generate-transcript",
  requireApprovedCreator,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Verify lesson belongs to creator's course
      const lessonResult = await global.pool.query(
        `SELECT l.*, c.creator_id 
       FROM lessons l
       JOIN courses c ON l.course_id = c.id
       WHERE l.id = $1 AND c.creator_id = $2`,
        [id, req.user.id]
      );

      if (lessonResult.rows.length === 0) {
        return res.status(404).json({
          error: {
            code: "LESSON_NOT_FOUND",
            message: "Lesson not found or access denied",
          },
        });
      }

      // TODO: Implement actual transcript generation using AI service
      // For now, return a placeholder response
      res.json({
        message: "Transcript generation initiated",
        status: "processing",
      });
    } catch (error) {
      console.error("Generate transcript error:", error);
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to generate transcript",
        },
      });
    }
  }
);

module.exports = router;
