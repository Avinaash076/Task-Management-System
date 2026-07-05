const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { getDb, getMemoryStore } = require('../config/db');
const { createNotification, notifyAdmins } = require('../utils/notifications');
const { getEmployeeById } = require('../utils/recipients');
const {
  sendTaskAssignedEmail,
  sendTaskCompletionEmail,
} = require('../utils/email');
const { upload } = require('../utils/upload');

const router = express.Router();

router.use(authenticate);

function normalizeTask(task) {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    priority: task.priority,
    status: task.status,
    startDate: task.start_date || task.startDate,
    dueDate: task.due_date || task.dueDate,
    assignedEmployeeId: task.assigned_employee_id || task.assignedEmployeeId,
    assignedEmployeeName: task.assigned_employee_name || task.assignedEmployeeName,
    attachmentPath: task.attachment_path || task.attachmentPath,
    completedAt: task.completed_at || task.completedAt,
    createdAt: task.created_at || task.createdAt,
  };
}

async function getTaskById(id) {
  const pool = await getDb();
  if (pool) {
    const [rows] = await pool.query(
      'SELECT t.*, e.full_name AS assigned_employee_name FROM tasks t LEFT JOIN employees e ON e.id = t.assigned_employee_id WHERE t.id = ?',
      [id]
    );
    return rows[0] ? normalizeTask(rows[0]) : null;
  }

  const store = getMemoryStore();
  const task = store.tasks.find((item) => item.id === Number(id));
  return task || null;
}

function canAccessTask(user, task) {
  return user.role === 'admin' || task.assignedEmployeeId === user.id;
}

function resolveEmployeeName(store, employeeId) {
  return store.users.find((item) => item.id === Number(employeeId))?.fullName || null;
}

async function sendAssignmentEmail(employeeId, title, priority, dueDate) {
  const employee = await getEmployeeById(employeeId);
  if (!employee?.email) return;

  await sendTaskAssignedEmail({
    to: employee.email,
    fullName: employee.fullName,
    taskTitle: title,
    priority,
    dueDate,
    loginUrl: process.env.APP_LOGIN_URL || 'http://localhost:5173/login',
  });
}

async function sendCompletionEmail(employeeId, title) {
  const employee = await getEmployeeById(employeeId);
  if (!employee?.email) return;

  await sendTaskCompletionEmail({
    to: employee.email,
    fullName: employee.fullName,
    taskTitle: title,
    loginUrl: process.env.APP_LOGIN_URL || 'http://localhost:5173/login',
  });
}

router.get('/', async (req, res, next) => {
  try {
    const pool = await getDb();
    if (pool) {
      if (req.user.role === 'admin') {
        const [rows] = await pool.query(
          'SELECT t.*, e.full_name AS assigned_employee_name FROM tasks t LEFT JOIN employees e ON e.id = t.assigned_employee_id ORDER BY t.id DESC'
        );
        return res.json(rows.map(normalizeTask));
      }
      const [rows] = await pool.query(
        'SELECT t.*, e.full_name AS assigned_employee_name FROM tasks t LEFT JOIN employees e ON e.id = t.assigned_employee_id WHERE t.assigned_employee_id = ? ORDER BY t.id DESC',
        [req.user.id]
      );
      return res.json(rows.map(normalizeTask));
    }

    const store = getMemoryStore();
    const tasks = store.tasks.filter((task) => req.user.role === 'admin' || task.assignedEmployeeId === req.user.id);
    return res.json(tasks);
  } catch (error) {
    next(error);
  }
});

router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const { title, description, priority, status, startDate, dueDate, assignedEmployeeId } = req.body;
    if (!title || !description || !priority || !status || !startDate || !dueDate || !assignedEmployeeId) {
      return res.status(400).json({ message: 'All task fields are required' });
    }

    if (new Date(dueDate) < new Date(startDate)) {
      return res.status(400).json({ message: 'Due date must be on or after the start date' });
    }

    const pool = await getDb();
    if (pool) {
      const [result] = await pool.query(
        'INSERT INTO tasks (title, description, priority, status, start_date, due_date, assigned_employee_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [title, description, priority, status, startDate, dueDate, assignedEmployeeId]
      );
      const task = await getTaskById(result.insertId);
      await createNotification(Number(assignedEmployeeId), `New task assigned: "${title}"`);
      await sendAssignmentEmail(assignedEmployeeId, title, priority, dueDate);
      return res.status(201).json(task);
    }

    const store = getMemoryStore();
    const task = {
      id: store.nextTaskId++,
      title,
      description,
      priority,
      status,
      startDate,
      dueDate,
      assignedEmployeeId: Number(assignedEmployeeId),
      assignedEmployeeName: resolveEmployeeName(store, assignedEmployeeId),
      attachmentPath: null,
      completedAt: null,
      createdAt: new Date().toISOString(),
    };
    store.tasks.push(task);
    await createNotification(Number(assignedEmployeeId), `New task assigned: "${title}"`);
    await sendAssignmentEmail(assignedEmployeeId, title, priority, dueDate);
    return res.status(201).json(task);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await getTaskById(id);
    if (!existing) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (!canAccessTask(req.user, existing)) {
      return res.status(403).json({ message: 'You can only update your own tasks' });
    }

    if (existing.status === 'completed') {
      return res.status(400).json({ message: 'Completed tasks are read-only' });
    }

    let { title, description, priority, status, startDate, dueDate, assignedEmployeeId } = req.body;

    if (req.user.role === 'employee') {
      status = req.body.status;
      if (!['pending', 'in_progress', 'completed'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }
      title = existing.title;
      description = existing.description;
      priority = existing.priority;
      startDate = existing.startDate;
      dueDate = existing.dueDate;
      assignedEmployeeId = existing.assignedEmployeeId;
    } else {
      if (!title || !description || !priority || !status || !startDate || !dueDate || !assignedEmployeeId) {
        return res.status(400).json({ message: 'All task fields are required' });
      }
      if (new Date(dueDate) < new Date(startDate)) {
        return res.status(400).json({ message: 'Due date must be on or after the start date' });
      }
    }

    const pool = await getDb();
    if (pool) {
      const completedAt = status === 'completed' ? new Date() : null;
      await pool.query(
        'UPDATE tasks SET title = ?, description = ?, priority = ?, status = ?, start_date = ?, due_date = ?, assigned_employee_id = ?, completed_at = ? WHERE id = ?',
        [title, description, priority, status, startDate, dueDate, assignedEmployeeId, completedAt, id]
      );

      if (status === 'completed' && existing.status !== 'completed') {
        await notifyAdmins(`Task "${title}" was marked complete by ${req.user.fullName}`, req.user.id);
        if (assignedEmployeeId !== req.user.id) {
          await createNotification(Number(assignedEmployeeId), `Task "${title}" was marked complete`);
        }
        await sendCompletionEmail(assignedEmployeeId, title);
      }

      if (req.user.role === 'admin' && Number(assignedEmployeeId) !== Number(existing.assignedEmployeeId)) {
        await createNotification(Number(assignedEmployeeId), `Task reassigned to you: "${title}"`);
        await sendAssignmentEmail(assignedEmployeeId, title, priority, dueDate);
      }

      return res.json(await getTaskById(id));
    }

    const store = getMemoryStore();
    const task = store.tasks.find((item) => item.id === Number(id));
    const previousAssignee = task.assignedEmployeeId;
    Object.assign(task, {
      title,
      description,
      priority,
      status,
      startDate,
      dueDate,
      assignedEmployeeId: Number(assignedEmployeeId),
      assignedEmployeeName: resolveEmployeeName(store, assignedEmployeeId),
    });
    if (req.user.role === 'admin' && Number(assignedEmployeeId) !== Number(previousAssignee)) {
      await createNotification(Number(assignedEmployeeId), `Task reassigned to you: "${title}"`);
      await sendAssignmentEmail(assignedEmployeeId, title, priority, dueDate);
    }
    if (status === 'completed') {
      task.completedAt = new Date().toISOString();
      await notifyAdmins(`Task "${title}" was marked complete by ${req.user.fullName}`, req.user.id);
      if (assignedEmployeeId !== req.user.id) {
        await createNotification(Number(assignedEmployeeId), `Task "${title}" was marked complete`);
      }
      await sendCompletionEmail(assignedEmployeeId, title);
    }
    return res.json(task);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const pool = await getDb();
    if (pool) {
      await pool.query('DELETE FROM tasks WHERE id = ?', [id]);
      return res.json({ message: 'Task deleted' });
    }

    const store = getMemoryStore();
    store.tasks = store.tasks.filter((item) => item.id !== Number(id));
    return res.json({ message: 'Task deleted' });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/upload', upload.single('attachment'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await getTaskById(id);
    if (!existing) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (!canAccessTask(req.user, existing)) {
      return res.status(403).json({ message: 'You can only upload files to your own tasks' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const attachmentPath = `/uploads/${req.file.filename}`;
    const pool = await getDb();
    if (pool) {
      await pool.query('UPDATE tasks SET attachment_path = ? WHERE id = ?', [attachmentPath, id]);
      return res.json(await getTaskById(id));
    }

    const store = getMemoryStore();
    const task = store.tasks.find((item) => item.id === Number(id));
    task.attachmentPath = attachmentPath;
    return res.json(task);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
