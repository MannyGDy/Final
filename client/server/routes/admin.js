const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const { pool } = require('../config/database');

const router = express.Router();

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Missing credentials',
        message: 'Email and password are required' 
      });
    }

    // Find admin
    const admin = await pool.query(
      'SELECT * FROM admins WHERE email = $1',
      [email]
    );

    if (admin.rows.length === 0) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'Admin not found' 
      });
    }

    const adminData = admin.rows[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, adminData.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'Incorrect password' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        adminId: adminData.id, 
        email: adminData.email,
        type: 'admin'
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Admin login successful',
      admin: {
        id: adminData.id,
        email: adminData.email
      },
      token
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ 
      error: 'Login failed',
      message: 'An error occurred during login' 
    });
  }
});

// Verify admin token middleware
const verifyAdminToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Get dashboard statistics
router.get('/dashboard', verifyAdminToken, async (req, res) => {
  try {
    // Get total users
    const totalUsers = await pool.query('SELECT COUNT(*) FROM users');
    
    // Get total connections today
    const todayConnections = await pool.query(
      'SELECT COUNT(*) FROM connection_logs WHERE DATE(connection_time) = CURRENT_DATE'
    );
    
    // Get total connections this month
    const monthConnections = await pool.query(
      'SELECT COUNT(*) FROM connection_logs WHERE DATE_TRUNC(\'month\', connection_time) = DATE_TRUNC(\'month\', CURRENT_DATE)'
    );
    
    // Get recent connections
    const recentConnections = await pool.query(`
      SELECT cl.*, u.full_name, u.company_name 
      FROM connection_logs cl 
      LEFT JOIN users u ON cl.user_id = u.id 
      ORDER BY cl.connection_time DESC 
      LIMIT 10
    `);

    res.json({
      success: true,
      stats: {
        totalUsers: parseInt(totalUsers.rows[0].count),
        todayConnections: parseInt(todayConnections.rows[0].count),
        monthConnections: parseInt(monthConnections.rows[0].count)
      },
      recentConnections: recentConnections.rows
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
});

// Get all users with connection data
router.get('/users', verifyAdminToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT u.*, 
             COUNT(cl.id) as total_connections,
             MAX(cl.connection_time) as last_connection
      FROM users u 
      LEFT JOIN connection_logs cl ON u.id = cl.user_id
    `;

    const whereConditions = [];
    const queryParams = [];

    if (search) {
      whereConditions.push(`(u.email ILIKE $1 OR u.full_name ILIKE $1 OR u.company_name ILIKE $1)`);
      queryParams.push(`%${search}%`);
    }

    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    query += ` GROUP BY u.id ORDER BY u.created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);

    const users = await pool.query(query, queryParams);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM users';
    if (search) {
      countQuery += ` WHERE email ILIKE $1 OR full_name ILIKE $1 OR company_name ILIKE $1`;
    }
    const totalCount = await pool.query(countQuery, search ? [`%${search}%`] : []);

    res.json({
      success: true,
      users: users.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(totalCount.rows[0].count),
        pages: Math.ceil(totalCount.rows[0].count / limit)
      }
    });

  } catch (error) {
    console.error('Users list error:', error);
    res.status(500).json({ error: 'Failed to get users list' });
  }
});

// Export users data to CSV
router.get('/export/users', verifyAdminToken, async (req, res) => {
  try {
    const users = await pool.query(`
      SELECT u.id, u.email, u.full_name, u.phone_number, u.company_name, 
             u.created_at, u.last_login,
             COUNT(cl.id) as total_connections,
             MAX(cl.connection_time) as last_connection
      FROM users u 
      LEFT JOIN connection_logs cl ON u.id = cl.user_id
      GROUP BY u.id 
      ORDER BY u.created_at DESC
    `);

    const csvWriter = createCsvWriter({
      path: 'users_export.csv',
      header: [
        { id: 'id', title: 'ID' },
        { id: 'email', title: 'Email' },
        { id: 'full_name', title: 'Full Name' },
        { id: 'phone_number', title: 'Phone Number' },
        { id: 'company_name', title: 'Company' },
        { id: 'created_at', title: 'Registration Date' },
        { id: 'last_login', title: 'Last Login' },
        { id: 'total_connections', title: 'Total Connections' },
        { id: 'last_connection', title: 'Last Connection' }
      ]
    });

    await csvWriter.writeRecords(users.rows);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=users_export.csv');
    res.download('users_export.csv');

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// Export connection logs to CSV
router.get('/export/connections', verifyAdminToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let query = `
      SELECT cl.id, cl.email, cl.connection_time, cl.ip_address, cl.session_duration, cl.status,
             u.full_name, u.company_name
      FROM connection_logs cl
      LEFT JOIN users u ON cl.user_id = u.id
    `;

    const queryParams = [];
    if (startDate && endDate) {
      query += ` WHERE cl.connection_time BETWEEN $1 AND $2`;
      queryParams.push(startDate, endDate);
    }

    query += ` ORDER BY cl.connection_time DESC`;

    const connections = await pool.query(query, queryParams);

    const csvWriter = createCsvWriter({
      path: 'connections_export.csv',
      header: [
        { id: 'id', title: 'ID' },
        { id: 'email', title: 'Email' },
        { id: 'full_name', title: 'Full Name' },
        { id: 'company_name', title: 'Company' },
        { id: 'connection_time', title: 'Connection Time' },
        { id: 'ip_address', title: 'IP Address' },
        { id: 'session_duration', title: 'Session Duration (minutes)' },
        { id: 'status', title: 'Status' }
      ]
    });

    await csvWriter.writeRecords(connections.rows);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=connections_export.csv');
    res.download('connections_export.csv');

  } catch (error) {
    console.error('Export connections error:', error);
    res.status(500).json({ error: 'Failed to export connections data' });
  }
});

module.exports = router;
