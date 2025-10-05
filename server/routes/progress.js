const express = require('express');
const { body, validationResult, query } = require('express-validator');

const router = express.Router();

// Update lesson progress
router.post('/lessons/:lessonId', [
    body('progressPercentage').isInt({ min: 0, max: 100 })
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

        const { lessonId } = req.params;
        const { progressPercentage } = req.body;
        const userId = req.user.id;

        // Verify lesson exists and user is enrolled in the course
        const lessonResult = await global.pool.query(
            `SELECT l.*, c.id as course_id, c.status as course_status
       FROM lessons l
       JOIN courses c ON l.course_id = c.id
       JOIN enrollments e ON c.id = e.course_id
       WHERE l.id = $1 AND e.user_id = $2 AND c.status = 'published'`,
            [lessonId, userId]
        );

        if (lessonResult.rows.length === 0) {
            return res.status(404).json({
                error: {
                    code: 'LESSON_NOT_FOUND',
                    message: 'Lesson not found or access denied'
                }
            });
        }

        const lesson = lessonResult.rows[0];

        // Check if lesson is completed (100% progress)
        const isCompleted = progressPercentage === 100;

        // Upsert lesson progress
        const result = await global.pool.query(
            `INSERT INTO lesson_progress (user_id, lesson_id, progress_percentage, completed_at)
       VALUES ($1, $2, $3, ${isCompleted ? 'CURRENT_TIMESTAMP' : 'NULL'})
       ON CONFLICT (user_id, lesson_id)
       DO UPDATE SET 
         progress_percentage = EXCLUDED.progress_percentage,
         completed_at = ${isCompleted ? 'CURRENT_TIMESTAMP' : 'NULL'}
       RETURNING *`,
            [userId, lessonId, progressPercentage]
        );

        // Check if course is completed and issue certificate if needed
        if (isCompleted) {
            await checkAndIssueCertificate(userId, lesson.course_id);
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update progress error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to update progress'
            }
        });
    }
});

// Mark lesson as completed
router.post('/lessons/:lessonId/complete', async (req, res) => {
    try {
        const { lessonId } = req.params;
        const userId = req.user.id;

        // Verify lesson exists and user is enrolled in the course
        const lessonResult = await global.pool.query(
            `SELECT l.*, c.id as course_id, c.status as course_status
       FROM lessons l
       JOIN courses c ON l.course_id = c.id
       JOIN enrollments e ON c.id = e.course_id
       WHERE l.id = $1 AND e.user_id = $2 AND c.status = 'published'`,
            [lessonId, userId]
        );

        if (lessonResult.rows.length === 0) {
            return res.status(404).json({
                error: {
                    code: 'LESSON_NOT_FOUND',
                    message: 'Lesson not found or access denied'
                }
            });
        }

        const lesson = lessonResult.rows[0];

        // Upsert lesson progress as completed
        const result = await global.pool.query(
            `INSERT INTO lesson_progress (user_id, lesson_id, progress_percentage, completed_at)
       VALUES ($1, $2, 100, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, lesson_id)
       DO UPDATE SET 
         progress_percentage = 100,
         completed_at = CURRENT_TIMESTAMP
       RETURNING *`,
            [userId, lessonId]
        );

        // Check if course is completed and issue certificate if needed
        await checkAndIssueCertificate(userId, lesson.course_id);

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Complete lesson error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to complete lesson'
            }
        });
    }
});

// Get user's progress for a specific course
router.get('/courses/:courseId', async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.user.id;

        // Verify user is enrolled in the course
        const enrollmentResult = await global.pool.query(
            `SELECT * FROM enrollments e
       JOIN courses c ON e.course_id = c.id
       WHERE e.user_id = $1 AND e.course_id = $2 AND c.status = 'published'`,
            [userId, courseId]
        );

        if (enrollmentResult.rows.length === 0) {
            return res.status(404).json({
                error: {
                    code: 'COURSE_NOT_FOUND',
                    message: 'Course not found or not enrolled'
                }
            });
        }

        // Get all lessons with progress
        const result = await global.pool.query(
            `SELECT 
        l.*,
        lp.progress_percentage,
        lp.completed_at,
        CASE WHEN lp.completed_at IS NOT NULL THEN true ELSE false END as is_completed
      FROM lessons l
      LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id AND lp.user_id = $1
      WHERE l.course_id = $2
      ORDER BY l.order_index`,
            [userId, courseId]
        );

        // Calculate overall progress
        const totalLessons = result.rows.length;
        const completedLessons = result.rows.filter(lesson => lesson.is_completed).length;
        const overallProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

        // Check if course is completed
        const isCourseCompleted = completedLessons === totalLessons && totalLessons > 0;

        res.json({
            courseId,
            totalLessons,
            completedLessons,
            overallProgress,
            isCourseCompleted,
            lessons: result.rows
        });
    } catch (error) {
        console.error('Get course progress error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to fetch course progress'
            }
        });
    }
});

// Get user's overall progress across all courses
router.get('/overview', [
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 })
], async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;
        const userId = req.user.id;

        const result = await global.pool.query(
            `SELECT 
        c.id as course_id,
        c.title as course_title,
        c.thumbnail_url as course_thumbnail,
        COUNT(l.id) as total_lessons,
        COUNT(lp.id) as completed_lessons,
        CASE 
          WHEN COUNT(l.id) > 0 THEN ROUND((COUNT(lp.id)::float / COUNT(l.id)::float) * 100, 2)
          ELSE 0
        END as progress_percentage,
        CASE 
          WHEN COUNT(l.id) > 0 AND COUNT(lp.id) = COUNT(l.id) THEN true
          ELSE false
        END as is_completed,
        MAX(lp.completed_at) as last_activity,
        e.enrolled_at
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      LEFT JOIN lessons l ON c.id = l.course_id
      LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id AND lp.user_id = e.user_id
      WHERE e.user_id = $1 AND c.status = 'published'
      GROUP BY c.id, c.title, c.thumbnail_url, e.enrolled_at
      ORDER BY last_activity DESC NULLS LAST, e.enrolled_at DESC
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

        // Calculate overall statistics
        const statsResult = await global.pool.query(
            `SELECT 
        COUNT(DISTINCT e.course_id) as total_courses,
        COUNT(DISTINCT CASE WHEN course_progress.is_completed THEN e.course_id END) as completed_courses,
        COUNT(DISTINCT lp.lesson_id) as total_completed_lessons,
        SUM(course_progress.total_lessons) as total_lessons_across_courses
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      LEFT JOIN (
        SELECT 
          l.course_id,
          COUNT(l.id) as total_lessons,
          COUNT(lp.id) as completed_lessons,
          CASE 
            WHEN COUNT(l.id) > 0 AND COUNT(lp.id) = COUNT(l.id) THEN true
            ELSE false
          END as is_completed
        FROM lessons l
        LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id AND lp.user_id = $1
        GROUP BY l.course_id
      ) course_progress ON c.id = course_progress.course_id
      LEFT JOIN lesson_progress lp ON lp.user_id = $1
      WHERE e.user_id = $1 AND c.status = 'published'`,
            [userId]
        );

        const stats = statsResult.rows[0];

        res.json({
            items: result.rows,
            total,
            limit,
            offset,
            next_offset: nextOffset,
            statistics: {
                totalCourses: parseInt(stats.total_courses) || 0,
                completedCourses: parseInt(stats.completed_courses) || 0,
                totalCompletedLessons: parseInt(stats.total_completed_lessons) || 0,
                totalLessonsAcrossCourses: parseInt(stats.total_lessons_across_courses) || 0
            }
        });
    } catch (error) {
        console.error('Get progress overview error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to fetch progress overview'
            }
        });
    }
});

// Helper function to check and issue certificate
async function checkAndIssueCertificate(userId, courseId) {
    try {
        // Check if user already has a certificate for this course
        const existingCert = await global.pool.query(
            'SELECT id FROM certificates WHERE user_id = $1 AND course_id = $2',
            [userId, courseId]
        );

        if (existingCert.rows.length > 0) {
            return; // Certificate already exists
        }

        // Check if all lessons are completed
        const progressResult = await global.pool.query(
            `SELECT 
        COUNT(l.id) as total_lessons,
        COUNT(lp.id) as completed_lessons
      FROM lessons l
      LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id AND lp.user_id = $1 AND lp.progress_percentage = 100
      WHERE l.course_id = $2`,
            [userId, courseId]
        );

        const { total_lessons, completed_lessons } = progressResult.rows[0];

        if (parseInt(total_lessons) === parseInt(completed_lessons) && parseInt(total_lessons) > 0) {
            // Generate certificate with serial hash
            const crypto = require('crypto');
            const serialHash = crypto
                .createHash('sha256')
                .update(`${userId}-${courseId}-${Date.now()}`)
                .digest('hex');

            // Create certificate
            await global.pool.query(
                'INSERT INTO certificates (user_id, course_id, serial_hash) VALUES ($1, $2, $3)',
                [userId, courseId, serialHash]
            );

            console.log(`Certificate issued for user ${userId} in course ${courseId}`);
        }
    } catch (error) {
        console.error('Error checking/issuing certificate:', error);
    }
}

module.exports = router;
