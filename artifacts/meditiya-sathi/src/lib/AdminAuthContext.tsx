import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export interface AdminUser {
  id: number;
  fullName: string;
  username: string;
  role: string;
  email?: string | null;
  mobileNumber?: string | null;
  token: string;
}

interface AdminAuthContextType {
  user: AdminUser | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
  isSuperAdmin: boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType>({
  user: null,
  isAuthenticated: false,
  login: async () => false,
  logout: () => {},
  isLoading: false,
  error: null,
  isSuperAdmin: false,
});

const STORAGE_KEY = "admin_auth";

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Check if token is expired
        const payloadBase64 = parsed.token?.split(".")?.[1];
        if (payloadBase64) {
          const payload = JSON.parse(atob(payloadBase64));
          if (payload.exp * 1000 > Date.now()) {
            return parsed;
          }
        }
      } catch {
        // Token is invalid, remove it
      }
      localStorage.removeItem(STORAGE_KEY);
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSuperAdmin = user?.role === "Super Admin";

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || "https://meditiya-sathi.onrender.com";
      const res = await fetch(`${apiUrl}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Invalid credentials");
        return false;
      }

      const data = await res.json();
      const adminUser: AdminUser = {
        id: data.id,
        fullName: data.fullName,
        username: data.username,
        role: data.role,
        email: data.email,
        mobileNumber: data.mobileNumber,
        token: data.token,
      };
      setUser(adminUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(adminUser));
      return true;
    } catch (err: any) {
      setError(err?.message || "Login failed");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        isLoading,
        error,
        isSuperAdmin,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}
