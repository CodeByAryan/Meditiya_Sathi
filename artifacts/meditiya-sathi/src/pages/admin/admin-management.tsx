import { useState, useEffect, useCallback } from "react";
import {
  Shield,
  UserPlus,
  ToggleLeft,
  ToggleRight,
  Lock,
  Trash2,
  Pencil,
  Check,
  AlertCircle,
  Sparkles,
  X,
} from "lucide-react";

import { useAdminAuth } from "@/lib/AdminAuthContext";
import { getApiUrl } from "@/lib/utils";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Admin {
  id: string;
  fullName: string;
  username: string;
  email?: string | null;
  mobileNumber: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLogin: string | null;
  assignedFestivalIds?: number[];
  assignedEventIds?: number[];
}

interface FormData {
  fullName: string;
  username: string;
  mobileNumber: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: string;
  isActive: boolean;
}

function getAuthHeaders(): Record<string, string> {
  const stored = localStorage.getItem("admin_auth");

  if (stored) {
    try {
      const parsed = JSON.parse(stored);

      return {
        Authorization: `Bearer ${parsed.token}`,
        "Content-Type": "application/json",
      };
    } catch {
      // Ignore invalid local storage
    }
  }

  return {
    "Content-Type": "application/json",
  };
}

export default function AdminManagement() {
  const { user, isSuperAdmin } = useAdminAuth();

  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editAdmin, setEditAdmin] = useState<Admin | null>(null);
  const [resetPasswordAdmin, setResetPasswordAdmin] =
    useState<Admin | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    username: "",
    mobileNumber: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "Admin",
    isActive: true,
  });

  const [passwordForm, setPasswordForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  const [assignmentAdmin, setAssignmentAdmin] = useState<Admin | null>(null);
  const [assignmentFestivalIds, setAssignmentFestivalIds] = useState<number[]>([]);
  const [assignmentEventIds, setAssignmentEventIds] = useState<number[]>([]);
  const [assignmentFestivals, setAssignmentFestivals] = useState<{ id: number; name: string; year: number }[]>([]);
  const [assignmentEvents, setAssignmentEvents] = useState<{ id: number; title: string }[]>([]);
  const [assignmentLoading, setAssignmentLoading] = useState(false);

  const fetchAdmins = useCallback(async () => {
    setLoading(true);

    try {
      const res = await fetch(`${getApiUrl()}/api/admin/manage`, {
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to load admins");
        return;
      }

      const data = await res.json();
      setAdmins(data);
    } catch (err: any) {
      console.error("Failed to fetch admins:", err);
      setError(err?.message || "Failed to fetch admins");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const resetForm = () => {
    setFormData({
      fullName: "",
      username: "",
      mobileNumber: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "Admin",
      isActive: true,
    });

    setShowAddForm(false);
    setEditAdmin(null);
    clearMessages();
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();

    clearMessages();

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    try {
      const res = await fetch(`${getApiUrl()}/api/admin/manage`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create admin");
        return;
      }

      setSuccess("Admin created successfully");

      resetForm();

      await fetchAdmins();
    } catch (err: any) {
      setError(err?.message || "Failed to create admin");
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editAdmin) return;

    clearMessages();

    try {
      const res = await fetch(
        `${getApiUrl()}/api/admin/manage/${editAdmin.id}`,
        {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            fullName: formData.fullName,
            username: formData.username,
            mobileNumber: formData.mobileNumber,
            email: formData.email || null,
            role: formData.role,
            isActive: formData.isActive,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to update admin");
        return;
      }

      setSuccess("Admin updated successfully");

      resetForm();

      await fetchAdmins();
    } catch (err: any) {
      setError(err?.message || "Failed to update admin");
    }
  };

  const handleToggleStatus = async (admin: Admin) => {
    clearMessages();

    try {
      const res = await fetch(
        `${getApiUrl()}/api/admin/manage/${admin.id}/status`,
        {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            isActive: !admin.isActive,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to toggle status");
        return;
      }

      setSuccess(
        `${admin.fullName} is now ${
          data.isActive ? "enabled" : "disabled"
        }`
      );

      await fetchAdmins();
    } catch (err: any) {
      setError(err?.message || "Failed to toggle status");
    }
  };

  const openAssignments = async (admin: Admin) => {
    setAssignmentAdmin(admin); setAssignmentFestivalIds(admin.assignedFestivalIds || []); setAssignmentEventIds(admin.assignedEventIds || []); setAssignmentLoading(true);
    try {
      const [festivalsRes, eventsRes] = await Promise.all([fetch(`${getApiUrl()}/api/admin/festivals`, { headers: getAuthHeaders() }), fetch(`${getApiUrl()}/api/admin/events`, { headers: getAuthHeaders() })]);
      setAssignmentFestivals(await festivalsRes.json()); setAssignmentEvents(await eventsRes.json());
    } finally { setAssignmentLoading(false); }
  };

  const saveAssignments = async () => {
    if (!assignmentAdmin) return;
    setAssignmentLoading(true); clearMessages();
    try {
      const res = await fetch(`${getApiUrl()}/api/admin/manage/${assignmentAdmin.id}/assignments`, { method: "PATCH", headers: getAuthHeaders(), body: JSON.stringify({ festivalIds: assignmentFestivalIds, eventIds: assignmentEventIds }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to update assignments");
      setSuccess("Volunteer assignments updated successfully"); setAssignmentAdmin(null); await fetchAdmins();
    } catch (err: any) { setError(err?.message || "Failed to update assignments"); } finally { setAssignmentLoading(false); }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resetPasswordAdmin) return;

    clearMessages();

    if (
      passwordForm.newPassword !== passwordForm.confirmPassword
    ) {
      setError("Passwords do not match");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    try {
      const res = await fetch(
        `${getApiUrl()}/api/admin/manage/${resetPasswordAdmin.id}/reset-password`,
        {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify(passwordForm),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to reset password");
        return;
      }

      setSuccess("Password reset successfully");

      setResetPasswordAdmin(null);

      setPasswordForm({
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err: any) {
      setError(err?.message || "Failed to reset password");
    }
  };

  const handleDelete = async (admin: Admin) => {
    if (
      !confirm(
        `Are you sure you want to delete admin "${admin.fullName}"?`
      )
    ) {
      return;
    }

    clearMessages();

    try {
      const res = await fetch(
        `${getApiUrl()}/api/admin/manage/${admin.id}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));

        setError(data.error || "Failed to delete admin");
        return;
      }

      setSuccess("Admin deleted successfully");

      await fetchAdmins();
    } catch (err: any) {
      setError(err?.message || "Failed to delete admin");
    }
  };

  const openEditForm = (admin: Admin) => {
    setFormData({
      fullName: admin.fullName,
      username: admin.username,
      mobileNumber: admin.mobileNumber,
      email: admin.email || "",
      password: "",
      confirmPassword: "",
      role: admin.role,
      isActive: admin.isActive,
    });

    setEditAdmin(admin);
    setShowAddForm(false);
    clearMessages();
  };

  if (!isSuperAdmin && user?.role !== "Admin") {
    return (
      <div className="relative min-h-screen w-full overflow-hidden bg-[#080808] text-white">
        {/* Gold ambient glow */}
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-amber-400/10 blur-[140px]" />

        {/* Black lower glow */}
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-black blur-[100px]" />

        <div className="relative z-10">
          <div className="border-b border-amber-300/10 bg-gradient-to-b from-amber-500/[0.12] to-transparent px-4 py-10">
            <div className="mx-auto max-w-6xl">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/10 shadow-[0_0_35px_rgba(251,191,36,0.08)]">
                  <Shield className="h-7 w-7 text-amber-300" />
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-300/70">
                    Meditiya Sathi
                  </p>

                  <h1 className="mt-1 text-3xl font-serif font-semibold">
                    Admin Management
                  </h1>
                </div>
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-6xl px-4 py-20 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-red-400/20 bg-red-400/10">
              <AlertCircle className="h-9 w-9 text-red-400" />
            </div>

            <h2 className="mt-6 text-2xl font-semibold">
              Access Restricted
            </h2>

            <p className="mt-2 text-white/50">
              Only Super Admins can access this page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#080808] pb-20 text-white">
      {/* =========================================================
          AMBIENT BACKGROUND
      ========================================================== */}

      {/* Upper gold glow */}
      <div className="pointer-events-none absolute -top-48 left-1/2 h-[650px] w-[900px] -translate-x-1/2 rounded-full bg-amber-400/10 blur-[150px]" />

      <div className="pointer-events-none absolute left-[10%] top-[20%] h-[350px] w-[350px] rounded-full bg-orange-400/[0.035] blur-[120px]" />

      {/* Lower black glow */}
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-[650px] w-[1000px] -translate-x-1/2 rounded-full bg-black blur-[130px]" />

      {/* Gold radial light */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[500px] bg-[radial-gradient(circle_at_50%_0%,rgba(245,158,11,0.10),transparent_65%)]" />

      {/* =========================================================
          HEADER
      ========================================================== */}

      <header className="relative z-10 border-b border-white/10 bg-gradient-to-b from-amber-400/[0.10] via-black/20 to-transparent">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            {/* Title */}
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/10 shadow-[0_0_40px_rgba(251,191,36,0.10)]">
                <Shield className="h-7 w-7 text-amber-300" />
              </div>

              <div>
                <div className="mb-1 flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />

                  <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-300/70">
                    Meditiya Sathi
                  </span>
                </div>

                <h1 className="text-3xl font-serif font-semibold tracking-tight text-white">
                  Admin Management
                </h1>

                <p className="mt-1 text-sm text-white/45">
                  Manage administrators and platform access
                </p>
              </div>
            </div>

            {/* Add button */}
            <Button
              onClick={() => {
                clearMessages();

                if (showAddForm) {
                  resetForm();
                } else {
                  setShowAddForm(true);
                }
              }}
              className="group inline-flex h-11 items-center gap-2 rounded-full border border-amber-200/20 bg-amber-300/10 px-5 text-sm font-semibold text-amber-200 backdrop-blur-xl transition-all hover:border-amber-300/40 hover:bg-amber-300/20 hover:text-white"
            >
              {showAddForm ? (
                <X className="h-4 w-4" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}

              {showAddForm ? "Cancel" : "Add Account"}
            </Button>
          </div>

          {/* Stats */}
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 backdrop-blur-xl">
              <p className="text-[10px] uppercase tracking-wider text-white/40">
                Total Admins
              </p>

              <p className="mt-1 text-2xl font-semibold text-white">
                {admins.length}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 backdrop-blur-xl">
              <p className="text-[10px] uppercase tracking-wider text-white/40">
                Active
              </p>

              <p className="mt-1 text-2xl font-semibold text-emerald-300">
                {admins.filter((admin) => admin.isActive).length}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 backdrop-blur-xl">
              <p className="text-[10px] uppercase tracking-wider text-white/40">
                Super Admins
              </p>

              <p className="mt-1 text-2xl font-semibold text-amber-300">
                {
                  admins.filter(
                    (admin) => admin.role === "Super Admin"
                  ).length
                }
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 backdrop-blur-xl">
              <p className="text-[10px] uppercase tracking-wider text-white/40">
                System
              </p>

              <p className="mt-1 flex items-center gap-2 text-lg font-semibold">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
                Active
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* =========================================================
          MAIN
      ========================================================== */}

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Messages */}

        {error && (
          <div className="mb-5 flex items-center gap-2 rounded-2xl border border-red-400/20 bg-red-400/[0.07] px-4 py-3 text-sm text-red-300 backdrop-blur-xl">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 flex items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.07] px-4 py-3 text-sm text-emerald-300 backdrop-blur-xl">
            <Check className="h-4 w-4 shrink-0" />
            {success}
          </div>
        )}

        {/* =========================================================
            ADD / EDIT FORM
        ========================================================== */}

        {(showAddForm || editAdmin) && (
          <Card className="mb-8 overflow-hidden rounded-3xl border border-amber-300/10 bg-white/[0.035] shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
            <CardHeader className="border-b border-white/10 bg-amber-300/[0.035]">
              <CardTitle className="flex items-center gap-3 text-lg text-white">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-300/20 bg-amber-300/10">
                  {editAdmin ? (
                    <Pencil className="h-4 w-4 text-amber-300" />
                  ) : (
                    <UserPlus className="h-4 w-4 text-amber-300" />
                  )}
                </div>

                {editAdmin ? "Edit Admin" : "Add New Admin"}
              </CardTitle>
            </CardHeader>

            <CardContent className="p-5 sm:p-6">
              <form
                onSubmit={editAdmin ? handleEdit : handleAdd}
                className="grid grid-cols-1 gap-5 md:grid-cols-2"
              >
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/70">
                    Full Name *
                  </label>

                  <Input
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        fullName: e.target.value,
                      })
                    }
                    required
                    className="border-white/10 bg-white/[0.04] text-white placeholder:text-white/25 focus:border-amber-300/40"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white/70">
                    Username *
                  </label>

                  <Input
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        username: e.target.value,
                      })
                    }
                    required
                    className="border-white/10 bg-white/[0.04] text-white placeholder:text-white/25 focus:border-amber-300/40"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white/70">
                    Mobile Number *
                  </label>

                  <Input
                    value={formData.mobileNumber}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        mobileNumber: e.target.value,
                      })
                    }
                    required
                    className="border-white/10 bg-white/[0.04] text-white placeholder:text-white/25 focus:border-amber-300/40"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white/70">
                    Email
                  </label>

                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        email: e.target.value,
                      })
                    }
                    className="border-white/10 bg-white/[0.04] text-white placeholder:text-white/25 focus:border-amber-300/40"
                  />
                </div>

                {!editAdmin && (
                  <>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-white/70">
                        Password *
                      </label>

                      <Input
                        type="password"
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            password: e.target.value,
                          })
                        }
                        required
                        className="border-white/10 bg-white/[0.04] text-white focus:border-amber-300/40"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-white/70">
                        Confirm Password *
                      </label>

                      <Input
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            confirmPassword: e.target.value,
                          })
                        }
                        required
                        className="border-white/10 bg-white/[0.04] text-white focus:border-amber-300/40"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="mb-2 block text-sm font-medium text-white/70">
                    Role
                  </label>

                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        role: e.target.value,
                      })
                    }
                    className="h-10 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none focus:border-amber-300/40"
                  >
                    <option value="Admin" className="bg-[#111]">
                      Admin
                    </option>

                    <option
                      value="Super Admin"
                      className="bg-[#111]"
                    >
                      Super Admin
                    </option>

                    <option value="Volunteer" className="bg-[#111]">
                      Volunteer
                    </option>
                  </select>
                </div>

                <div className="flex items-center gap-3 pt-6">
                  <span className="text-sm font-medium text-white/70">
                    Status
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        isActive: !formData.isActive,
                      })
                    }
                    className={`rounded-full px-4 py-2 text-xs font-bold transition-all ${
                      formData.isActive
                        ? "bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/20"
                        : "bg-white/5 text-white/40 ring-1 ring-white/10"
                    }`}
                  >
                    {formData.isActive ? "Active" : "Inactive"}
                  </button>
                </div>

                <div className="flex gap-3 pt-3 md:col-span-2">
                  <Button
                    type="submit"
                    className="rounded-full bg-gradient-to-r from-amber-200 via-orange-300 to-amber-400 px-6 font-semibold text-black shadow-[0_0_30px_rgba(251,191,36,0.12)] hover:brightness-110"
                  >
                    {isSubmitting ? "Creating..." : (editAdmin ? "Update Admin" : "Create Admin")}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    className="rounded-full border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* =========================================================
            RESET PASSWORD
        ========================================================== */}

        {resetPasswordAdmin && (
          <Card className="mb-8 overflow-hidden rounded-3xl border border-amber-300/10 bg-white/[0.035] backdrop-blur-2xl">
            <CardHeader className="border-b border-white/10 bg-amber-300/[0.035]">
              <CardTitle className="flex items-center gap-3 text-white">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-300/20 bg-amber-300/10">
                  <Lock className="h-4 w-4 text-amber-300" />
                </div>

                Reset Password for {resetPasswordAdmin.fullName}
              </CardTitle>
            </CardHeader>

            <CardContent className="p-5 sm:p-6">
              <form
                onSubmit={handleResetPassword}
                className="grid max-w-2xl grid-cols-1 gap-5 md:grid-cols-2"
              >
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/70">
                    New Password *
                  </label>

                  <Input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        newPassword: e.target.value,
                      })
                    }
                    required
                    className="border-white/10 bg-white/[0.04] text-white focus:border-amber-300/40"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white/70">
                    Confirm Password *
                  </label>

                  <Input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        confirmPassword: e.target.value,
                      })
                    }
                    required
                    className="border-white/10 bg-white/[0.04] text-white focus:border-amber-300/40"
                  />
                </div>

                <div className="flex gap-3 md:col-span-2">
                  <Button
                    type="submit"
                    className="rounded-full bg-gradient-to-r from-amber-200 via-orange-300 to-amber-400 font-semibold text-black"
                  >
                    Reset Password
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setResetPasswordAdmin(null);
                      setPasswordForm({
                        newPassword: "",
                        confirmPassword: "",
                      });
                    }}
                    className="rounded-full border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* =========================================================
        {assignmentAdmin && (
          <Card className="mb-8 rounded-3xl border-emerald-300/10 bg-white/[0.035] backdrop-blur-2xl">
            <CardHeader><CardTitle className="text-white">Assignments for {assignmentAdmin.fullName}</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div><p className="mb-2 text-sm font-semibold text-white/70">Festivals</p><div className="grid gap-2 sm:grid-cols-2">{assignmentFestivals.map((festival) => <label key={festival.id} className="flex items-center gap-2 text-sm text-white/70"><input type="checkbox" checked={assignmentFestivalIds.includes(festival.id)} onChange={(event) => setAssignmentFestivalIds((old) => event.target.checked ? [...old, festival.id] : old.filter((id) => id !== festival.id))} />{festival.name} {festival.year}</label>)}</div></div>
              <div><p className="mb-2 text-sm font-semibold text-white/70">Events</p><div className="grid gap-2 sm:grid-cols-2">{assignmentEvents.map((event) => <label key={event.id} className="flex items-center gap-2 text-sm text-white/70"><input type="checkbox" checked={assignmentEventIds.includes(event.id)} onChange={(change) => setAssignmentEventIds((old) => change.target.checked ? [...old, event.id] : old.filter((id) => id !== event.id))} />{event.title}</label>)}</div></div>
              <div className="flex gap-3 pt-2"><Button onClick={saveAssignments} disabled={assignmentLoading}>{assignmentLoading ? "Saving..." : "Save Assignments"}</Button><Button variant="outline" onClick={() => setAssignmentAdmin(null)}>Cancel</Button></div>
            </CardContent>
          </Card>
        )}

            ADMIN TABLE
        ========================================================== */}

        <section>
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-300/70">
                Administration
              </p>

              <h2 className="mt-1 text-2xl font-serif font-semibold text-white">
                Administrators
              </h2>

              <p className="mt-1 text-sm text-white/40">
                Manage accounts, roles and access status.
              </p>
            </div>
          </div>

          <Card className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] shadow-[0_25px_100px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
            <CardContent className="p-0">
              {loading ? (
                <div className="p-12 text-center text-sm text-white/40">
                  Loading administrators...
                </div>
              ) : admins.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-300/10 bg-amber-300/5">
                    <Shield className="h-6 w-6 text-amber-300/60" />
                  </div>

                  <p className="mt-4 text-sm text-white/40">
                    No administrators found.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.025]">
                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/40">
                          Name
                        </th>

                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/40">
                          Username
                        </th>

                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/40">
                          Mobile
                        </th>

                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/40">
                          Role
                        </th>

                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/40">
                          Status
                        </th>

                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/40">
                          Last Login
                        </th>

                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/40">
                          Created
                        </th>

                        <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wider text-white/40">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {admins.map((admin) => (
                        <tr
                          key={admin.id}
                          className="border-b border-white/[0.06] transition-colors hover:bg-amber-300/[0.025]"
                        >
                          <td className="px-5 py-4">
                            <div className="font-medium text-white">
                              {admin.fullName}
                            </div>
                          </td>

                          <td className="px-5 py-4 text-white/45">
                            {admin.username}
                          </td>

                          <td className="px-5 py-4 text-white/45">
                            {admin.mobileNumber}
                          </td>

                          <td className="px-5 py-4">
                            <Badge
                              variant={
                                admin.role === "Super Admin"
                                  ? "default"
                                  : "secondary"
                              }
                              className={
                                admin.role === "Super Admin"
                                  ? "border border-amber-300/20 bg-amber-300/10 text-amber-200"
                                  : "border border-white/10 bg-white/5 text-white/50"
                              }
                            >
                              {admin.role}
                            </Badge>
                          </td>

                          <td className="px-5 py-4">
                            <Badge
                              className={
                                admin.isActive
                                  ? "border border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                                  : "border border-red-400/20 bg-red-400/10 text-red-300"
                              }
                            >
                              {admin.isActive
                                ? "Active"
                                : "Inactive"}
                            </Badge>
                          </td>

                          <td className="px-5 py-4 text-xs text-white/35">
                            {admin.lastLogin
                              ? new Date(
                                  admin.lastLogin
                                ).toLocaleString()
                              : "Never"}
                          </td>

                          <td className="px-5 py-4 text-xs text-white/35">
                            {new Date(
                              admin.createdAt
                            ).toLocaleDateString()}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-1">
                              {admin.role === "Volunteer" && <span className="mr-2 text-xs text-white/40">{(admin.assignedFestivalIds || []).length} festivals · {(admin.assignedEventIds || []).length} events</span>}
                              {admin.role === "Volunteer" && <button onClick={() => openAssignments(admin)} className="rounded-lg p-2 transition-colors hover:bg-emerald-300/10" title="Assignments"><Check className="h-4 w-4 text-emerald-300" /></button>}

                              <button
                                onClick={() =>
                                  openEditForm(admin)
                                }
                                className="rounded-lg p-2 transition-colors hover:bg-amber-300/10"
                                title="Edit"
                              >
                                <Pencil className="h-4 w-4 text-white/40 hover:text-amber-300" />
                              </button>

                              <button
                                onClick={() =>
                                  handleToggleStatus(admin)
                                }
                                className="rounded-lg p-2 transition-colors hover:bg-white/5"
                                title={
                                  admin.isActive
                                    ? "Disable"
                                    : "Enable"
                                }
                              >
                                {admin.isActive ? (
                                  <ToggleRight className="h-4 w-4 text-emerald-400" />
                                ) : (
                                  <ToggleLeft className="h-4 w-4 text-white/30" />
                                )}
                              </button>

                              <button
                                onClick={() => {
                                  setResetPasswordAdmin(admin);
                                  setPasswordForm({
                                    newPassword: "",
                                    confirmPassword: "",
                                  });
                                  clearMessages();
                                }}
                                className="rounded-lg p-2 transition-colors hover:bg-amber-300/10"
                                title="Reset Password"
                              >
                                <Lock className="h-4 w-4 text-amber-300/70 hover:text-amber-300" />
                              </button>

                              {admin.id !== user?.id && (
                                <button
                                  onClick={() =>
                                    handleDelete(admin)
                                  }
                                  className="rounded-lg p-2 transition-colors hover:bg-red-400/10"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4 text-red-400/70 hover:text-red-400" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
