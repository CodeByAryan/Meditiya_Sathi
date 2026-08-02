import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export interface AdminUser {
  id: string;
  fullName: string;
  username: string;
  role: string;
  email?: string | null;
  mobileNumber?: string | null;
  token: string;
}

export interface AdminAuthContextType {
  user: AdminUser | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isVolunteer: boolean;
  canManageAdmins: boolean;
  canManageVolunteers: boolean;
  canManageBuildings: boolean;
  canManageResidents: boolean;
  canManageFestivals: boolean;
  canCreateFestivals: boolean;
  canDeleteFestivals: boolean;
  canManageEvents: boolean;
  canCreateEvents: boolean;
  canDeleteEvents: boolean;
  canViewReports: boolean;
  canManageSystemSettings: boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType>({
  user: null,
  isAuthenticated: false,
  login: async () => false,
  logout: () => {},
  isLoading: false,
  error: null,
  isSuperAdmin: false,
  isAdmin: false,
  isVolunteer: false,
  canManageAdmins: false,
  canManageVolunteers: false,
  canManageBuildings: false,
  canManageResidents: false,
  canManageFestivals: false,
  canCreateFestivals: false,
  canDeleteFestivals: false,
  canManageEvents: false,
  canCreateEvents: false,
  canDeleteEvents: false,
  canViewReports: false,
  canManageSystemSettings: false,
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

  const role = user?.role || "";
  const isSuperAdmin = role === "Super Admin";
  const isAdmin = role === "Admin";
  const isVolunteer = role === "Volunteer";

  // Permission helpers based on role
  const canManageAdmins = isSuperAdmin;
  const canManageVolunteers = isSuperAdmin || isAdmin;
  const canManageBuildings = isSuperAdmin || isAdmin;
  const canManageResidents = isSuperAdmin || isAdmin;
  const canManageFestivals = isSuperAdmin || isAdmin;
  const canCreateFestivals = isSuperAdmin || isAdmin;
const canDeleteFestivals = isSuperAdmin; // Only Super Admin can delete festivals
  const canManageEvents = isSuperAdmin || isAdmin || isVolunteer;
  const canCreateEvents = isSuperAdmin || isAdmin;
  const canDeleteEvents = isSuperAdmin || isAdmin;
  const canViewReports = isSuperAdmin || isAdmin;
  const canManageSystemSettings = isSuperAdmin;

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
        isAdmin,
        isVolunteer,
        canManageAdmins,
        canManageVolunteers,
        canManageBuildings,
        canManageResidents,
        canManageFestivals,
        canCreateFestivals,
        canDeleteFestivals,
        canManageEvents,
        canCreateEvents,
        canDeleteEvents,
        canViewReports,
        canManageSystemSettings,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}

