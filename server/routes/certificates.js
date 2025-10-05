const express = require('express');
const { query } = require('express-validator');

const router = express.Router();

// Get user's certificates
router.get('/my-certificates', [
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 })
], async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;
        const userId = req.user.id;

        const result = await global.pool.query(
            `SELECT 
        cert.*,
        c.title as course_title,
        c.description as course_description,
        u.first_name as creator_first_name,
        u.last_name as creator_last_name
      FROM certificates cert
      JOIN courses c ON cert.course_id = c.id
      JOIN users u ON c.creator_id = u.id
      WHERE cert.user_id = $1
      ORDER BY cert.issued_at DESC
      LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );

        // Get total count
        const countResult = await global.pool.query(
            'SELECT COUNT(*) as total FROM certificates WHERE user_id = $1',
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
        console.error('Get certificates error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to fetch certificates'
            }
        });
    }
});

// Get specific certificate by ID
router.get('/:certificateId', async (req, res) => {
    try {
        const { certificateId } = req.params;
        const userId = req.user.id;

        const result = await global.pool.query(
            `SELECT 
        cert.*,
        c.title as course_title,
        c.description as course_description,
        c.thumbnail_url as course_thumbnail,
        u.first_name as creator_first_name,
        u.last_name as creator_last_name,
        learner.first_name as learner_first_name,
        learner.last_name as learner_last_name,
        learner.email as learner_email
      FROM certificates cert
      JOIN courses c ON cert.course_id = c.id
      JOIN users u ON c.creator_id = u.id
      JOIN users learner ON cert.user_id = learner.id
      WHERE cert.id = $1 AND cert.user_id = $2`,
            [certificateId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: {
                    code: 'CERTIFICATE_NOT_FOUND',
                    message: 'Certificate not found'
                }
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get certificate error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to fetch certificate'
            }
        });
    }
});

// Verify certificate by serial hash (public endpoint)
router.get('/verify/:serialHash', async (req, res) => {
    try {
        const { serialHash } = req.params;

        const result = await global.pool.query(
            `SELECT 
        cert.*,
        c.title as course_title,
        c.description as course_description,
        u.first_name as creator_first_name,
        u.last_name as creator_last_name,
        learner.first_name as learner_first_name,
        learner.last_name as learner_last_name
      FROM certificates cert
      JOIN courses c ON cert.course_id = c.id
      JOIN users u ON c.creator_id = u.id
      JOIN users learner ON cert.user_id = learner.id
      WHERE cert.serial_hash = $1`,
            [serialHash]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: {
                    code: 'CERTIFICATE_NOT_FOUND',
                    message: 'Certificate not found or invalid serial hash'
                }
            });
        }

        const certificate = result.rows[0];

        res.json({
            valid: true,
            certificate: {
                id: certificate.id,
                serialHash: certificate.serial_hash,
                courseTitle: certificate.course_title,
                courseDescription: certificate.course_description,
                learnerName: `${certificate.learner_first_name} ${certificate.learner_last_name}`,
                creatorName: `${certificate.creator_first_name} ${certificate.creator_last_name}`,
                issuedAt: certificate.issued_at
            }
        });
    } catch (error) {
        console.error('Verify certificate error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to verify certificate'
            }
        });
    }
});

// Generate certificate PDF (placeholder for future implementation)
router.get('/:certificateId/download', async (req, res) => {
    try {
        const { certificateId } = req.params;
        const userId = req.user.id;

        // Verify certificate belongs to user
        const result = await global.pool.query(
            `SELECT 
        cert.*,
        c.title as course_title,
        c.description as course_description,
        u.first_name as creator_first_name,
        u.last_name as creator_last_name,
        learner.first_name as learner_first_name,
        learner.last_name as learner_last_name
      FROM certificates cert
      JOIN courses c ON cert.course_id = c.id
      JOIN users u ON c.creator_id = u.id
      JOIN users learner ON cert.user_id = learner.id
      WHERE cert.id = $1 AND cert.user_id = $2`,
            [certificateId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: {
                    code: 'CERTIFICATE_NOT_FOUND',
                    message: 'Certificate not found'
                }
            });
        }

        const certificate = result.rows[0];

        // TODO: Implement actual PDF generation
        // For now, return certificate data that could be used to generate a PDF
        res.json({
            message: 'PDF generation not yet implemented',
            certificate: {
                id: certificate.id,
                serialHash: certificate.serial_hash,
                courseTitle: certificate.course_title,
                courseDescription: certificate.course_description,
                learnerName: `${certificate.learner_first_name} ${certificate.learner_last_name}`,
                creatorName: `${certificate.creator_first_name} ${certificate.creator_last_name}`,
                issuedAt: certificate.issued_at
            }
        });
    } catch (error) {
        console.error('Download certificate error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to download certificate'
            }
        });
    }
});

// Get certificate statistics (for creators)
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
        COUNT(cert.id) as total_certificates_issued,
        COUNT(CASE WHEN cert.issued_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as certificates_last_30_days,
        COUNT(CASE WHEN cert.issued_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as certificates_last_7_days,
        COUNT(DISTINCT cert.user_id) as unique_certificate_holders
      FROM certificates cert
      WHERE cert.course_id = $1`,
            [courseId]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get certificate stats error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to fetch certificate statistics'
            }
        });
    }
});

module.exports = router;
