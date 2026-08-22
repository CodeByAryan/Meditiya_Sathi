import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  UserPlus,
  Pencil,
  Trash2,
  Upload,
  X,
  Phone,
  Briefcase,
  Sparkles,
  AlertCircle,
  Hash,
  ArrowUpDown,
  Check,
} from "lucide-react";
import { toast } from "sonner";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface VolunteerItem {
  id: number;
  name: string;
  photo?: string | null;
  photoUrl?: string | null;
  mobileNumber?: string | null;
  phone?: string | null;
  position?: string | null;
  role?: string | null;
  displayPosition: number;
  status?: string;
  createdAt?: string;
}

interface VolunteerFormData {
  name: string;
  mobileNumber: string;
  position: string;
  displayPosition: number;
}

const emptyForm = (nextPos: number): VolunteerFormData => ({
  name: "",
  mobileNumber: "",
  position: "",
  displayPosition: nextPos,
});

function getAuthHeaders(token?: string): Record<string, string> {
  if (token) {
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }
  const stored = localStorage.getItem("admin_auth");
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed?.token) {
        return {
          Authorization: `Bearer ${parsed.token}`,
          "Content-Type": "application/json",
        };
      }
    } catch {}
  }
  return { "Content-Type": "application/json" };
}

export default function AdminVolunteersCrud() {
  const { user, isSuperAdmin } = useAdminAuth();
  const queryClient = useQueryClient();

  const [openForm, setOpenForm] = useState(false);
  const [editingVolunteer, setEditingVolunteer] = useState<VolunteerItem | null>(null);
  const [deletingVolunteer, setDeletingVolunteer] = useState<VolunteerItem | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [formData, setFormData] = useState<VolunteerFormData>(emptyForm(1));

  const getLatestHeaders = useCallback((): Record<string, string> => {
    return getAuthHeaders(user?.token);
  }, [user?.token]);

  // Fetch volunteers list
  const {
    data: volunteers = [],
    isLoading,
    isError,
  } = useQuery<VolunteerItem[]>({
    queryKey: ["volunteers"],
    queryFn: async () => {
      const activeHeaders = getLatestHeaders();
      const res = await fetch(`${getApiUrl()}/api/admin/volunteers`, { headers: activeHeaders });
      if (!res.ok) {
        // Fallback to public list if admin query fails
        const fallbackRes = await fetch(`${getApiUrl()}/api/volunteers`);
        if (!fallbackRes.ok) throw new Error("Failed to load volunteers");
        return fallbackRes.json();
      }
      return res.json();
    },
  });

  const refreshAll = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["volunteers"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/volunteers"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-volunteers"] }),
    ]);
  }, [queryClient]);

  const closeDialog = () => {
    setOpenForm(false);
    setEditingVolunteer(null);
    setFile(null);
    setPhotoPreview(null);
    setFormData(emptyForm(volunteers.length + 1));
  };

  const openCreateDialog = () => {
    setEditingVolunteer(null);
    setFile(null);
    setPhotoPreview(null);
    setFormData(emptyForm(volunteers.length + 1));
    setOpenForm(true);
  };

  const openEditDialog = (item: VolunteerItem) => {
    setEditingVolunteer(item);
    setFile(null);
    setPhotoPreview(item.photo || item.photoUrl || null);
    setFormData({
      name: item.name || "",
      mobileNumber: item.mobileNumber || item.phone || "",
      position: item.position || item.role || "",
      displayPosition: item.displayPosition || 1,
    });
    setOpenForm(true);
  };

  const handlePhotoSelect = (selected?: File) => {
    if (!selected) return;
    if (!/image\/(jpeg|png|webp)/.test(selected.type)) {
      toast.error("Please upload a JPG, PNG, or WEBP image.");
      return;
    }
    if (selected.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5 MB.");
      return;
    }
    setFile(selected);
    setPhotoPreview(URL.createObjectURL(selected));
  };

  // Upload photo mutation
  const uploadPhotoMutation = useMutation({
    mutationFn: async (uploadFile: File): Promise<string> => {
      const data = new FormData();
      data.append("image", uploadFile);

      const activeHeaders = getLatestHeaders();
      const authHeader = activeHeaders.Authorization || "";

      const res = await fetch(`${getApiUrl()}/api/admin/uploads/volunteer-photo`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
        },
        body: data,
      });

      if (!res.ok) {
        // Fallback to event-image upload endpoint
        const fallbackRes = await fetch(`${getApiUrl()}/api/admin/uploads/event-image`, {
          method: "POST",
          headers: {
            Authorization: authHeader,
          },
          body: data,
        });
        const fallbackData = await fallbackRes.json().catch(() => ({}));
        if (!fallbackRes.ok) {
          throw new Error(fallbackData.error || "Unable to upload volunteer photo.");
        }
        return fallbackData.secureUrl || fallbackData.secure_url;
      }

      const result = await res.json();
      return result.secureUrl || result.secure_url;
    },
  });

  // Save (create or update) volunteer mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const name = formData.name.trim();
      const mobileNumber = formData.mobileNumber.trim();
      const position = formData.position.trim();

      if (!name) throw new Error("Please enter the volunteer's name.");
      if (!editingVolunteer && !file && !photoPreview) {
        throw new Error("Please upload the volunteer's photo.");
      }
      if (!mobileNumber) throw new Error("Please enter the volunteer's mobile number.");
      if (!position) throw new Error("Please enter the volunteer's position.");

      let photo = editingVolunteer?.photo || editingVolunteer?.photoUrl || null;
      if (file) {
        photo = await uploadPhotoMutation.mutateAsync(file);
      }

      const payload = {
        name,
        photo,
        mobileNumber,
        position,
        displayPosition: Number(formData.displayPosition) || 1,
      };

      const url = editingVolunteer
        ? `${getApiUrl()}/api/admin/volunteers/${editingVolunteer.id}`
        : `${getApiUrl()}/api/admin/volunteers`;

      const method = editingVolunteer ? "PUT" : "POST";
      const activeHeaders = getLatestHeaders();

      const res = await fetch(url, {
        method,
        headers: activeHeaders,
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Unable to save volunteer.");
      }
      return data;
    },
    onSuccess: async () => {
      await refreshAll();
      toast.success(
        editingVolunteer
          ? "Volunteer updated successfully."
          : "Volunteer added successfully."
      );
      closeDialog();
    },
    onError: (err: Error) => {
      toast.error(err.message || "An error occurred.");
    },
  });

  // Delete volunteer mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const activeHeaders = getLatestHeaders();
      const res = await fetch(`${getApiUrl()}/api/admin/volunteers/${id}`, {
        method: "DELETE",
        headers: activeHeaders,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Unable to delete volunteer.");
      }
    },
    onSuccess: async () => {
      await refreshAll();
      toast.success("Volunteer deleted successfully.");
      setDeletingVolunteer(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to delete volunteer.");
    },
  });

  const positionOptions = useMemo(() => {
    const total = editingVolunteer ? volunteers.length : volunteers.length + 1;
    const count = Math.max(1, total);
    return Array.from({ length: count }, (_, i) => i + 1);
  }, [volunteers.length, editingVolunteer]);

  if (!isSuperAdmin) {
    return (
      <div className="relative min-h-screen w-full overflow-hidden bg-[#080808] text-white">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-amber-400/10 blur-[140px]" />
        <div className="relative z-10 mx-auto max-w-4xl px-4 py-24 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-red-400/20 bg-red-400/10">
            <AlertCircle className="h-9 w-9 text-red-400" />
          </div>
          <h2 className="mt-6 text-2xl font-semibold">Access Restricted</h2>
          <p className="mt-2 text-white/50">
            Only Super Admins can manage volunteers and change display positions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#080808] pb-24 text-white">
      {/* Background glow */}
      <div className="pointer-events-none absolute -top-48 left-1/2 h-[650px] w-[900px] -translate-x-1/2 rounded-full bg-amber-400/10 blur-[150px]" />
      <div className="pointer-events-none absolute left-[10%] top-[20%] h-[350px] w-[350px] rounded-full bg-orange-400/[0.035] blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-[650px] w-[1000px] -translate-x-1/2 rounded-full bg-black blur-[130px]" />

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 bg-gradient-to-b from-amber-400/[0.10] via-black/20 to-transparent">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/10 shadow-[0_0_40px_rgba(251,191,36,0.10)]">
                <Users className="h-7 w-7 text-amber-300" />
              </div>
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-300/70">
                    Administration
                  </span>
                </div>
                <h1 className="text-3xl font-serif font-semibold tracking-tight text-white">
                  Volunteer Management
                </h1>
                <p className="mt-1 text-sm text-white/45">
                  Manage the people who represent and support the Meditiya community.
                </p>
              </div>
            </div>

            <Button
              onClick={openCreateDialog}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-amber-200/20 bg-gradient-to-r from-amber-300/20 via-amber-300/30 to-amber-400/20 px-5 text-sm font-semibold text-amber-200 backdrop-blur-xl transition-all hover:border-amber-300/50 hover:bg-amber-300/30 hover:text-white hover:shadow-[0_0_25px_rgba(251,191,36,0.2)]"
            >
              <UserPlus className="h-4 w-4" />
              Add Volunteer
            </Button>
          </div>

          {/* Stats Bar */}
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 backdrop-blur-xl">
              <p className="text-[10px] uppercase tracking-wider text-white/40">Total Volunteers</p>
              <p className="mt-1 text-2xl font-semibold text-white">{volunteers.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 backdrop-blur-xl">
              <p className="text-[10px] uppercase tracking-wider text-white/40">Active Display</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-300">{volunteers.length}</p>
            </div>
            <div className="col-span-2 sm:col-span-1 rounded-2xl border border-white/10 bg-white/[0.035] p-4 backdrop-blur-xl">
              <p className="text-[10px] uppercase tracking-wider text-white/40">Role Access</p>
              <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-amber-300">
                <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                Super Admin Only
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main List */}
      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section>
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-300/70">
                Directory
              </p>
              <h2 className="mt-1 text-2xl font-serif font-semibold text-white">
                All Volunteers
              </h2>
              <p className="mt-1 text-sm text-white/40">
                Ordered by public display position. Drag or edit display order to adjust positioning.
              </p>
            </div>
          </div>

          <Card className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] shadow-[0_25px_100px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-16 text-center text-sm text-white/40">
                  <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-amber-300 border-t-transparent" />
                  Loading volunteers...
                </div>
              ) : isError ? (
                <div className="p-16 text-center text-sm text-red-400">
                  <AlertCircle className="mx-auto mb-2 h-8 w-8 text-red-400" />
                  Unable to load volunteers. Please refresh or try again.
                </div>
              ) : volunteers.length === 0 ? (
                <div className="p-16 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-300/15 bg-amber-300/5">
                    <Users className="h-8 w-8 text-amber-300/60" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-white">No Volunteers Found</h3>
                  <p className="mt-1 text-sm text-white/40 max-w-md mx-auto">
                    Click "Add Volunteer" above to introduce your first community volunteer.
                  </p>
                  <Button
                    onClick={openCreateDialog}
                    className="mt-6 rounded-full bg-amber-300 px-6 font-semibold text-black hover:bg-amber-400"
                  >
                    + Add Volunteer
                  </Button>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10 bg-white/[0.025]">
                          <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/40">
                            Pos
                          </th>
                          <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/40">
                            Volunteer
                          </th>
                          <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/40">
                            Position
                          </th>
                          <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/40">
                            Contact
                          </th>
                          <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wider text-white/40">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {volunteers.map((vol) => {
                          const photoSrc = vol.photo || vol.photoUrl;
                          const phoneNum = vol.mobileNumber || vol.phone;
                          const posTitle = vol.position || vol.role;

                          return (
                            <tr
                              key={vol.id}
                              className="border-b border-white/[0.06] transition-colors hover:bg-amber-300/[0.025]"
                            >
                              <td className="px-5 py-4">
                                <Badge className="border border-amber-300/20 bg-amber-300/10 text-amber-300 font-mono text-xs">
                                  #{vol.displayPosition}
                                </Badge>
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5">
                                    {photoSrc ? (
                                      <img
                                        src={photoSrc}
                                        alt={vol.name}
                                        className="h-full w-full object-cover"
                                        onError={(e) => {
                                          (e.currentTarget as HTMLImageElement).style.display = "none";
                                        }}
                                      />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center font-bold text-amber-300 bg-amber-300/10">
                                        {vol.name?.slice(0, 2).toUpperCase()}
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-white">{vol.name}</p>
                                    <p className="text-xs text-white/40">ID: {vol.id}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-4">
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/80">
                                  <Briefcase className="h-3 w-3 text-amber-300" />
                                  {posTitle}
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                {phoneNum ? (
                                  <a
                                    href={`tel:${phoneNum}`}
                                    className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-amber-300 transition-colors"
                                  >
                                    <Phone className="h-3.5 w-3.5 text-amber-300/70" />
                                    {phoneNum}
                                  </a>
                                ) : (
                                  <span className="text-xs text-white/30">—</span>
                                )}
                              </td>
                              <td className="px-5 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => openEditDialog(vol)}
                                    className="rounded-lg p-2 text-white/50 transition-colors hover:bg-amber-300/10 hover:text-amber-300"
                                    title="Edit Volunteer"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => setDeletingVolunteer(vol)}
                                    className="rounded-lg p-2 text-red-400/70 transition-colors hover:bg-red-400/10 hover:text-red-400"
                                    title="Delete Volunteer"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="grid gap-3 p-4 md:hidden">
                    {volunteers.map((vol) => {
                      const photoSrc = vol.photo || vol.photoUrl;
                      const phoneNum = vol.mobileNumber || vol.phone;
                      const posTitle = vol.position || vol.role;

                      return (
                        <div
                          key={vol.id}
                          className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.025] p-4"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5">
                              {photoSrc ? (
                                <img
                                  src={photoSrc}
                                  alt={vol.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center font-bold text-amber-300 bg-amber-300/10">
                                  {vol.name?.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-bold text-amber-300">
                                  #{vol.displayPosition}
                                </span>
                                <h3 className="truncate font-semibold text-white">{vol.name}</h3>
                              </div>
                              <p className="mt-0.5 text-xs text-white/50 truncate">{posTitle}</p>
                              {phoneNum && (
                                <a
                                  href={`tel:${phoneNum}`}
                                  className="mt-1 inline-flex items-center gap-1 text-[11px] text-amber-300/80"
                                >
                                  <Phone className="h-3 w-3" /> {phoneNum}
                                </a>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            <button
                              onClick={() => openEditDialog(vol)}
                              className="rounded-lg p-2 text-white/50 hover:text-amber-300"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeletingVolunteer(vol)}
                              className="rounded-lg p-2 text-red-400/70 hover:text-red-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {openForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-[#111111] shadow-[0_25px_80px_rgba(0,0,0,0.6)] text-white my-8"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 bg-amber-300/[0.04] p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-300/20 bg-amber-300/10">
                    {editingVolunteer ? (
                      <Pencil className="h-5 w-5 text-amber-300" />
                    ) : (
                      <UserPlus className="h-5 w-5 text-amber-300" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-bold text-white">
                      {editingVolunteer ? "Edit Volunteer" : "Add Volunteer"}
                    </h3>
                    <p className="text-xs text-white/45">
                      {editingVolunteer
                        ? "Update volunteer information and display order."
                        : "Add a new volunteer representing Meditiya Nagar."}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeDialog}
                  className="rounded-lg p-2 text-white/40 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form body */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveMutation.mutate();
                }}
                className="space-y-5 p-5 sm:p-6"
              >
                {/* Photo Upload with Preview */}
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/60">
                    Volunteer Photo *
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-2 border-dashed border-white/20 bg-white/[0.03]">
                      {photoPreview ? (
                        <img
                          src={photoPreview}
                          alt="Preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center p-2 text-center text-white/30">
                          <Users className="h-7 w-7 text-white/20 mb-1" />
                          <span className="text-[10px]">No Photo</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-300/20 transition-all">
                        <Upload className="h-4 w-4" />
                        {photoPreview ? "Change Photo" : "Upload Photo"}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={(e) => handlePhotoSelect(e.target.files?.[0])}
                        />
                      </label>
                      {photoPreview && (
                        <button
                          type="button"
                          onClick={() => {
                            setFile(null);
                            setPhotoPreview(null);
                          }}
                          className="text-left text-xs text-red-400/80 hover:text-red-400"
                        >
                          Remove photo
                        </button>
                      )}
                      <small className="text-[11px] text-white/35">
                        JPG, PNG, or WEBP · up to 5 MB
                      </small>
                    </div>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/60">
                    Full Name *
                  </label>
                  <Input
                    required
                    placeholder="e.g. Aryan Palekar"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="border-white/10 bg-white/[0.04] text-white placeholder:text-white/25 focus:border-amber-300/50"
                  />
                </div>

                {/* Mobile Number */}
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/60">
                    Mobile Number *
                  </label>
                  <Input
                    required
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={formData.mobileNumber}
                    onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                    className="border-white/10 bg-white/[0.04] text-white placeholder:text-white/25 focus:border-amber-300/50"
                  />
                </div>

                {/* Position */}
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/60">
                    Position *
                  </label>
                  <Input
                    required
                    placeholder="e.g. Event Coordinator, Treasurer, Cultural Lead"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="border-white/10 bg-white/[0.04] text-white placeholder:text-white/25 focus:border-amber-300/50"
                  />
                </div>

                {/* Display Position Dropdown */}
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/60">
                    Display Position *
                  </label>
                  <select
                    value={formData.displayPosition}
                    onChange={(e) =>
                      setFormData({ ...formData, displayPosition: Number(e.target.value) })
                    }
                    className="h-10 w-full rounded-md border border-white/10 bg-[#1a1a1a] px-3 text-sm text-white outline-none focus:border-amber-300/50"
                  >
                    {positionOptions.map((pos) => (
                      <option key={pos} value={pos} className="bg-[#111]">
                        Position {pos} {pos === 1 ? "(Top / First)" : ""}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[11px] text-white/35">
                    Determines where this card appears on the homepage and public listing.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeDialog}
                    className="rounded-full border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={saveMutation.isPending || uploadPhotoMutation.isPending}
                    className="rounded-full bg-gradient-to-r from-amber-200 via-orange-300 to-amber-400 px-6 font-semibold text-black shadow-[0_0_25px_rgba(251,191,36,0.15)] hover:brightness-110"
                  >
                    {saveMutation.isPending || uploadPhotoMutation.isPending
                      ? "Saving..."
                      : editingVolunteer
                      ? "Update Volunteer"
                      : "Add Volunteer"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Alert */}
      <AlertDialog
        open={!!deletingVolunteer}
        onOpenChange={(open) => {
          if (!open) setDeletingVolunteer(null);
        }}
      >
        <AlertDialogContent className="border-white/10 bg-[#141414] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-400">
              <Trash2 className="h-5 w-5" /> Delete Volunteer?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Are you sure you want to remove{" "}
              <strong className="text-white">{deletingVolunteer?.name}</strong> from the volunteer
              team? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 bg-white/[0.05] text-white hover:bg-white/10">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingVolunteer) {
                  deleteMutation.mutate(deletingVolunteer.id);
                }
              }}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              Delete Volunteer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
