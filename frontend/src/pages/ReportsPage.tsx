import { useEffect, useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import api from '../api/client';

export default function ReportsPage() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/api/reports')
      .then((res) => setReport(res.data))
      .finally(() => setLoading(false));
  }, []);

  async function downloadReport(type: 'completed' | 'pending' | 'employee', format: 'csv' | 'excel') {
    const response = await api.get(`/api/reports/export/${type}?format=${format}`, {
      responseType: 'blob',
    });
    const extension = format === 'excel' ? 'xls' : 'csv';
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${type}-report.${extension}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="card p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="glass-chip mb-4">
              <FileSpreadsheet className="h-4 w-4 text-sky-300" />
              Reports
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Reports & analytics</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              Review completion metrics, employee task distribution, and export the results to CSV or Excel.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <ReportCard label="Completed tasks" value={report?.completed?.completedTasks ?? 0} />
        <ReportCard label="Pending tasks" value={report?.pending?.pendingTasks ?? 0} />
        <ReportCard label="Total tasks" value={report?.stats?.totalTasks ?? 0} />
      </section>

      <section className="card p-6">
        <h2 className="text-lg font-semibold">Export reports</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <ExportPanel
            title="Completed tasks"
            onCsv={() => downloadReport('completed', 'csv')}
            onExcel={() => downloadReport('completed', 'excel')}
          />
          <ExportPanel
            title="Pending tasks"
            onCsv={() => downloadReport('pending', 'csv')}
            onExcel={() => downloadReport('pending', 'excel')}
          />
          <ExportPanel
            title="Employee-wise report"
            onCsv={() => downloadReport('employee', 'csv')}
            onExcel={() => downloadReport('employee', 'excel')}
          />
        </div>
      </section>

      <section className="card p-6">
        <h2 className="text-lg font-semibold">Employee-wise task summary</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400">
                <th className="pb-3 pr-4">Employee</th>
                <th className="pb-3 pr-4">Total tasks</th>
                <th className="pb-3">Completed</th>
              </tr>
            </thead>
            <tbody>
              {report?.employeeReport?.map((row: any) => (
                <tr key={row.employeeName} className="border-t border-white/5">
                  <td className="py-3 pr-4">{row.employeeName}</td>
                  <td className="py-3 pr-4">{row.totalTasks}</td>
                  <td className="py-3">{row.completedTasks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <TaskList title="Completed tasks" tasks={report?.completedTasks ?? []} />
        <TaskList title="Pending tasks" tasks={report?.pendingTasks ?? []} />
      </section>
    </div>
  );
}

function ReportCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-sky-500/15 to-transparent p-5 shadow-lg shadow-slate-950/25">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}

function ExportPanel({
  title,
  onCsv,
  onExcel,
}: {
  title: string;
  onCsv: () => void;
  onExcel: () => void;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
      <p className="font-medium">{title}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn-secondary" onClick={onCsv}>
          <Download className="h-4 w-4" />
          CSV
        </button>
        <button type="button" className="btn-secondary" onClick={onExcel}>
          <FileSpreadsheet className="h-4 w-4" />
          Excel
        </button>
      </div>
    </div>
  );
}

function TaskList({ title, tasks }: { title: string; tasks: any[] }) {
  return (
    <div className="card p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-4 space-y-2">
        {tasks.length ? (
          tasks.slice(0, 8).map((task: any) => (
            <div key={task.id} className="rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm">
              <p className="font-medium text-white">{task.title}</p>
              <p className="mt-1 text-slate-400">
                {task.assignedEmployee || 'Unassigned'} · Due {task.dueDate}
              </p>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500">No tasks in this category.</p>
        )}
      </div>
    </div>
  );
}
