import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

const AUTH_KEY = "campusconnect.auth";
const TOKEN_KEY = "campusconnect.token";

export type AuthUser = {
  token: string;
  userId: string;
  name: string;
  email: string;
  roles: string[];
};

type AuthContextValue = {
  user: AuthUser | null;
  login: (user: AuthUser) => void;
  updateName: (name: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isStaff: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem(AUTH_KEY);
      return stored ? (JSON.parse(stored) as AuthUser) : null;
    } catch {
      return null;
    }
  });

  const login = useCallback((nextUser: AuthUser) => {
    localStorage.setItem(AUTH_KEY, JSON.stringify(nextUser));
    localStorage.setItem(TOKEN_KEY, nextUser.token);
    setUser(nextUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  const updateName = useCallback((name: string) => {
    setUser((current) => {
      if (!current) return current;
      const updated = { ...current, name };
      localStorage.setItem(AUTH_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const isAuthenticated = user !== null;
  const isAdmin = user?.roles.includes("ADMIN") ?? false;
  const isStaff = user?.roles.some((r) => r === "STAFF" || r === "ADMIN") ?? false;

  return (
    <AuthContext.Provider value={{ user, login, updateName, logout, isAuthenticated, isAdmin, isStaff }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
