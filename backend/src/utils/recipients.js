const { getDb, getMemoryStore } = require('../config/db');

function normalizeEmployee(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    fullName: row.full_name || row.fullName,
    email: row.email,
    role: row.role,
    department: row.department,
    designation: row.designation,
  };
}

async function getEmployeeById(id) {
  const pool = await getDb();
  if (pool) {
    const [rows] = await pool.query(
      'SELECT id, full_name, email, role, department, designation FROM employees WHERE id = ?',
      [id]
    );
    return normalizeEmployee(rows[0]);
  }

  const store = getMemoryStore();
  return normalizeEmployee(
    store.users.find((item) => item.id === Number(id)) ||
      store.employees.find((item) => item.id === Number(id))
  );
}

async function getAdmins(excludeUserId = null) {
  const pool = await getDb();
  if (pool) {
    const [rows] = await pool.query(
      'SELECT id, full_name, email, role, department, designation FROM employees WHERE role = "admin"'
    );
    return rows
      .map(normalizeEmployee)
      .filter((employee) => employee && employee.id !== Number(excludeUserId));
  }

  const store = getMemoryStore();
  return store.users
    .filter((item) => item.role === 'admin' && item.id !== Number(excludeUserId))
    .map(normalizeEmployee);
}

module.exports = {
  getEmployeeById,
  getAdmins,
};
