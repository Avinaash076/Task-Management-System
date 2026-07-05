const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const memoryStore = {
  users: [],
  employees: [],
  tasks: [],
  notifications: [],
  nextUserId: 1,
  nextEmployeeId: 1,
  nextTaskId: 1,
  nextNotificationId: 1,
};

let pool = null;
let usingMemoryStore = false;

async function initializeDatabase() {
  try {
    pool = await mysql.createPool({
      host: process.env.MYSQL_HOST || 'localhost',
      port: process.env.MYSQL_PORT || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || 'root@123',
      database: process.env.MYSQL_DATABASE || 'employee_task_db',
      waitForConnections: true,
      connectionLimit: 10,
      multipleStatements: true,
    });

    await pool.query('SELECT 1');
    const schemaSql = fs.readFileSync(path.join(__dirname, '../../database/schema.sql'), 'utf8');
    await pool.query(schemaSql);
    console.log('MySQL database initialized');
  } catch (error) {
    usingMemoryStore = true;
    seedMemoryStore();
    console.warn('MySQL unavailable, using in-memory store for local demo:', error.message);
  }
}

function seedMemoryStore() {
  if (memoryStore.users.length) return;

  const password = require('bcryptjs').hashSync('Password123', 10);
  memoryStore.users = [
    { id: 1, fullName: 'Admin User', email: 'admin@example.com', password, role: 'admin', department: 'Operations', designation: 'Manager' },
    { id: 2, fullName: 'Jane Doe', email: 'jane@example.com', password, role: 'employee', department: 'Engineering', designation: 'Developer' },
  ];
  memoryStore.employees = memoryStore.users.map(({ id, fullName, email, role, department, designation }) => ({
    id, fullName, email, role, department, designation,
  }));
  memoryStore.tasks = [
    { id: 1, title: 'Draft onboarding plan', description: 'Prepare onboarding checklist for new hires', priority: 'high', status: 'pending', startDate: '2026-07-01', dueDate: '2026-07-08', assignedEmployeeId: 2, assignedEmployeeName: 'Jane Doe', attachmentPath: null, completedAt: null, createdAt: new Date().toISOString() },
    { id: 2, title: 'Fix login bug', description: 'Investigate recent authentication regression', priority: 'medium', status: 'in_progress', startDate: '2026-07-02', dueDate: '2026-07-06', assignedEmployeeId: 2, assignedEmployeeName: 'Jane Doe', attachmentPath: null, completedAt: null, createdAt: new Date().toISOString() },
    { id: 3, title: 'Review monthly report', description: 'Summarize team output for leadership', priority: 'low', status: 'completed', startDate: '2026-07-01', dueDate: '2026-07-03', assignedEmployeeId: 2, assignedEmployeeName: 'Jane Doe', attachmentPath: null, completedAt: new Date().toISOString(), createdAt: new Date().toISOString() },
  ];
  memoryStore.nextUserId = 3;
  memoryStore.nextEmployeeId = 3;
  memoryStore.nextTaskId = 4;
}

async function getDb() {
  if (pool) {
    return pool;
  }

  if (!usingMemoryStore) {
    await initializeDatabase();
  }

  return pool;
}

function getMemoryStore() {
  return memoryStore;
}

module.exports = {
  initializeDatabase,
  getDb,
  getMemoryStore,
};
