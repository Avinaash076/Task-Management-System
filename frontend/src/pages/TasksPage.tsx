import { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  AlertCircle,
  CheckCircle2,
  Paperclip,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import api from '../api/client';
import { RootState } from '../store';

type Task = {
  id: number;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  startDate: string;
  dueDate: string;
  assignedEmployeeId?: number;
  assignedEmployeeName?: string;
  attachmentPath?: string | null;
};

type Employee = {
  id: number;
  fullName: string;
};

const emptyForm: {
  id: number;
  title: string;
  description: string;
  priority: Task['priority'];
  status: Task['status'];
  startDate: string;
  dueDate: string;
  assignedEmployeeId: string;
} = {
  id: 0,
  title: '',
  description: '',
  priority: 'medium',
  status: 'pending',
  startDate: '',
  dueDate: '',
  assignedEmployeeId: '',
};

export default function TasksPage() {
  const user = useSelector((state: RootState) => state.auth.user);
  const isAdmin = user?.role === 'admin';
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Task['status']>('all');
  const [error, setError] = useState('');
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editingStatus, setEditingStatus] = useState<Task['status']>('pending');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetId, setUploadTargetId] = useState<number | null>(null);

  useEffect(() => {
    loadTasks();
    if (isAdmin) {
      api.get('/api/employees').then((res) => setEmployees(res.data)).catch(() => {});
    }
  }, [isAdmin]);

  async function loadTasks() {
    const res = await api.get('/api/tasks');
    setTasks(res.data);
  }

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tasks.filter((task) => {
      const matchesQuery = [task.title, task.description, task.status, task.assignedEmployeeName]
        .join(' ')
        .toLowerCase()
        .includes(query);
      const matchesStatus = statusFilter === 'all' ? true : task.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [tasks, search, statusFilter]);

  const summary = useMemo(() => {
    const completed = tasks.filter((task) => task.status === 'completed').length;
    const pending = tasks.filter((task) => task.status === 'pending').length;
    const inProgress = tasks.filter((task) => task.status === 'in_progress').length;
    const overdue = tasks.filter((task) => task.status !== 'completed' && new Date(task.dueDate) < new Date()).length;
    return { completed, pending, inProgress, overdue };
  }, [tasks]);

  async function saveTask(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    try {
      if (isAdmin) {
        if (form.id) {
          await api.put(`/api/tasks/${form.id}`, form);
        } else {
          await api.post('/api/tasks', form);
        }
      } else if (editingTaskId) {
        await api.put(`/api/tasks/${editingTaskId}`, { status: editingStatus });
      }
      await loadTasks();
      resetForm();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to save task');
    }
  }

  async function deleteTask(id: number) {
    if (!window.confirm('Delete this task?')) return;
    try {
      await api.delete(`/api/tasks/${id}`);
      await loadTasks();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to delete task');
    }
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !uploadTargetId) return;
    setUploadingId(uploadTargetId);
    setError('');
    try {
      const data = new FormData();
      data.append('attachment', file);
      await api.post(`/api/tasks/${uploadTargetId}/upload`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await loadTasks();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploadingId(null);
      setUploadTargetId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingTaskId(null);
    setEditingStatus('pending');
  }

  function startEdit(task: Task) {
    if (task.status === 'completed') {
      setError('Completed tasks cannot be edited');
      return;
    }

    if (isAdmin) {
      setForm({
        id: task.id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: task.status,
        startDate: task.startDate,
        dueDate: task.dueDate,
        assignedEmployeeId: String(task.assignedEmployeeId || ''),
      });
      return;
    }

    setEditingTaskId(task.id);
    setEditingStatus(task.status);
  }

  const heroTitle = isAdmin ? 'Task management' : 'My tasks';
  const heroCopy = isAdmin
    ? 'Create work, assign it to the right employee, attach files, and keep deadlines under control.'
    : 'Update your own tasks, attach supporting files, and keep an eye on what is due soon.';

  return (
    <div className="space-y-6">
      <section className="card p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-2xl">
            <p className="glass-chip mb-4">
              {isAdmin ? <Plus className="h-4 w-4 text-sky-300" /> : <CheckCircle2 className="h-4 w-4 text-emerald-300" />}
              {isAdmin ? 'Admin workflow' : 'Employee workflow'}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{heroTitle}</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">{heroCopy}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniStat label="Total" value={tasks.length} />
            <MiniStat label="Pending" value={summary.pending} />
            <MiniStat label="In progress" value={summary.inProgress} />
            <MiniStat label="Overdue" value={summary.overdue} />
          </div>
        </div>
      </section>

      {isAdmin ? (
        <section className="card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">{form.id ? 'Edit task' : 'Create task'}</h2>
              <p className="mt-1 text-sm text-slate-400">
                Validate due dates, pick an assignee, and set the initial task state here.
              </p>
            </div>
            {form.id ? (
              <button type="button" className="btn-secondary" onClick={resetForm}>
                Cancel edit
              </button>
            ) : null}
          </div>

          <form className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3" onSubmit={saveTask}>
            <Field label="Title">
              <input
                className="input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </Field>
            <Field label="Description">
              <input
                className="input"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required
              />
            </Field>
            <Field label="Priority">
              <select
                className="input"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as Task['priority'] })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </Field>
            <Field label="Status">
              <select
                className="input"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as Task['status'] })}
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In progress</option>
                <option value="completed">Completed</option>
              </select>
            </Field>
            <Field label="Start date">
              <input
                className="input"
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                required
              />
            </Field>
            <Field label="Due date">
              <input
                className="input"
                type="date"
                value={form.dueDate}
                min={form.startDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                required
              />
            </Field>
            <Field label="Assign to">
              <select
                className="input"
                value={form.assignedEmployeeId}
                onChange={(e) => setForm({ ...form, assignedEmployeeId: e.target.value })}
                required
              >
                <option value="">Choose employee</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.fullName}
                  </option>
                ))}
              </select>
            </Field>
            <div className="flex items-end gap-3 md:col-span-2 xl:col-span-3">
              <button type="submit" className="btn-primary">
                {form.id ? 'Save changes' : 'Create task'}
              </button>
            </div>
          </form>
        </section>
      ) : editingTaskId ? (
        <section className="card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Update task status</h2>
              <p className="mt-1 text-sm text-slate-400">
                Employees can only update the status of tasks assigned to them.
              </p>
            </div>
            <button type="button" className="btn-secondary" onClick={resetForm}>
              Cancel
            </button>
          </div>

          <form className="mt-5 grid gap-4 md:max-w-md" onSubmit={saveTask}>
            <Field label="Status">
              <select
                className="input"
                value={editingStatus}
                onChange={(e) => setEditingStatus(e.target.value as Task['status'])}
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In progress</option>
                <option value="completed">Completed</option>
              </select>
            </Field>
            <button type="submit" className="btn-primary">
              Save status
            </button>
          </form>
        </section>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <section className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{isAdmin ? 'All tasks' : 'Assigned to me'}</h2>
            <p className="mt-1 text-sm text-slate-400">
              Use search and filters to narrow the list quickly.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                className="input pl-10"
                placeholder="Search tasks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="input w-auto"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | Task['status'])}
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {filteredTasks.map((task) => {
            const overdue = task.status !== 'completed' && new Date(task.dueDate) < new Date();
            return (
              <article key={task.id} className="rounded-3xl border border-white/5 bg-white/5 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-white">{task.title}</h3>
                      <Pill tone={task.priority}>{task.priority}</Pill>
                      <Pill tone={task.status}>{task.status.replace('_', ' ')}</Pill>
                      {overdue ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-xs text-rose-300">
                          <AlertCircle className="h-3.5 w-3.5" />
                          Overdue
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm text-slate-400">{task.description}</p>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                      <span>Start {task.startDate}</span>
                      <span>Due {task.dueDate}</span>
                      {isAdmin ? <span>Assigned to {task.assignedEmployeeName || 'Unassigned'}</span> : null}
                    </div>
                    {task.attachmentPath ? (
                      <a
                        href={task.attachmentPath}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex text-sm text-sky-300 hover:text-sky-200"
                      >
                        View attachment
                      </a>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {!isAdmin && task.status !== 'completed' ? (
                      <button type="button" className="btn-secondary" onClick={() => startEdit(task)}>
                        Update status
                      </button>
                    ) : null}
                    {!isAdmin ? (
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={uploadingId === task.id}
                        onClick={() => {
                          setUploadTargetId(task.id);
                          fileInputRef.current?.click();
                        }}
                      >
                        <Paperclip className="h-4 w-4" />
                        {uploadingId === task.id ? 'Uploading...' : 'Attach'}
                      </button>
                    ) : null}
                    {isAdmin && task.status !== 'completed' ? (
                      <button type="button" className="btn-secondary" onClick={() => startEdit(task)}>
                        Edit
                      </button>
                    ) : null}
                    {isAdmin ? (
                      <button type="button" className="btn-danger" onClick={() => deleteTask(task.id)}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                </div>

                {isAdmin ? (
                  <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-400">
                    <span>Priority: {task.priority}</span>
                    <span>Status: {task.status.replace('_', ' ')}</span>
                    <span>Assigned: {task.assignedEmployeeName || 'Unassigned'}</span>
                  </div>
                ) : null}
              </article>
            );
          })}

          {!filteredTasks.length ? (
            <p className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-500">
              No tasks found.
            </p>
          ) : null}
        </div>
      </section>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={handleFileUpload}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function Pill({ tone, children }: { tone: string; children: React.ReactNode }) {
  const map: Record<string, string> = {
    low: 'border-slate-500/20 bg-slate-500/10 text-slate-300',
    medium: 'border-sky-500/20 bg-sky-500/10 text-sky-300',
    high: 'border-rose-500/20 bg-rose-500/10 text-rose-300',
    pending: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
    in_progress: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-300',
    completed: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
  };

  return <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${map[tone] || map.pending}`}>{children}</span>;
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center">
      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}
