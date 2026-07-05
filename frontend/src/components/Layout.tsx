import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  BarChart3,
  Bell,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Shield,
  Users,
  X,
} from 'lucide-react';
import api from '../api/client';
import { clearCredentials } from '../features/auth/authSlice';
import { RootState } from '../store';

type LayoutProps = {
  children: React.ReactNode;
};

type NavLink = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
};

const links: NavLink[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/tasks', label: 'Tasks', icon: ClipboardList },
  { to: '/employees', label: 'Employees', icon: Users, adminOnly: true },
  { to: '/reports', label: 'Reports', icon: BarChart3, adminOnly: true },
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);

  const visibleLinks = useMemo(
    () => links.filter((link) => !link.adminOnly || user?.role === 'admin'),
    [user?.role]
  );

  useEffect(() => {
    const loadNotifications = () => {
      api.get('/api/notifications').then((res) => setNotifications(res.data)).catch(() => {});
    };

    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleLogout() {
    dispatch(clearCredentials());
    navigate('/login');
  }

  return (
    <div className="min-h-screen text-slate-100">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 via-cyan-400 to-emerald-300 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/20">
                T
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.35em] text-sky-300">Taskflow</p>
                <p className="text-sm font-semibold leading-tight">Employee Task Management</p>
              </div>
            </Link>

            <div className="hidden rounded-full border border-white/10 bg-white/5 p-1 md:flex">
              {visibleLinks.map((link) => {
                const Icon = link.icon;
                const active = location.pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${
                      active ? 'bg-sky-500/20 text-sky-200' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="glass-chip hidden sm:flex">
              <Shield className="h-4 w-4 text-sky-300" />
              {user?.role === 'admin' ? 'Admin workspace' : 'Employee workspace'}
            </div>

            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setNotifOpen((value) => !value)}
                className="relative rounded-2xl border border-white/10 bg-white/5 p-2.5 text-slate-300 transition hover:bg-white/10 hover:text-white"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {notifications.length > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                    {Math.min(notifications.length, 9)}
                  </span>
                ) : null}
              </button>

              {notifOpen ? (
                <div className="absolute right-0 mt-3 w-80 overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl shadow-slate-950/60">
                  <div className="border-b border-white/10 px-4 py-3">
                    <p className="text-sm font-semibold">Notifications</p>
                    <p className="mt-1 text-xs text-slate-500">Task assignment, reminders, and completions</p>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length ? (
                      notifications.slice(0, 8).map((item) => (
                        <div key={item.id} className="border-b border-white/5 px-4 py-3 text-sm text-slate-300 last:border-0">
                          <p>{item.message}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {new Date(item.createdAt).toLocaleString()}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="px-4 py-8 text-center text-sm text-slate-500">No notifications yet</p>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="hidden items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 sm:flex">
              <div className="text-right">
                <p className="text-sm font-medium leading-tight">{user?.fullName}</p>
                <p className="text-xs text-slate-400">
                  {user?.department || 'General'} {user?.designation ? `- ${user.designation}` : ''}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500/15 text-sm font-semibold text-sky-200">
                {user?.fullName?.charAt(0) || '?'}
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="hidden items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 transition hover:bg-rose-500/15 hover:text-rose-200 sm:inline-flex"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>

            <button
              type="button"
              className="rounded-2xl border border-white/10 bg-white/5 p-2.5 text-slate-300 md:hidden"
              onClick={() => setMobileOpen((value) => !value)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileOpen ? (
          <div className="border-t border-white/10 px-4 py-3 md:hidden">
            <div className="space-y-2">
              {visibleLinks.map((link) => {
                const Icon = link.icon;
                const active = location.pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm ${
                      active ? 'bg-sky-500/20 text-sky-200' : 'bg-white/5 text-slate-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                );
              })}
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-2xl bg-white/5 px-3 py-3 text-sm text-rose-300"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        ) : null}
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
