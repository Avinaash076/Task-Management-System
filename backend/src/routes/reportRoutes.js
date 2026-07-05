const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { getDb, getMemoryStore } = require('../config/db');

const router = express.Router();
router.use(authenticate);
router.use(requireAdmin);

function toCsv(rows, headers) {
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(','));
  }
  return lines.join('\n');
}

function buildMemoryReports() {
  const store = getMemoryStore();
  const tasks = store.tasks.map((task) => ({
    id: task.id,
    title: task.title,
    priority: task.priority,
    status: task.status,
    dueDate: task.dueDate,
    assignedEmployee: task.assignedEmployeeName || 'Unassigned',
    assignedEmployeeId: task.assignedEmployeeId,
  }));
  const completedTasks = tasks.filter((task) => task.status === 'completed');
  const pendingTasks = tasks.filter((task) => task.status !== 'completed');
  const employeeReport = store.employees.map((employee) => {
    const employeeTasks = store.tasks.filter((task) => Number(task.assignedEmployeeId) === employee.id);
    return {
      employeeName: employee.fullName,
      totalTasks: employeeTasks.length,
      completedTasks: employeeTasks.filter((task) => task.status === 'completed').length,
    };
  });

  return {
    stats: { totalTasks: tasks.length },
    completed: { completedTasks: completedTasks.length },
    pending: { pendingTasks: pendingTasks.length },
    employeeReport,
    completedTasks,
    pendingTasks,
  };
}

async function buildDatabaseReports(pool) {
  const [stats] = await pool.query('SELECT COUNT(*) AS totalTasks FROM tasks');
  const [completed] = await pool.query('SELECT COUNT(*) AS completedTasks FROM tasks WHERE status = "completed"');
  const [pending] = await pool.query('SELECT COUNT(*) AS pendingTasks FROM tasks WHERE status != "completed"');
  const [employeeReport] = await pool.query(
    'SELECT e.full_name AS employeeName, COUNT(t.id) AS totalTasks, SUM(CASE WHEN t.status = "completed" THEN 1 ELSE 0 END) AS completedTasks FROM employees e LEFT JOIN tasks t ON t.assigned_employee_id = e.id GROUP BY e.id'
  );
  const [completedTasks] = await pool.query(
    'SELECT t.id, t.title, t.priority, t.due_date AS dueDate, e.full_name AS assignedEmployee FROM tasks t LEFT JOIN employees e ON e.id = t.assigned_employee_id WHERE t.status = "completed" ORDER BY t.due_date DESC'
  );
  const [pendingTasks] = await pool.query(
    'SELECT t.id, t.title, t.priority, t.due_date AS dueDate, e.full_name AS assignedEmployee FROM tasks t LEFT JOIN employees e ON e.id = t.assigned_employee_id WHERE t.status != "completed" ORDER BY t.due_date ASC'
  );

  return {
    stats: stats[0],
    completed: completed[0],
    pending: pending[0],
    employeeReport,
    completedTasks,
    pendingTasks,
  };
}

async function getReportData() {
  const pool = await getDb();
  if (pool) {
    return { data: await buildDatabaseReports(pool), pool };
  }
  return { data: buildMemoryReports(), pool: null };
}

function getExportPayload(type, source) {
  if (type === 'completed') {
    return {
      rows: source.completedTasks,
      filename: 'completed-tasks',
      headers: ['title', 'priority', 'dueDate', 'assignedEmployee'],
    };
  }

  if (type === 'pending') {
    return {
      rows: source.pendingTasks,
      filename: 'pending-tasks',
      headers: ['title', 'priority', 'dueDate', 'assignedEmployee'],
    };
  }

  if (type === 'employee') {
    return {
      rows: source.employeeReport,
      filename: 'employee-task-report',
      headers: ['employeeName', 'totalTasks', 'completedTasks'],
    };
  }

  return null;
}

router.get('/', async (_req, res, next) => {
  try {
    const { data } = await getReportData();
    return res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get('/export/:type', async (req, res, next) => {
  try {
    const { type } = req.params;
    const format = req.query.format === 'excel' ? 'excel' : 'csv';
    const { data } = await getReportData();
    const payload = getExportPayload(type, data);

    if (!payload) {
      return res.status(400).json({ message: 'Invalid report type' });
    }

    const csv = toCsv(payload.rows, payload.headers);
    if (format === 'excel') {
      res.setHeader('Content-Type', 'application/vnd.ms-excel');
      res.setHeader('Content-Disposition', `attachment; filename="${payload.filename}.xls"`);
    } else {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${payload.filename}.csv"`);
    }
    res.send('\uFEFF' + csv);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
