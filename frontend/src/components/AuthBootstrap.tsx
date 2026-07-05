import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import api from '../api/client';
import { clearCredentials, setHydrated, setUser } from '../features/auth/authSlice';
import { RootState } from '../store';

export default function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch();
  const token = useSelector((state: RootState) => state.auth.token);
  const hydrated = useSelector((state: RootState) => state.auth.hydrated);

  useEffect(() => {
    if (!token) {
      dispatch(setHydrated());
      return;
    }

    api
      .get('/api/auth/me')
      .then((res) => dispatch(setUser(res.data)))
      .catch(() => dispatch(clearCredentials()))
      .finally(() => dispatch(setHydrated()));
  }, [dispatch, token]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
          <p className="text-sm">Loading workspace...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
