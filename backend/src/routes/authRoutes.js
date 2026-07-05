const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticate } = require('../middleware/auth');
const { getDb, getMemoryStore } = require('../config/db');

const router = express.Router();

function passwordMeetsPolicy(password) {
  return /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password) && password.length >= 8;
}

function buildToken(user, rememberMe = false) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, fullName: user.fullName, department: user.department, designation: user.designation },
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: rememberMe ? '30d' : '1h' }
  );
}

router.post('/register', async (req, res, next) => {
  try {
    const { fullName, email, password, confirmPassword, role = 'employee' } = req.body;

    if (!fullName || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    if (!passwordMeetsPolicy(password)) {
      return res.status(400).json({ message: 'Password must be at least 8 characters and include uppercase, lowercase, and a number' });
    }

    if (!['admin', 'employee'].includes(role)) {
      return res.status(400).json({ message: 'Role must be admin or employee' });
    }

    const pool = await getDb();
    if (pool) {
      const [existingRows] = await pool.query('SELECT id FROM employees WHERE email = ?', [email]);
      if (existingRows.length) {
        return res.status(409).json({ message: 'Email already registered' });
      }
      const [result] = await pool.query('INSERT INTO employees (full_name, email, password, role, department, designation) VALUES (?, ?, ?, ?, ?, ?)', [fullName, email, bcrypt.hashSync(password, 10), role, 'General', 'Employee']);
      const [rows] = await pool.query('SELECT id, full_name AS fullName, email, role, department, designation FROM employees WHERE id = ?', [result.insertId]);
      const user = rows[0];
      const token = buildToken(user);
      return res.status(201).json({ user, token });
    }

    const store = getMemoryStore();
    const existingUser = store.users.find((item) => item.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const user = {
      id: store.nextUserId++,
      fullName,
      email,
      password: bcrypt.hashSync(password, 10),
      role,
      department: 'General',
      designation: 'Employee',
    };
    store.users.push(user);
    store.employees.push({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      department: user.department,
      designation: user.designation,
    });
    store.nextEmployeeId = Math.max(store.nextEmployeeId, user.id + 1);
    const token = buildToken(user);
    res.status(201).json({ user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role, department: user.department, designation: user.designation }, token });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password, rememberMe = false } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const pool = await getDb();
    if (pool) {
      const [rows] = await pool.query('SELECT id, full_name AS fullName, email, password, role, department, designation FROM employees WHERE email = ?', [email]);
      const user = rows[0];
      if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      const token = buildToken(user, rememberMe);
      return res.json({ user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role, department: user.department, designation: user.designation }, token });
    }

    const store = getMemoryStore();
    const user = store.users.find((item) => item.email.toLowerCase() === email.toLowerCase());
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = buildToken(user, rememberMe);
    res.json({ user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role, department: user.department, designation: user.designation }, token });
  } catch (error) {
    next(error);
  }
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const pool = await getDb();
    if (pool) {
      const [rows] = await pool.query(
        'SELECT id, full_name AS fullName, email, role, department, designation FROM employees WHERE id = ?',
        [req.user.id]
      );
      if (!rows[0]) {
        return res.status(404).json({ message: 'User not found' });
      }
      return res.json(rows[0]);
    }

    const store = getMemoryStore();
    const user = store.users.find((item) => item.id === req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      department: user.department,
      designation: user.designation,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
