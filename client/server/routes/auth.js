const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const radiusClient = require('../config/radius');

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, fullName, phoneNumber, companyName, password } = req.body;

    // Validation
    if (!email || !fullName || !phoneNumber || !password) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: 'Email, full name, phone number, and password are required' 
      });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR phone_number = $2',
      [email, phoneNumber]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ 
        error: 'User already exists',
        message: 'A user with this email or phone number already exists' 
      });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert new user
    const newUser = await pool.query(
      `INSERT INTO users (email, full_name, phone_number, company_name, password_hash) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id, email, full_name, phone_number, company_name, created_at`,
      [email, fullName, phoneNumber, companyName, passwordHash]
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully! You can now login.',
      user: {
        id: newUser.rows[0].id,
        email: newUser.rows[0].email,
        fullName: newUser.rows[0].full_name,
        phoneNumber: newUser.rows[0].phone_number,
        companyName: newUser.rows[0].company_name,
        createdAt: newUser.rows[0].created_at
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      error: 'Registration failed',
      message: 'An error occurred during registration' 
    });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, phoneNumber, password } = req.body;

    // Validation
    if (!email || !phoneNumber || !password) {
      return res.status(400).json({ 
        error: 'Missing credentials',
        message: 'Email, phone number, and password are required' 
      });
    }

    // Find user by email and phone number
    const user = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND phone_number = $2 AND is_active = TRUE',
      [email, phoneNumber]
    );

    if (user.rows.length === 0) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'Email or phone number not found' 
      });
    }

    const userData = user.rows[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, userData.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'Incorrect password' 
      });
    }

    // Authenticate with RADIUS server
    const radiusResult = await radiusClient.authenticateUser(email, password);
    
    if (!radiusResult.success) {
      return res.status(401).json({ 
        error: 'RADIUS authentication failed',
        message: 'Unable to authenticate with network server' 
      });
    }

    // Update last login time
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [userData.id]
    );

    // Log connection
    await pool.query(
      `INSERT INTO connection_logs (user_id, email, ip_address) 
       VALUES ($1, $2, $3)`,
      [userData.id, userData.email, req.ip]
    );

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: userData.id, 
        email: userData.email,
        type: 'user'
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login successful! You are now connected to the network.',
      user: {
        id: userData.id,
        email: userData.email,
        fullName: userData.full_name,
        phoneNumber: userData.phone_number,
        companyName: userData.company_name
      },
      token,
      radiusStatus: 'connected'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Login failed',
      message: 'An error occurred during login' 
    });
  }
});

// Verify token middleware
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Get user profile
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await pool.query(
      'SELECT id, email, full_name, phone_number, company_name, created_at, last_login FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user: user.rows[0]
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

module.exports = router;
