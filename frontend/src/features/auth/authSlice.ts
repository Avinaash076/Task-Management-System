import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type User = {
  id: number;
  fullName: string;
  email: string;
  role: 'admin' | 'employee';
  department: string;
  designation: string;
};

type AuthState = {
  user: User | null;
  token: string | null;
  hydrated: boolean;
};

function loadUser(): User | null {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const initialState: AuthState = {
  user: loadUser(),
  token: localStorage.getItem('token') || null,
  hydrated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ user: User; token: string }>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.hydrated = true;
      localStorage.setItem('token', action.payload.token);
      localStorage.setItem('user', JSON.stringify(action.payload.user));
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      localStorage.setItem('user', JSON.stringify(action.payload));
    },
    setHydrated: (state) => {
      state.hydrated = true;
    },
    clearCredentials: (state) => {
      state.user = null;
      state.token = null;
      state.hydrated = true;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
  },
});

export const { setCredentials, setUser, setHydrated, clearCredentials } = authSlice.actions;
export default authSlice.reducer;
