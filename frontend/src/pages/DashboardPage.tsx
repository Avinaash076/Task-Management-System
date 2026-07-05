import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Users,
} from 'lucide-react';
import api from '../api/client';
import { RootState } from '../store';

type Task = {
  id: number;
  title: string;
  status: string;
  dueDate: string;
  priority: string;
  assignedEmployeeName?: string;
};

type ReportData = {
  stats?: { totalTasks?: number };
  completed?: { completedTasks?: number };
  pending?: { pendingTasks?: number };
  employeeReport?: Array<{ employeeName: string; totalTasks: number; completedTasks: number }>;
};

export default function DashboardPage() {
  const user = useSelector((state: RootState) => state.auth.user);
  const isAdmin = user?.role === 'admin';
  const [summary, setSummary] = useState<ReportData | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    const requests = [api.get('/api/tasks')];
    if (isAdmin) {
      requests.push(api.get('/api/reports'));
    }

    Promise.all(requests)
      .then(([tasksRes, reportsRes]) => {
        if (!active) return;
        setTasks(tasksRes.data);
        if (reportsRes) {
          setSummary(reportsRes.data);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isAdmin]);

  const totals = useMemo(() => {
    const completed = tasks.filter((task) => task.status === 'completed').length;
    const pending = tasks.filter((task) => task.status === 'pending').length;
    const overdue = tasks.filter((task) => task.status !== 'completed' && new Date(task.dueDate) < new Date()).length;
    const dueSoon = tasks.filter((task) => {
      const due = new Date(task.dueDate);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return task.status !== 'completed' && due >= new Date() && due <= tomorrow;
    }).length;

    return {
      completed,
      pending,
      overdue,
      dueSoon,
    };
  }, [tasks]);

  if (loading) {
    return <PageLoader />;
  }

  const heroTitle = isAdmin ? 'Command center for your team' : 'Your task cockpit';
  const heroCopy = isAdmin
    ? 'Track the whole team, assign work quickly, and monitor completion without leaving the dashboard.'
    : 'See what is due, what is overdue, and what needs attention right now.';

  return (
    <div className="space-y-6">
      <section className="card overflow-hidden p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-2xl">
            <div className="glass-chip mb-4">
              <BarChart3 className="h-4 w-4 text-sky-300" />
              {isAdmin ? 'Admin overview' : 'Employee overview'}
            </div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{heroTitle}</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">{heroCopy}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/tasks" className="btn-primary">
              {isAdmin ? 'Manage tasks' : 'Open my tasks'}
              <ArrowRight className="h-4 w-4" />
            </Link>
            {isAdmin ? (
              <Link to="/employees" className="btn-secondary">
                Manage employees
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isAdmin ? (
          <>
            <StatCard icon={Users} label="Total employees" value={summary?.employeeReport?.length ?? 0} tone="sky" />
            <StatCard icon={ClipboardList} label="Total tasks" value={summary?.stats?.totalTasks ?? 0} tone="violet" />
            <StatCard icon={CheckCircle2} label="Completed tasks" value={summary?.completed?.completedTasks ?? 0} tone="emerald" />
            <StatCard icon={Clock3} label="Pending tasks" value={summary?.pending?.pendingTasks ?? 0} tone="amber" />
          </>
        ) : (
          <>
            <StatCard icon={ClipboardList} label="My tasks" value={tasks.length} tone="sky" />
            <StatCard icon={CheckCircle2} label="Completed" value={totals.completed} tone="emerald" />
            <StatCard icon={Clock3} label="Pending" value={totals.pending} tone="amber" />
            <StatCard icon={AlertTriangle} label="Overdue" value={totals.overdue} tone="rose" />
          </>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">{isAdmin ? 'Recent team tasks' : 'My recent tasks'}</h2>
              <p className="mt-1 text-sm text-slate-400">
                {isAdmin ? 'A quick look at the latest activity.' : 'Focus on the next task that matters.'}
              </p>
            </div>
            <Link to="/tasks" className="text-sm text-sky-300 hover:text-sky-200">
              View all
            </Link>
          </div>

          {tasks.length ? (
            <div className="space-y-3">
              {tasks.slice(0, 6).map((task) => (
                <article
                  key={task.id}
                  className="rounded-2xl border border-white/5 bg-white/5 px-4 py-4 transition hover:border-sky-400/20 hover:bg-white/7"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium text-white">{task.title}</h3>
                        <StatusBadge status={task.status} />
                      </div>
                      <p className="mt-1 text-sm text-slate-400">
                        {isAdmin && task.assignedEmployeeName ? `Assigned to ${task.assignedEmployeeName}` : 'Assigned to you'}
                      </p>
                    </div>
                    <span className="text-sm text-slate-400">Due {task.dueDate}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-500">
              No tasks to show yet.
            </p>
          )}
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold">{isAdmin ? 'Admin shortcuts' : 'Focus signals'}</h2>
          <div className="mt-4 space-y-3">
            {isAdmin ? (
              <>
                <Shortcut
                  label="Open employee management"
                  description="Add, edit, search, and paginate team members."
                  to="/employees"
                />
                <Shortcut
                  label="Review reports"
                  description="Export completed, pending, and employee-wise views."
                  to="/reports"
                />
              </>
            ) : (
              <>
                <Signal label="Overdue tasks" value={totals.overdue} tone="rose" />
                <Signal label="Due within 1 day" value={totals.dueSoon} tone="amber" />
                <Signal label="Completed tasks" value={totals.completed} tone="emerald" />
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  tone: 'sky' | 'violet' | 'emerald' | 'amber' | 'rose';
}) {
  const tones = {
    sky: 'from-sky-500/20 to-sky-500/5 text-sky-300',
    violet: 'from-violet-500/20 to-violet-500/5 text-violet-300',
    emerald: 'from-emerald-500/20 to-emerald-500/5 text-emerald-300',
    amber: 'from-amber-500/20 to-amber-500/5 text-amber-300',
    rose: 'from-rose-500/20 to-rose-500/5 text-rose-300',
  };

  return (
    <div className={`rounded-3xl border border-white/10 bg-gradient-to-br ${tones[tone]} p-5 shadow-lg shadow-slate-950/25`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-400">{label}</p>
        <Icon className="h-5 w-5 opacity-80" />
      </div>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
    in_progress: 'border-sky-500/20 bg-sky-500/10 text-sky-300',
    pending: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
  };

  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${styles[status] || styles.pending}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function Shortcut({
  label,
  description,
  to,
}: {
  label: string;
  description: string;
  to: string;
}) {
  return (
    <Link to={to} className="block rounded-2xl border border-white/5 bg-white/5 px-4 py-4 transition hover:border-sky-400/20 hover:bg-white/7">
      <p className="font-medium text-white">{label}</p>
      <p className="mt-1 text-sm text-slate-400">{description}</p>
    </Link>
  );
}

function Signal({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'emerald' | 'amber' | 'rose';
}) {
  const styles = {
    emerald: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
    amber: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
    rose: 'text-rose-300 bg-rose-500/10 border-rose-500/20',
  };

  return (
    <div className={`flex items-center justify-between rounded-2xl border px-4 py-4 ${styles[tone]}`}>
      <span className="text-sm">{label}</span>
      <span className="text-xl font-semibold">{value}</span>
    </div>
  );
}

function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
    </div>
  );
}
