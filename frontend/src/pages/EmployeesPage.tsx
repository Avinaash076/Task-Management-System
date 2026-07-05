import { useEffect, useMemo, useState } from 'react';
import { ArrowDownAZ, ArrowUpAZ, Search, UserPlus } from 'lucide-react';
import api from '../api/client';

type Employee = {
  id: number;
  fullName: string;
  email: string;
  department: string;
  designation: string;
  role: 'admin' | 'employee';
  temporaryPassword?: string;
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [form, setForm] = useState({
    id: 0,
    fullName: '',
    email: '',
    department: '',
    designation: '',
    role: 'employee' as 'admin' | 'employee',
    password: '',
    confirmPassword: '',
  });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortAsc, setSortAsc] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    loadEmployees();
  }, []);

  async function loadEmployees() {
    const res = await api.get('/api/employees');
    setEmployees(res.data);
  }

  const filteredEmployees = useMemo(() => {
    const query = search.toLowerCase();
    return employees
      .filter((emp) =>
        [emp.fullName, emp.email, emp.department, emp.designation, emp.role]
          .join(' ')
          .toLowerCase()
          .includes(query)
      )
      .sort((a, b) => {
        const cmp = a.fullName.localeCompare(b.fullName);
        return sortAsc ? cmp : -cmp;
      });
  }, [employees, search, sortAsc]);

  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / pageSize));
  const visibleEmployees = filteredEmployees.slice((page - 1) * pageSize, page * pageSize);

  async function saveEmployee(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setNotice('');
    try {
      const response = form.id
        ? await api.put(`/api/employees/${form.id}`, form)
        : await api.post('/api/employees', form);

      if (!form.id && response.data?.temporaryPassword) {
        setNotice(`Employee created. Temporary password: ${response.data.temporaryPassword}`);
      } else if (!form.id) {
        const mailSent = response.data?.mailSent !== false;
        setNotice(mailSent ? 'Employee created and credentials emailed.' : 'Employee created, but the email could not be sent.');
      } else {
        setNotice('Employee saved successfully.');
      }

      await loadEmployees();
      resetForm();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to save employee');
    }
  }

  async function deleteEmployee(id: number) {
    if (!window.confirm('Delete this employee?')) return;
    try {
      await api.delete(`/api/employees/${id}`);
      await loadEmployees();
      setNotice('Employee deleted.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to delete employee');
    }
  }

  function resetForm() {
    setForm({
      id: 0,
      fullName: '',
      email: '',
      department: '',
      designation: '',
      role: 'employee',
      password: '',
      confirmPassword: '',
    });
  }

  return (
    <div className="space-y-6">
      <section className="card p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="glass-chip mb-4">
              <UserPlus className="h-4 w-4 text-sky-300" />
              Admin only
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Employee management</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              Add, edit, search, sort, and paginate your team members from a cleaner admin workspace.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
            {filteredEmployees.length} employee{filteredEmployees.length === 1 ? '' : 's'}
          </div>
        </div>
      </section>

      <section className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">{form.id ? 'Edit employee' : 'Add employee'}</h2>
            <p className="mt-1 text-sm text-slate-400">
              New employees are created with a temporary password so they can sign in immediately.
            </p>
          </div>
          {form.id ? (
            <button type="button" className="btn-secondary" onClick={resetForm}>
              Cancel edit
            </button>
          ) : null}
        </div>

        <form className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3" onSubmit={saveEmployee}>
          <input className="input" placeholder="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
          <input className="input" placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input className="input" placeholder="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} required />
          <input className="input" placeholder="Designation" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} required />
          <input
            className="input"
            placeholder={form.id ? 'New password (optional)' : 'Password'}
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            minLength={form.password ? 8 : undefined}
          />
          <input
            className="input"
            placeholder={form.id ? 'Confirm new password' : 'Confirm password'}
            type="password"
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            minLength={form.confirmPassword ? 8 : undefined}
          />
          <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as 'admin' | 'employee' })}>
            <option value="employee">Employee</option>
            <option value="admin">Admin</option>
          </select>
          <div className="flex items-end gap-3">
            <button type="submit" className="btn-primary">
              {form.id ? 'Save changes' : 'Add employee'}
            </button>
          </div>
        </form>
        <p className="mt-4 text-xs text-slate-500">
          Leave password fields empty to use the temporary password. When credentials are set, they are emailed automatically.
        </p>

        {notice ? (
          <p className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {notice}
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </p>
        ) : null}
      </section>

      <section className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Employee directory</h2>
            <p className="mt-1 text-sm text-slate-400">Search, sort, and page through the list.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setSortAsc((value) => !value);
                setPage(1);
              }}
            >
              {sortAsc ? <ArrowDownAZ className="h-4 w-4" /> : <ArrowUpAZ className="h-4 w-4" />}
              Sort by name
            </button>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                className="input pl-10"
                placeholder="Search employees..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400">
                <th className="pb-3 pr-4">Name</th>
                <th className="pb-3 pr-4">Email</th>
                <th className="pb-3 pr-4">Department</th>
                <th className="pb-3 pr-4">Designation</th>
                <th className="pb-3 pr-4">Role</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleEmployees.map((employee) => (
                <tr key={employee.id} className="border-t border-white/5">
                  <td className="py-3 pr-4">{employee.fullName}</td>
                  <td className="py-3 pr-4 text-slate-400">{employee.email}</td>
                  <td className="py-3 pr-4">{employee.department}</td>
                  <td className="py-3 pr-4">{employee.designation}</td>
                  <td className="py-3 pr-4 capitalize">{employee.role}</td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() =>
                          setForm({
                            id: employee.id,
                            fullName: employee.fullName,
                            email: employee.email,
                            department: employee.department,
                            designation: employee.designation,
                            role: employee.role,
                            password: '',
                            confirmPassword: '',
                          })
                        }
                      >
                        Edit
                      </button>
                      <button type="button" className="btn-danger" onClick={() => deleteEmployee(employee.id)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>
              Previous
            </button>
            <button type="button" className="btn-secondary" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
