const express = require('express');
const bcrypt = require('bcryptjs');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { getDb, getMemoryStore } = require('../config/db');
const { sendEmployeeCredentialsEmail } = require('../utils/email');
const { getEmployeeById } = require('../utils/recipients');

const router = express.Router();

router.use(authenticate);

const TEMP_PASSWORD = 'Password123';

function getLoginUrl() {
  return process.env.APP_LOGIN_URL || 'http://localhost:5173/login';
}

function passwordMeetsPolicy(password) {
  return /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password) && password.length >= 8;
}

function resolvePassword(password, confirmPassword) {
  if (!password && !confirmPassword) {
    return { password: TEMP_PASSWORD, temporary: true };
  }

  if (!password || !confirmPassword) {
    return { error: 'Password and confirm password are required together' };
  }

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match' };
  }

  if (!passwordMeetsPolicy(password)) {
    return { error: 'Password must be at least 8 characters and include uppercase, lowercase, and a number' };
  }

  return { password, temporary: false };
}

function syncUserFromEmployee(store, employee) {
  const existingUser = store.users.find((item) => item.id === employee.id);
  if (existingUser) {
    Object.assign(existingUser, employee);
    return existingUser;
  }
  const user = {
    id: employee.id,
    fullName: employee.fullName,
    email: employee.email,
    password: bcrypt.hashSync(TEMP_PASSWORD, 10),
    role: employee.role,
    department: employee.department,
    designation: employee.designation,
  };
  store.users.push(user);
  return user;
}

router.get('/', requireAdmin, async (_req, res, next) => {
  try {
    const pool = await getDb();
    if (pool) {
      const [rows] = await pool.query('SELECT id, full_name AS fullName, email, role, department, designation FROM employees ORDER BY id DESC');
      return res.json(rows);
    }

    const store = getMemoryStore();
    return res.json(store.employees);
  } catch (error) {
    next(error);
  }
});

router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const {
      fullName,
      email,
      department,
      designation,
      role = 'employee',
      password,
      confirmPassword,
    } = req.body;
    if (!fullName || !email || !department || !designation) {
      return res.status(400).json({ message: 'Name, email, department and designation are required' });
    }

    const resolvedPassword = resolvePassword(password, confirmPassword);
    if (resolvedPassword.error) {
      return res.status(400).json({ message: resolvedPassword.error });
    }
    const passwordHash = bcrypt.hashSync(resolvedPassword.password, 10);

    const pool = await getDb();
    if (pool) {
      const [exists] = await pool.query('SELECT id FROM employees WHERE email = ?', [email]);
      if (exists.length) {
        return res.status(409).json({ message: 'Email already registered' });
      }
      const [result] = await pool.query('INSERT INTO employees (full_name, email, password, role, department, designation) VALUES (?, ?, ?, ?, ?, ?)', [fullName, email, passwordHash, role, department, designation]);
      const [rows] = await pool.query('SELECT id, full_name AS fullName, email, role, department, designation FROM employees WHERE id = ?', [result.insertId]);
      const mailSent = await sendEmployeeCredentialsEmail({
        fullName,
        email,
        password: resolvedPassword.password,
        role,
        loginUrl: getLoginUrl(),
      });
      return res.status(201).json({
        ...rows[0],
        temporaryPassword: resolvedPassword.temporary ? TEMP_PASSWORD : undefined,
        passwordSent: mailSent,
        mailSent,
      });
    }

    const store = getMemoryStore();
    const employee = { id: store.nextEmployeeId++, fullName, email, role, department, designation };
    store.employees.push(employee);
    const user = syncUserFromEmployee(store, {
      ...employee,
      password: passwordHash,
    });
    user.password = passwordHash;
    store.nextUserId = Math.max(store.nextUserId, employee.id + 1);
    const mailSent = await sendEmployeeCredentialsEmail({
      fullName,
      email,
      password: resolvedPassword.password,
      role,
      loginUrl: getLoginUrl(),
    });
    return res.status(201).json({
      ...employee,
      temporaryPassword: resolvedPassword.temporary ? TEMP_PASSWORD : undefined,
      passwordSent: mailSent,
      mailSent,
    });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      fullName,
      email,
      department,
      designation,
      role,
      password,
      confirmPassword,
    } = req.body;
    const resolvedPassword = resolvePassword(password, confirmPassword);
    if (resolvedPassword.error && (password || confirmPassword)) {
      return res.status(400).json({ message: resolvedPassword.error });
    }

    const pool = await getDb();
    if (pool) {
      const params = [fullName, email, department, designation, role];
      let sql = 'UPDATE employees SET full_name = ?, email = ?, department = ?, designation = ?, role = ?';
      if (password) {
        sql += ', password = ?';
        params.push(bcrypt.hashSync(resolvedPassword.password, 10));
      }
      sql += ' WHERE id = ?';
      params.push(id);
      await pool.query(sql, params);
      const [rows] = await pool.query('SELECT id, full_name AS fullName, email, role, department, designation FROM employees WHERE id = ?', [id]);
      return res.json(rows[0]);
    }

    const store = getMemoryStore();
    const employee = store.employees.find((item) => item.id === Number(id));
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    Object.assign(employee, { fullName, email, department, designation, role });
    const user = store.users.find((item) => item.id === Number(id));
    if (user) {
      Object.assign(user, { fullName, email, department, designation, role });
      if (password && resolvedPassword.password) {
        user.password = bcrypt.hashSync(resolvedPassword.password, 10);
      }
    }
    store.tasks.forEach((task) => {
      if (task.assignedEmployeeId === Number(id)) {
        task.assignedEmployeeName = fullName;
      }
    });
    return res.json(employee);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const pool = await getDb();
    if (pool) {
      await pool.query('DELETE FROM employees WHERE id = ?', [id]);
      return res.json({ message: 'Employee deleted' });
    }

    const store = getMemoryStore();
    store.employees = store.employees.filter((item) => item.id !== Number(id));
    store.users = store.users.filter((item) => item.id !== Number(id));
    store.tasks.forEach((task) => {
      if (task.assignedEmployeeId === Number(id)) {
        task.assignedEmployeeName = null;
      }
    });
    return res.json({ message: 'Employee deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
