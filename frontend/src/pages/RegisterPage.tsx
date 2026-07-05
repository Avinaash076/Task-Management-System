import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Lock, Mail, UserRound } from 'lucide-react';
import { setCredentials } from '../features/auth/authSlice';

export default function RegisterPage() {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'employee' as 'admin' | 'employee',
  });
  const [error, setError] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    try {
      const response = await axios.post('/api/auth/register', form);
      dispatch(setCredentials({ user: response.data.user, token: response.data.token }));
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to create account');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 text-slate-100">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/70 shadow-2xl shadow-cyan-500/10 backdrop-blur-xl lg:grid-cols-[0.95fr_1.05fr]">
        <aside className="hidden flex-col justify-between border-r border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.24),_transparent_35%),linear-gradient(160deg,_rgba(2,6,23,0.95),_rgba(15,23,42,0.92))] p-10 lg:flex">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-emerald-300">Taskflow</p>
            <h1 className="mt-4 max-w-md text-4xl font-semibold leading-tight">Create a workspace that separates admin and employee duties.</h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-slate-400">
              Registration includes validation for email uniqueness and password policy, plus role selection for the account type you need.
            </p>
          </div>
          <div className="space-y-3 text-sm text-slate-300">
            <Bullet text="Full name, email, password, and confirm password" />
            <Bullet text="Passwords must be 8+ chars with upper, lower, and numeric characters" />
            <Bullet text="Choose admin or employee role at sign-up" />
          </div>
        </aside>

        <section className="p-6 sm:p-8 lg:p-10">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.35em] text-emerald-300">Register</p>
            <h2 className="mt-2 text-3xl font-semibold">Create your account</h2>
            <p className="mt-2 text-sm text-slate-400">Set up your profile and choose the correct role before continuing.</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <Field label="Full name" icon={<UserRound className="h-4 w-4" />}>
              <input
                className="input"
                type="text"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                required
                autoComplete="name"
              />
            </Field>

            <Field label="Email" icon={<Mail className="h-4 w-4" />}>
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                autoComplete="email"
              />
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Password" icon={<Lock className="h-4 w-4" />}>
                <input
                  className="input"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </Field>
              <Field label="Confirm password" icon={<Lock className="h-4 w-4" />}>
                <input
                  className="input"
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </Field>
            </div>

            <Field label="Role" icon={<UserRound className="h-4 w-4" />}>
              <select
                className="input"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as 'admin' | 'employee' })}
              >
                <option value="employee">Employee</option>
                <option value="admin">Admin</option>
              </select>
            </Field>

            {error ? (
              <p className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </p>
            ) : null}

            <button className="btn-primary w-full py-3" type="submit">
              Register
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-400">
            Already have an account? <Link className="text-emerald-300 hover:text-emerald-200" to="/login">Sign in</Link>
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

function Bullet({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-2 w-2 rounded-full bg-emerald-300" />
      <span>{text}</span>
    </div>
  );
}
