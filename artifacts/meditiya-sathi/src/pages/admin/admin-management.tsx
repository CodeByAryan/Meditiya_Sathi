import { useState, useEffect, useCallback } from "react";
import { Shield, UserPlus, Settings, ToggleLeft, ToggleRight, Lock, Trash2, Pencil, X, Check, AlertCircle } from "lucide-react";
import { useAdminAuth } from "@/lib/AdminAuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Admin {
  id: number;
  fullName: string;
  username: string;
  email?: string | null;
  mobileNumber: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLogin: string | null;
}

function getAuthHeaders(): Record<string, string> {
  const stored = localStorage.getItem("admin_auth");
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return { Authorization: `Bearer ${parsed.token}`, "Content-Type": "application/json" };
    } catch {}
  }
  return { "Content-Type": "application/json" };
}

export default function AdminManagement() {
  const { user, isSuperAdmin } = useAdminAuth();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editAdmin, setEditAdmin] = useState<Admin | null>(null);
  const [resetPasswordAdmin, setResetPasswordAdmin] = useState<Admin | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    mobileNumber: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "Admin",
    isActive: true,
  });
  const [passwordForm, setPasswordForm] = useState({ newPassword: "", confirmPassword: "" });

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/manage", { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAdmins(data);
      }
    } catch (err) {
      console.error("Failed to fetch admins:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

  const resetForm = () => {
    setFormData({ fullName: "", username: "", mobileNumber: "", email: "", password: "", confirmPassword: "", role: "Admin", isActive: true });
    setShowAddForm(false);
    setEditAdmin(null);
    setError(null);
    setSuccess(null);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/manage", {
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
      fetchAdmins();
    } catch (err: any) {
      setError(err?.message || "Failed to create admin");
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAdmin) return;
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/admin/manage/${editAdmin.id}`, {
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
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update admin");
        return;
      }
      setSuccess("Admin updated successfully");
      resetForm();
      fetchAdmins();
    } catch (err: any) {
      setError(err?.message || "Failed to update admin");
    }
  };

  const handleToggleStatus = async (admin: Admin) => {
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/admin/manage/${admin.id}/status`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ isActive: !admin.isActive }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to toggle status");
        return;
      }
      setSuccess(`${admin.fullName} is now ${data.isActive ? "enabled" : "disabled"}`);
      fetchAdmins();
    } catch (err: any) {
      setError(err?.message || "Failed to toggle status");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordAdmin) return;
    setError(null);
    setSuccess(null);
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    try {
      const res = await fetch(`/api/admin/manage/${resetPasswordAdmin.id}/reset-password`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify(passwordForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to reset password");
        return;
      }
      setSuccess("Password reset successfully");
      setResetPasswordAdmin(null);
      setPasswordForm({ newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      setError(err?.message || "Failed to reset password");
    }
  };

  const handleDelete = async (admin: Admin) => {
    if (!confirm(`Are you sure you want to delete admin "${admin.fullName}"?`)) return;
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/admin/manage/${admin.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to delete admin");
        return;
      }
      setSuccess("Admin deleted successfully");
      fetchAdmins();
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
  };

  if (!isSuperAdmin) {
    return (
      <div className="w-full min-h-screen bg-muted/10 pb-20">
        <div className="bg-secondary text-secondary-foreground py-8 px-4 border-b border-border shadow-sm">
          <div className="container mx-auto max-w-6xl">
            <h1 className="text-3xl font-serif font-bold text-white flex items-center gap-3">
              <Shield className="w-8 h-8" /> Admin Management
            </h1>
          </div>
        </div>
        <div className="container mx-auto max-w-6xl px-4 py-20 text-center">
          <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground">Access Restricted</h2>
          <p className="text-muted-foreground mt-2">Only Super Admins can access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-muted/10 pb-20">
      <div className="bg-secondary text-secondary-foreground py-8 px-4 border-b border-border shadow-sm">
        <div className="container mx-auto max-w-6xl flex items-center justify-between">
          <h1 className="text-3xl font-serif font-bold text-white flex items-center gap-3">
            <Shield className="w-8 h-8" /> Admin Management
          </h1>
          <Button onClick={() => { resetForm(); setShowAddForm(!showAddForm); }} className="flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> {showAddForm ? "Cancel" : "Add Admin"}
          </Button>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 py-8">
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}
        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-sm rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
            <Check className="w-4 h-4" /> {success}
          </div>
        )}

        {/* Add / Edit Form */}
        {(showAddForm || editAdmin) && (
          <Card className="mb-8 border-primary/30">
            <CardHeader>
              <CardTitle>{editAdmin ? "Edit Admin" : "Add New Admin"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={editAdmin ? handleEdit : handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Full Name *</label>
                  <Input value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Username *</label>
                  <Input value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Mobile Number *</label>
                  <Input value={formData.mobileNumber} onChange={e => setFormData({...formData, mobileNumber: e.target.value})} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                {!editAdmin && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">Password *</label>
                      <Input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required={!editAdmin} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Confirm Password *</label>
                      <Input type="password" value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} required={!editAdmin} />
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1">Role</label>
                  <select
                    value={formData.role}
                    onChange={e => setFormData({...formData, role: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                  >
                    <option value="Admin">Admin</option>
                    <option value="Super Admin">Super Admin</option>
                  </select>
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <label className="text-sm font-medium">Active</label>
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, isActive: !formData.isActive})}
                    className={`px-3 py-1 rounded-lg text-xs font-bold ${formData.isActive ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'}`}
                  >
                    {formData.isActive ? "Active" : "Inactive"}
                  </button>
                </div>
                <div className="flex items-end gap-3 pt-6 md:col-span-2">
                  <Button type="submit">{editAdmin ? "Update Admin" : "Create Admin"}</Button>
                  <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Reset Password Modal */}
        {resetPasswordAdmin && (
          <Card className="mb-8 border-amber-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" /> Reset Password for {resetPasswordAdmin.fullName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleResetPassword} className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg">
                <div>
                  <label className="block text-sm font-medium mb-1">New Password *</label>
                  <Input type="password" value={passwordForm.newPassword} onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Confirm Password *</label>
                  <Input type="password" value={passwordForm.confirmPassword} onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})} required />
                </div>
                <div className="flex gap-3 md:col-span-2">
                  <Button type="submit">Reset Password</Button>
                  <Button type="button" variant="outline" onClick={() => { setResetPasswordAdmin(null); setPasswordForm({ newPassword: "", confirmPassword: "" }); }}>Cancel</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Admins Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading admins...</div>
            ) : admins.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No admins found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-4 py-3 font-medium">Name</th>
                      <th className="text-left px-4 py-3 font-medium">Username</th>
                      <th className="text-left px-4 py-3 font-medium">Mobile</th>
                      <th className="text-left px-4 py-3 font-medium">Role</th>
                      <th className="text-left px-4 py-3 font-medium">Status</th>
                      <th className="text-left px-4 py-3 font-medium">Last Login</th>
                      <th className="text-left px-4 py-3 font-medium">Created</th>
                      <th className="text-right px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admins.map((admin) => (
                      <tr key={admin.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{admin.fullName}</div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{admin.username}</td>
                        <td className="px-4 py-3 text-muted-foreground">{admin.mobileNumber}</td>
                        <td className="px-4 py-3">
                          <Badge variant={admin.role === "Super Admin" ? "default" : "secondary"}>
                            {admin.role}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={admin.isActive ? "default" : "destructive"}>
                            {admin.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {admin.lastLogin ? new Date(admin.lastLogin).toLocaleString() : "Never"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {new Date(admin.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditForm(admin)}
                              className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4 text-muted-foreground" />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(admin)}
                              className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                              title={admin.isActive ? "Disable" : "Enable"}
                            >
                              {admin.isActive ?
                                <ToggleRight className="w-4 h-4 text-emerald-500" /> :
                                <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                              }
                            </button>
                            <button
                              onClick={() => { setResetPasswordAdmin(admin); setPasswordForm({ newPassword: "", confirmPassword: "" }); }}
                              className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                              title="Reset Password"
                            >
                              <Lock className="w-4 h-4 text-amber-500" />
                            </button>
                            {admin.id !== user?.id && (
                              <button
                                onClick={() => handleDelete(admin)}
                                className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
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
      </div>
    </div>
  );
}
