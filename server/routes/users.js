const express = require('express');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const router = express.Router();

// Verify user token middleware
const verifyUserToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'user') {
      return res.status(403).json({ error: 'User access required' });
    }
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Get user's connection history
router.get('/connections', verifyUserToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const connections = await pool.query(
      `SELECT * FROM connection_logs 
       WHERE user_id = $1 
       ORDER BY connection_time DESC 
       LIMIT $2 OFFSET $3`,
      [req.user.userId, limit, offset]
    );

    // Get total count
    const totalCount = await pool.query(
      'SELECT COUNT(*) FROM connection_logs WHERE user_id = $1',
      [req.user.userId]
    );

    res.json({
      success: true,
      connections: connections.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(totalCount.rows[0].count),
        pages: Math.ceil(totalCount.rows[0].count / limit)
      }
    });

  } catch (error) {
    console.error('Connections error:', error);
    res.status(500).json({ error: 'Failed to get connection history' });
  }
});

// Update user profile
router.put('/profile', verifyUserToken, async (req, res) => {
  try {
    const { fullName, phoneNumber, companyName } = req.body;

    // Validation
    if (!fullName || !phoneNumber) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: 'Full name and phone number are required' 
      });
    }

    // Check if phone number is already taken by another user
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE phone_number = $1 AND id != $2',
      [phoneNumber, req.user.userId]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Phone number already exists',
        message: 'This phone number is already registered by another user' 
      });
    }

    // Update user profile
    const updatedUser = await pool.query(
      `UPDATE users 
       SET full_name = $1, phone_number = $2, company_name = $3 
       WHERE id = $4 
       RETURNING id, email, full_name, phone_number, company_name, created_at, last_login`,
      [fullName, phoneNumber, companyName, req.user.userId]
    );

    if (updatedUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser.rows[0]
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change password
router.put('/password', verifyUserToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        error: 'Missing passwords',
        message: 'Current password and new password are required' 
      });
    }

    // Get current user
    const user = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const bcrypt = require('bcryptjs');
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.rows[0].password_hash);
    
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ 
        error: 'Invalid current password',
        message: 'The current password is incorrect' 
      });
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [newPasswordHash, req.user.userId]
    );

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Log user connection (called when user connects to network)
router.post('/connect', verifyUserToken, async (req, res) => {
  try {
    const { ipAddress } = req.body;

    // Log the connection
    await pool.query(
      `INSERT INTO connection_logs (user_id, email, ip_address, status) 
       VALUES ($1, $2, $3, 'connected')`,
      [req.user.userId, req.user.email, ipAddress || req.ip]
    );

    res.json({
      success: true,
      message: 'Connection logged successfully'
    });

  } catch (error) {
    console.error('Connection logging error:', error);
    res.status(500).json({ error: 'Failed to log connection' });
  }
});

// Log user disconnection
router.post('/disconnect', verifyUserToken, async (req, res) => {
  try {
    const { sessionDuration } = req.body;

    // Update the latest connection log with session duration
    await pool.query(
      `UPDATE connection_logs 
       SET session_duration = $1, status = 'disconnected' 
       WHERE user_id = $2 AND status = 'connected' 
       ORDER BY connection_time DESC 
       LIMIT 1`,
      [sessionDuration, req.user.userId]
    );

    res.json({
      success: true,
      message: 'Disconnection logged successfully'
    });

  } catch (error) {
    console.error('Disconnection logging error:', error);
    res.status(500).json({ error: 'Failed to log disconnection' });
  }
});

module.exports = router;
