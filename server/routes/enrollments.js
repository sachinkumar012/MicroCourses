const express = require('express');
const { body, validationResult, query } = require('express-validator');

const router = express.Router();

// Enroll in a course
router.post('/', [
    body('courseId').isUUID()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Validation failed',
                    details: errors.array()
                }
            });
        }

        const { courseId } = req.body;
        const userId = req.user.id;

        // Check if course exists and is published
        const courseResult = await global.pool.query(
            'SELECT * FROM courses WHERE id = $1 AND status = $2',
            [courseId, 'published']
        );

        if (courseResult.rows.length === 0) {
            return res.status(404).json({
                error: {
                    code: 'COURSE_NOT_FOUND',
                    message: 'Course not found or not available for enrollment'
                }
            });
        }

        // Check if user is already enrolled
        const existingEnrollment = await global.pool.query(
            'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2',
            [userId, courseId]
        );

        if (existingEnrollment.rows.length > 0) {
            return res.status(409).json({
                error: {
                    code: 'ALREADY_ENROLLED',
                    message: 'User is already enrolled in this course'
                }
            });
        }

        // Create enrollment
        const result = await global.pool.query(
            'INSERT INTO enrollments (user_id, course_id) VALUES ($1, $2) RETURNING *',
            [userId, courseId]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Enrollment error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to enroll in course'
            }
        });
    }
});

// Get user's enrollments
router.get('/my-enrollments', [
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 })
], async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;
        const userId = req.user.id;

        const result = await global.pool.query(
            `SELECT 
        e.*,
        c.title as course_title,
        c.description as course_description,
        c.thumbnail_url as course_thumbnail,
        c.price as course_price,
        u.first_name as creator_first_name,
        u.last_name as creator_last_name,
        COUNT(l.id) as total_lessons,
        COUNT(lp.id) as completed_lessons,
        CASE 
          WHEN COUNT(l.id) > 0 THEN ROUND((COUNT(lp.id)::float / COUNT(l.id)::float) * 100, 2)
          ELSE 0
        END as progress_percentage
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      JOIN users u ON c.creator_id = u.id
      LEFT JOIN lessons l ON c.id = l.course_id
      LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id AND lp.user_id = e.user_id
      WHERE e.user_id = $1
      GROUP BY e.id, c.title, c.description, c.thumbnail_url, c.price, u.first_name, u.last_name
      ORDER BY e.enrolled_at DESC
      LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );

        // Get total count
        const countResult = await global.pool.query(
            'SELECT COUNT(*) as total FROM enrollments WHERE user_id = $1',
            [userId]
        );

        const total = parseInt(countResult.rows[0].total);
        const nextOffset = offset + limit < total ? offset + limit : null;

        res.json({
            items: result.rows,
            total,
            limit,
            offset,
            next_offset: nextOffset
        });
    } catch (error) {
        console.error('Get enrollments error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to fetch enrollments'
            }
        });
    }
});

// Check if user is enrolled in a specific course
router.get('/check/:courseId', async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.user.id;

        const result = await global.pool.query(
            'SELECT * FROM enrollments WHERE user_id = $1 AND course_id = $2',
            [userId, courseId]
        );

        res.json({
            isEnrolled: result.rows.length > 0,
            enrollment: result.rows[0] || null
        });
    } catch (error) {
        console.error('Check enrollment error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to check enrollment status'
            }
        });
    }
});

// Unenroll from a course
router.delete('/:courseId', async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.user.id;

        // Check if enrollment exists
        const enrollmentResult = await global.pool.query(
            'SELECT * FROM enrollments WHERE user_id = $1 AND course_id = $2',
            [userId, courseId]
        );

        if (enrollmentResult.rows.length === 0) {
            return res.status(404).json({
                error: {
                    code: 'ENROLLMENT_NOT_FOUND',
                    message: 'Enrollment not found'
                }
            });
        }

        // Delete enrollment and related progress data
        const client = await global.pool.connect();
        try {
            await client.query('BEGIN');

            // Delete lesson progress for this course
            await client.query(
                `DELETE FROM lesson_progress 
         WHERE user_id = $1 AND lesson_id IN (
           SELECT id FROM lessons WHERE course_id = $2
         )`,
                [userId, courseId]
            );

            // Delete enrollment
            await client.query(
                'DELETE FROM enrollments WHERE user_id = $1 AND course_id = $2',
                [userId, courseId]
            );

            await client.query('COMMIT');
            res.status(204).send();
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Unenroll error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to unenroll from course'
            }
        });
    }
});

// Get enrollment statistics (for creators)
router.get('/stats/:courseId', async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.user.id;

        // Verify user is the creator of the course
        const courseResult = await global.pool.query(
            'SELECT * FROM courses WHERE id = $1 AND creator_id = $2',
            [courseId, userId]
        );

        if (courseResult.rows.length === 0) {
            return res.status(404).json({
                error: {
                    code: 'COURSE_NOT_FOUND',
                    message: 'Course not found or access denied'
                }
            });
        }

        const result = await global.pool.query(
            `SELECT 
        COUNT(e.id) as total_enrollments,
        COUNT(CASE WHEN e.enrolled_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as enrollments_last_30_days,
        COUNT(CASE WHEN e.enrolled_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as enrollments_last_7_days,
        COUNT(DISTINCT lp.user_id) as users_with_progress,
        AVG(CASE 
          WHEN lesson_counts.total_lessons > 0 THEN 
            (SELECT COUNT(*) FROM lesson_progress lp2 
             WHERE lp2.user_id = e.user_id 
             AND lp2.lesson_id IN (SELECT id FROM lessons WHERE course_id = $1))::float / lesson_counts.total_lessons::float * 100
          ELSE 0
        END) as average_completion_percentage
      FROM enrollments e
      LEFT JOIN lesson_progress lp ON e.user_id = lp.user_id 
        AND lp.lesson_id IN (SELECT id FROM lessons WHERE course_id = $1)
      CROSS JOIN (
        SELECT COUNT(*) as total_lessons FROM lessons WHERE course_id = $1
      ) lesson_counts
      WHERE e.course_id = $1`,
            [courseId]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get enrollment stats error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to fetch enrollment statistics'
            }
        });
    }
});

module.exports = router;
