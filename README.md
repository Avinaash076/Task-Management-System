Employee Task Management System

This is a full-stack app for managing employees and their tasks, built with React, TypeScript, and Redux Toolkit on the frontend, and Node.js with Express and MySQL on the backend.

The frontend handles login, dashboards, employee management, task boards, and reports, all styled with Tailwind CSS. The backend exposes a set of REST endpoints under `/api` and validates everything before it touches the database. MySQL stores employees, tasks, and notifications, but if MySQL isn't available, the server quietly falls back to an in-memory store so you can still try things out locally.

Getting it running

You'll need Node.js 18+ and MySQL 8+ installed.

For the backend, go into the `backend` folder, copy `.env.example` to `.env`, run `npm install`, then `npm run dev`. Just make sure to update `.env` with your own MySQL credentials first.

```cmd
cd backend
cp .env.example .env
npm install
npm run dev
```

Open a second terminal for the frontend: go into `frontend`, run `npm install`, then `npm run dev`, and open http://localhost:5173 in your browser.

```cmd
cd frontend
npm install
npm run dev
```

For the database, import the schema from the backend folder with:

```cmd
mysql -u root -p < backend/database/schema.sql
```

To log in and poke around, you can use the demo accounts:

Admin — admin@example.com / Password123
Employee — jane@example.com / Password123

API endpoints

Auth: `POST /api/auth/register`, `POST /api/auth/login`
Employees: `GET/POST /api/employees`, `PUT/DELETE /api/employees/:id`
Tasks: `GET/POST /api/tasks`, `PUT/DELETE /api/tasks/:id`
Reports: `GET /api/reports`
<img width="2100" height="2688" alt="diagram" src="https://github.com/user-attachments/assets/b8894e91-b43c-4d25-a001-447eacc0aa1e" />
