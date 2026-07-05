import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle2, Lock, Mail } from 'lucide-react';
import { setCredentials } from '../features/auth/authSlice';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    try {
      const response = await axios.post('/api/auth/login', { email, password, rememberMe });
      dispatch(setCredentials({ user: response.data.user, token: response.data.token }));
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to sign in');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 text-slate-100">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/70 shadow-2xl shadow-cyan-500/10 backdrop-blur-xl lg:grid-cols-[1.1fr_0.9fr]">
        <aside className="hidden flex-col justify-between border-r border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.26),_transparent_35%),linear-gradient(160deg,_rgba(2,6,23,0.95),_rgba(15,23,42,0.92))] p-10 lg:flex">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-sky-300">Taskflow</p>
            <h1 className="mt-4 max-w-md text-4xl font-semibold leading-tight">One place for tasks, teams, and deadlines.</h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-slate-400">
              A sharper workspace for admins and employees with role-aware dashboards, reports, notifications, and file uploads.
            </p>
          </div>
          <div className="space-y-3 text-sm text-slate-300">
            <Feature text="Role-based views for admin and employee accounts" />
            <Feature text="Remember Me support for longer-lived sessions" />
            <Feature text="PDF, JPG, and PNG task attachments up to 5 MB" />
          </div>
        </aside>

        <section className="p-6 sm:p-8 lg:p-10">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.35em] text-sky-300">Sign in</p>
            <h2 className="mt-2 text-3xl font-semibold">Welcome back</h2>
            <p className="mt-2 text-sm text-slate-400">Use your work email to continue into the task workspace.</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <Field label="Email" icon={<Mail className="h-4 w-4" />}>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </Field>
            <Field label="Password" icon={<Lock className="h-4 w-4" />}>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                minLength={8}
              />
            </Field>

            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-400">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-white/20 bg-transparent"
                />
                Keep me signed in
              </label>
              <span className="text-xs text-slate-500">Password must contain uppercase, lowercase, and a number.</span>
            </div>

            {error ? (
              <p className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </p>
            ) : null}

            <button className="btn-primary w-full py-3" type="submit">
              Log in
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-400">
            New here? <Link className="text-sky-300 hover:text-sky-200" to="/register">Create an account</Link>
          </p>
          <p className="mt-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-400">
            Enter your email and password manually to sign in.
          </p>
        </section>
      </div>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-2 text-sm text-slate-300">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2">
      <CheckCircle2 className="h-4 w-4 text-emerald-300" />
      <span>{text}</span>
    </div>
  );
}
