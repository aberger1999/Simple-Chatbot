import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

const USERS_KEY = 'productivity_hub_users';
const SESSION_KEY = 'productivity_hub_session';

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getSession() {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY));
    if (session?.isAuthenticated) return session;
  } catch {
    /* ignore */
  }
  return null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getSession());

  const login = useCallback((email, password) => {
    const users = getUsers();
    const found = users.find(
      (u) => u.email === email.toLowerCase() && u.password === password
    );
    if (!found) return { ok: false, error: 'Invalid email or password.' };

    const session = { name: found.name, email: found.email, isAuthenticated: true };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setUser(session);
    return { ok: true };
  }, []);

  const register = useCallback((name, email, password) => {
    const users = getUsers();
    if (users.some((u) => u.email === email.toLowerCase())) {
      return { ok: false, error: 'An account with this email already exists.' };
    }

    const newUser = { name, email: email.toLowerCase(), password };
    saveUsers([...users, newUser]);

    const session = { name, email: email.toLowerCase(), isAuthenticated: true };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setUser(session);
    return { ok: true };
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
