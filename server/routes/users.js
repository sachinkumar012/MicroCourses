const express = require('express');
const { body, validationResult } = require('express-validator');
const { requireApprovedCreator } = require('../middleware/auth');

const router = express.Router();

// Apply creator application routes
router.post('/creator/apply', requireApprovedCreator, [
    body('bio').trim().isLength({ min: 50, max: 1000 }),
    body('expertise').trim().isLength({ min: 10, max: 500 }),
    body('portfolioUrl').optional().isURL()
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

        const { bio, expertise, portfolioUrl } = req.body;
        const userId = req.user.id;

        // Check if user already has an application
        const existingApplication = await global.pool.query(
            'SELECT id FROM creator_applications WHERE user_id = $1',
            [userId]
        );

        if (existingApplication.rows.length > 0) {
            return res.status(409).json({
                error: {
                    code: 'APPLICATION_EXISTS',
                    message: 'Creator application already exists'
                }
            });
        }

        // Create creator application
        const result = await global.pool.query(
            `INSERT INTO creator_applications (user_id, bio, expertise, portfolio_url, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING *`,
            [userId, bio, expertise, portfolioUrl]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Creator application error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to submit creator application'
            }
        });
    }
});

// Get creator application status
router.get('/creator/application', requireApprovedCreator, async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await global.pool.query(
            `SELECT 
        ca.*,
        reviewer.first_name as reviewer_first_name,
        reviewer.last_name as reviewer_last_name
      FROM creator_applications ca
      LEFT JOIN users reviewer ON ca.reviewed_by = reviewer.id
      WHERE ca.user_id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: {
                    code: 'APPLICATION_NOT_FOUND',
                    message: 'No creator application found'
                }
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get creator application error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to fetch creator application'
            }
        });
    }
});

// Update creator application (if pending)
router.put('/creator/application', requireApprovedCreator, [
    body('bio').optional().trim().isLength({ min: 50, max: 1000 }),
    body('expertise').optional().trim().isLength({ min: 10, max: 500 }),
    body('portfolioUrl').optional().isURL()
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

        const { bio, expertise, portfolioUrl } = req.body;
        const userId = req.user.id;

        // Check if application exists and is pending
        const applicationResult = await global.pool.query(
            'SELECT * FROM creator_applications WHERE user_id = $1 AND status = $2',
            [userId, 'pending']
        );

        if (applicationResult.rows.length === 0) {
            return res.status(404).json({
                error: {
                    code: 'APPLICATION_NOT_FOUND',
                    message: 'No pending application found to update'
                }
            });
        }

        // Build update query dynamically
        const updates = [];
        const values = [];
        let paramCount = 0;

        if (bio !== undefined) {
            updates.push(`bio = $${++paramCount}`);
            values.push(bio);
        }
        if (expertise !== undefined) {
            updates.push(`expertise = $${++paramCount}`);
            values.push(expertise);
        }
        if (portfolioUrl !== undefined) {
            updates.push(`portfolio_url = $${++paramCount}`);
            values.push(portfolioUrl);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                error: {
                    code: 'NO_UPDATES',
                    message: 'No valid updates provided'
                }
            });
        }

        values.push(userId);
        const result = await global.pool.query(
            `UPDATE creator_applications SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $${++paramCount}
       RETURNING *`,
            values
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update creator application error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to update creator application'
            }
        });
    }
});

module.exports = router;
