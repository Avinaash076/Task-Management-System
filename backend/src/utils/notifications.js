const { getDb, getMemoryStore } = require('../config/db');
const { getEmployeeById, getAdmins } = require('./recipients');
const {
  sendDueSoonEmail,
} = require('./email');

function appLoginUrl() {
  return process.env.APP_LOGIN_URL || 'http://localhost:5173/login';
}

async function createNotification(userId, message) {
  const pool = await getDb();
  if (pool) {
    await pool.query('INSERT INTO notifications (user_id, message) VALUES (?, ?)', [userId, message]);
    return;
  }

  const store = getMemoryStore();
  store.notifications.unshift({
    id: store.nextNotificationId++,
    userId,
    message,
    created_at: new Date().toISOString(),
  });
}

async function notifyAdmins(message, excludeUserId = null) {
  const admins = await getAdmins(excludeUserId);
  for (const admin of admins) {
    await createNotification(admin.id, message);
  }
}

async function checkDueSoonNotifications() {
  const pool = await getDb();
  if (pool) {
    const [tasks] = await pool.query(
      `SELECT t.id, t.title, t.due_date, t.assigned_employee_id, e.full_name, e.email
       FROM tasks t
       LEFT JOIN employees e ON e.id = t.assigned_employee_id
       WHERE t.status != 'completed'
         AND t.due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 1 DAY)
         AND t.assigned_employee_id IS NOT NULL`
    );

    for (const task of tasks) {
      const message = `Task "${task.title}" is due within 1 day (${task.due_date})`;
      const [existing] = await pool.query(
        'SELECT id FROM notifications WHERE user_id = ? AND message = ? AND DATE(created_at) = CURDATE()',
        [task.assigned_employee_id, message]
      );
      if (!existing.length) {
        await createNotification(task.assigned_employee_id, message);
        if (task.email) {
          await sendDueSoonEmail({
            to: task.email,
            fullName: task.full_name || 'there',
            taskTitle: task.title,
            dueDate: task.due_date,
            loginUrl: appLoginUrl(),
          });
        }
      }
    }
    return;
  }

  const store = getMemoryStore();
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  for (const task of store.tasks) {
    if (task.status === 'completed' || !task.assignedEmployeeId) continue;
    const due = new Date(task.dueDate);
    if (due >= today && due <= tomorrow) {
      const message = `Task "${task.title}" is due within 1 day (${task.dueDate})`;
      const alreadySent = store.notifications.some(
        (n) => n.userId === task.assignedEmployeeId && n.message === message
      );
      if (!alreadySent) {
        await createNotification(task.assignedEmployeeId, message);
        const employee = await getEmployeeById(task.assignedEmployeeId);
        if (employee?.email) {
          await sendDueSoonEmail({
            to: employee.email,
            fullName: employee.fullName,
            taskTitle: task.title,
            dueDate: task.dueDate,
            loginUrl: appLoginUrl(),
          });
        }
      }
    }
  }
}

module.exports = { createNotification, notifyAdmins, checkDueSoonNotifications };
