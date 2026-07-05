CREATE DATABASE IF NOT EXISTS employee_task_db;
USE employee_task_db;

CREATE TABLE IF NOT EXISTS employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin','employee') NOT NULL DEFAULT 'employee',
  department VARCHAR(100) NOT NULL,
  designation VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  priority ENUM('low','medium','high') NOT NULL,
  status ENUM('pending','in_progress','completed') NOT NULL DEFAULT 'pending',
  start_date DATE NOT NULL,
  due_date DATE NOT NULL,
  assigned_employee_id INT,
  attachment_path VARCHAR(255),
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tasks_employee FOREIGN KEY (assigned_employee_id) REFERENCES employees(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  message VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO employees (id, full_name, email, password, role, department, designation) VALUES
(1, 'Admin User', 'admin@example.com', '$2a$10$ycOv3PPZBVEbpKLP.Lon/.XMxzi38.eciVNbTD7VGzYGg27i4QpJ6', 'admin', 'Operations', 'Manager'),
(2, 'Jane Doe', 'jane@example.com', '$2a$10$ycOv3PPZBVEbpKLP.Lon/.XMxzi38.eciVNbTD7VGzYGg27i4QpJ6', 'employee', 'Engineering', 'Developer');

INSERT IGNORE INTO tasks (id, title, description, priority, status, start_date, due_date, assigned_employee_id) VALUES
(1, 'Draft onboarding plan', 'Prepare onboarding checklist for new hires', 'high', 'pending', '2026-07-01', '2026-07-08', 2),
(2, 'Fix login bug', 'Investigate recent authentication regression', 'medium', 'in_progress', '2026-07-02', '2026-07-06', 2),
(3, 'Review monthly report', 'Summarize team output for leadership', 'low', 'completed', '2026-07-01', '2026-07-03', 2);
