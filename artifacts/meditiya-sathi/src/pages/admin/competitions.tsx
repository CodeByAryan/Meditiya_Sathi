import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Edit, Eye, Images, Play, Plus, StopCircle, Trophy, Users, Vote, X, AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getApiUrl } from "@/lib/utils";
import { useAdminAuth } from "@/lib/AdminAuthContext";

type Competition = {
  id: number;
  name: string;
  category: string;
  description: string;
  rules?: string | null;
  status: string;
  date: string;
  registrationStart?: string | null;
  registrationEnd?: string | null;
  votingStart?: string | null;
  votingEnd?: string | null;
  maxImages: number;
  resultsPublished: number;
  createdAt: string;
  totalEntries?: number;
  pendingEntries?: number;
  approvedEntries?: number;
  rejectedEntries?: number;
  totalVotes?: number;
};

type Entry = {
  id: number;
  title: string;
  description: string;
  status: string;
  reviewNote?: string | null;
  createdAt: string;
  residentName: string;
  mobile?: string;
  flatNo: string;
  buildingName: string;
  wingName?: string | null;
  votes: number;
  images: { imageUrl: string }[];
};

type ResultItem = {
  entryId: number;
  title: string;
  description?: string;
  participantName: string;
  buildingName: string;
  wingName?: string | null;
  flatNo?: string;
  votes: number;
  position: number;
  images: { imageUrl: string }[];
};

type Form = {
  id?: number;
  name: string;
  category: string;
  description: string;
  rules: string;
  date: string;
  registrationStart: string;
  registrationEnd: string;
  votingStart: string;
  votingEnd: string;
  maxImages: string;
};

const blank = (): Form => ({
  name: "",
  category: "Ganpati Decoration",
  description: "",
  rules: "",
  date: "",
  registrationStart: "",
  registrationEnd: "",
  votingStart: "",
  votingEnd: "",
  maxImages: "3",
});

const api = getApiUrl();
const getAuthHeaders = (token?: string): Record<string, string> =>
  token ? { Authorization: `Bearer ${token}` } : {};

const iso = (value: string) => (value ? new Date(value).toISOString() : null);
const formatInputDate = (isoString?: string | null) => {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  } catch {
    return "";
  }
};

export default function AdminCompetitions() {
  const { user } = useAdminAuth();
  const client = useQueryClient();
  const auth = getAuthHeaders(user?.token);

  const [form, setForm] = useState<Form>(blank());
  const [editingComp, setEditingComp] = useState<Competition | null>(null);
  const [formModalOpen, setFormModalOpen] = useState(false);

  const [selectedCompForEntries, setSelectedCompForEntries] = useState<Competition | null>(null);
  const [selectedCompForResults, setSelectedCompForResults] = useState<Competition | null>(null);
  const [deleteModalComp, setDeleteModalComp] = useState<Competition | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => void;
    isLoading?: boolean;
  }>({ open: false, title: "", description: "", action: () => {} });

  const [filter, setFilter] = useState("all");
  const [entryFilter, setEntryFilter] = useState("all");
  const [rejectingEntry, setRejectingEntry] = useState<Entry | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  const competitions = useQuery<Competition[]>({
    queryKey: ["admin-competitions"],
    enabled: !!user?.token,
    queryFn: async () => {
      const r = await fetch(`${api}/api/admin/competitions`, { headers: auth });
      if (!r.ok) throw new Error("Unable to load competitions");
      return r.json();
    },
  });

  const entries = useQuery<Entry[]>({
    queryKey: ["admin-competition-entries", selectedCompForEntries?.id],
    enabled: !!selectedCompForEntries && !!user?.token,
    queryFn: async () => {
      const r = await fetch(`${api}/api/admin/competitions/${selectedCompForEntries!.id}/entries`, { headers: auth });
      if (!r.ok) throw new Error("Unable to load entries");
      return r.json();
    },
  });

  const results = useQuery<ResultItem[]>({
    queryKey: ["admin-competition-results", selectedCompForResults?.id],
    enabled: !!selectedCompForResults && !!user?.token,
    queryFn: async () => {
      const r = await fetch(`${api}/api/admin/competitions/${selectedCompForResults!.id}/results`, { headers: auth });
      if (!r.ok) throw new Error("Unable to load results");
      return r.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = {
        name: form.name,
        category: form.category,
        description: form.description,
        rules: form.rules || null,
        date: iso(form.date) || new Date().toISOString(),
        registrationStart: iso(form.registrationStart),
        registrationEnd: iso(form.registrationEnd),
        votingStart: iso(form.votingStart),
        votingEnd: iso(form.votingEnd),
        maxImages: Number(form.maxImages) || 3,
      };

      const url = editingComp
        ? `${api}/api/admin/competitions/${editingComp.id}`
        : `${api}/api/admin/competitions`;
      const method = editingComp ? "PATCH" : "POST";

      const r = await fetch(url, {
        method,
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || "Unable to save competition");
      return data;
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["admin-competitions"] });
      setFormModalOpen(false);
      setEditingComp(null);
      setForm(blank());
      toast.success(editingComp ? "Competition updated" : "Competition created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const transitionMutation = useMutation({
    mutationFn: async ({ id, endpoint }: { id: number; endpoint: string }) => {
      const r = await fetch(`${api}/api/admin/competitions/${id}/${endpoint}`, {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || "Action failed");
      return data;
    },
    onSuccess: (data) => {
      client.invalidateQueries({ queryKey: ["admin-competitions"] });
      client.invalidateQueries({ queryKey: ["competitions"] });
      client.invalidateQueries({ queryKey: ["competition"] });
      setConfirmDialog((prev) => ({ ...prev, open: false }));
      toast.success(data.message || "Status updated successfully");
    },
    onError: (e: Error) => {
      setConfirmDialog((prev) => ({ ...prev, open: false }));
      toast.error(e.message);
    },
  });

  const entryDecisionMutation = useMutation({
    mutationFn: async ({ entryId, action }: { entryId: number; action: "approve" | "reject" }) => {
      const url = `${api}/api/admin/competitions/${selectedCompForEntries!.id}/entries/${entryId}/${action}`;
      const r = await fetch(url, {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ reviewNote }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || "Unable to update entry");
      return data;
    },
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["admin-competition-entries", selectedCompForEntries?.id] });
      client.invalidateQueries({ queryKey: ["admin-competitions"] });
      client.invalidateQueries({ queryKey: ["competition-entries", String(selectedCompForEntries?.id)] });
      client.invalidateQueries({ queryKey: ["competition-entries"] });
      client.invalidateQueries({ queryKey: ["competitions"] });
      client.invalidateQueries({ queryKey: ["competition"] });
      setRejectingEntry(null);
      setReviewNote("");
      toast.success(variables.action === "approve" ? "Entry approved successfully." : "Entry rejected successfully.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (comp: Competition) => {
      const r = await fetch(`${api}/api/admin/competitions/${comp.id}`, {
        method: "DELETE",
        headers: auth,
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || "Failed to delete competition");
      return data;
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["admin-competitions"] });
      client.invalidateQueries({ queryKey: ["competitions"] });
      client.invalidateQueries({ queryKey: ["competition"] });
      setDeleteModalComp(null);
      toast.success("Competition deleted successfully.");
    },
    onError: (e: Error) => {
      toast.error(e.message || "Failed to delete competition.");
    },
  });

  const openCreateModal = () => {
    setEditingComp(null);
    setForm(blank());
    setFormModalOpen(true);
  };

  const openEditModal = (c: Competition) => {
    setEditingComp(c);
    setForm({
      id: c.id,
      name: c.name,
      category: c.category || "Ganpati Decoration",
      description: c.description || "",
      rules: c.rules || "",
      date: formatInputDate(c.date),
      registrationStart: formatInputDate(c.registrationStart),
      registrationEnd: formatInputDate(c.registrationEnd),
      votingStart: formatInputDate(c.votingStart),
      votingEnd: formatInputDate(c.votingEnd),
      maxImages: String(c.maxImages || 3),
    });
    setFormModalOpen(true);
  };

  const handleStartRegistration = (c: Competition) => {
    setConfirmDialog({
      open: true,
      title: "Start Registration",
      description: `Are you sure you want to start registration for "${c.name}"? Residents will now be able to submit their entries.`,
      action: () => transitionMutation.mutate({ id: c.id, endpoint: "start-registration" }),
    });
  };

  const handleCloseRegistration = (c: Competition) => {
    setConfirmDialog({
      open: true,
      title: "Close Registration",
      description: `Are you sure you want to close registration for "${c.name}"? No new resident entries will be accepted.`,
      action: () => transitionMutation.mutate({ id: c.id, endpoint: "close-registration" }),
    });
  };

  const handleStartVoting = (c: Competition) => {
    setConfirmDialog({
      open: true,
      title: "Start Voting",
      description: `Are you sure you want to start voting for "${c.name}"? Only APPROVED entries will be available for residents to vote on.`,
      action: () => transitionMutation.mutate({ id: c.id, endpoint: "start-voting" }),
    });
  };

  const handleStopVoting = (c: Competition) => {
    setConfirmDialog({
      open: true,
      title: "Stop Voting",
      description: `Are you sure you want to stop voting for "${c.name}"? Voting buttons will be disabled and no more votes will be accepted.`,
      action: () => transitionMutation.mutate({ id: c.id, endpoint: "stop-voting" }),
    });
  };

  const handlePublishResults = (c: Competition) => {
    setConfirmDialog({
      open: true,
      title: "Publish Results",
      description: `Are you sure you want to publish the results for "${c.name}"? The final results will become visible to all residents.`,
      action: () => transitionMutation.mutate({ id: c.id, endpoint: "publish-results" }),
    });
  };

  const shownCompetitions = useMemo(() => {
    const all = competitions.data || [];
    return filter === "all" ? all : all.filter((c) => c.status.toLowerCase() === filter.toLowerCase());
  }, [competitions.data, filter]);

  const shownEntries = useMemo(() => {
    const all = entries.data || [];
    return entryFilter === "all" ? all : all.filter((e) => e.status.toLowerCase() === entryFilter.toLowerCase());
  }, [entries.data, entryFilter]);

  const fieldStyle = "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40";

  return (
    <main className="min-h-screen bg-[var(--page-bg)] pb-16 pt-24 text-foreground">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-primary">Admin Panel</p>
            <h1 className="mt-1 font-serif text-4xl font-semibold">Competition Management</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manually manage competition lifecycles, review resident submissions, and publish winners.
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow transition hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Create Competition
          </button>
        </header>

        {/* Filter Badges */}
        <div className="mb-6 flex flex-wrap gap-2">
          {["all", "draft", "registration_open", "registration_closed", "voting_open", "voting_closed", "completed"].map((x) => (
            <button
              key={x}
              onClick={() => setFilter(x)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition ${
                filter === x ? "bg-primary text-primary-foreground shadow" : "border bg-card text-muted-foreground hover:bg-accent"
              }`}
            >
              {x.replaceAll("_", " ")}
            </button>
          ))}
        </div>

        {/* Competition List */}
        {competitions.isLoading ? (
          <p className="py-16 text-center text-muted-foreground">Loading competitions...</p>
        ) : competitions.isError ? (
          <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center text-destructive">
            Unable to load competitions. Please refresh or try again later.
          </p>
        ) : !shownCompetitions.length ? (
          <div className="rounded-2xl border bg-card p-12 text-center text-muted-foreground">
            <Trophy className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-base font-semibold">No competitions found.</p>
            <p className="mt-1 text-xs">Create a new competition to get started.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {shownCompetitions.map((c) => {
              const status = c.status.toLowerCase();
              return (
                <article key={c.id} className="flex flex-col justify-between rounded-2xl border bg-card p-6 shadow-sm transition hover:shadow-md">
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-primary">{c.category}</p>
                        <h2 className="mt-1 font-serif text-2xl font-bold">{c.name}</h2>
                      </div>
                      <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${
                        status === "draft" ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" :
                        status === "registration_open" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" :
                        status === "registration_closed" ? "bg-blue-500/15 text-blue-600 dark:text-blue-400" :
                        status === "voting_open" ? "bg-purple-500/15 text-purple-600 dark:text-purple-400" :
                        status === "voting_closed" ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400" :
                        "bg-green-600/15 text-green-700 dark:text-green-400"
                      }`}>
                        {status.replaceAll("_", " ")}
                      </span>
                    </div>

                    <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>

                    {/* Key Stats Bar */}
                    <div className="mt-4 grid grid-cols-4 gap-2 rounded-xl bg-accent/40 p-3 text-center text-xs">
                      <div>
                        <span className="block font-bold text-foreground">{c.totalEntries ?? 0}</span>
                        <span className="text-[10px] text-muted-foreground">Total</span>
                      </div>
                      <div>
                        <span className="block font-bold text-amber-600 dark:text-amber-400">{c.pendingEntries ?? 0}</span>
                        <span className="text-[10px] text-muted-foreground">Pending</span>
                      </div>
                      <div>
                        <span className="block font-bold text-emerald-600 dark:text-emerald-400">{c.approvedEntries ?? 0}</span>
                        <span className="text-[10px] text-muted-foreground">Approved</span>
                      </div>
                      <div>
                        <span className="block font-bold text-primary">{c.totalVotes ?? 0}</span>
                        <span className="text-[10px] text-muted-foreground">Votes</span>
                      </div>
                    </div>

                    {/* Dates List */}
                    <div className="mt-4 space-y-1 text-xs text-muted-foreground border-t pt-3">
                      <div>
                        <span className="font-semibold text-foreground">Date:</span> {new Date(c.date).toLocaleDateString()}
                      </div>
                      {c.registrationStart && (
                        <div>
                          <span className="font-semibold text-foreground">Registration:</span>{" "}
                          {new Date(c.registrationStart).toLocaleDateString()} – {c.registrationEnd ? new Date(c.registrationEnd).toLocaleDateString() : "Open"}
                        </div>
                      )}
                      {c.votingStart && (
                        <div>
                          <span className="font-semibold text-foreground">Voting:</span>{" "}
                          {new Date(c.votingStart).toLocaleDateString()} – {c.votingEnd ? new Date(c.votingEnd).toLocaleDateString() : "Open"}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stateful Action Buttons */}
                  <div className="mt-6 flex flex-wrap gap-2 border-t pt-4">
                    {status === "draft" && (
                      <button
                        onClick={() => handleStartRegistration(c)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow hover:bg-emerald-700"
                      >
                        <Play className="h-3.5 w-3.5" />
                        Start Registration
                      </button>
                    )}

                    {status === "registration_open" && (
                      <>
                        <button
                          onClick={() => setSelectedCompForEntries(c)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90"
                        >
                          <Users className="h-3.5 w-3.5" />
                          Manage Entries ({c.pendingEntries ? `${c.pendingEntries} Pending` : c.totalEntries ?? 0})
                        </button>
                        <button
                          onClick={() => handleCloseRegistration(c)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow hover:bg-blue-700"
                        >
                          <StopCircle className="h-3.5 w-3.5" />
                          Close Registration
                        </button>
                      </>
                    )}

                    {status === "registration_closed" && (
                      <>
                        <button
                          onClick={() => setSelectedCompForEntries(c)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90"
                        >
                          <Users className="h-3.5 w-3.5" />
                          Manage Entries
                        </button>
                        <button
                          onClick={() => handleStartVoting(c)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3.5 py-2 text-xs font-bold text-white shadow hover:bg-purple-700"
                        >
                          <Vote className="h-3.5 w-3.5" />
                          Start Voting
                        </button>
                      </>
                    )}

                    {status === "voting_open" && (
                      <>
                        <button
                          onClick={() => setSelectedCompForEntries(c)}
                          className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3.5 py-2 text-xs font-bold text-foreground shadow-sm hover:bg-accent"
                        >
                          <Users className="h-3.5 w-3.5" />
                          Manage Entries
                        </button>
                        <button
                          onClick={() => setSelectedCompForResults(c)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-primary/20 px-3.5 py-2 text-xs font-bold text-primary hover:bg-primary/30"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View Live Votes ({c.totalVotes ?? 0})
                        </button>
                        <button
                          onClick={() => handleStopVoting(c)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow hover:bg-indigo-700"
                        >
                          <StopCircle className="h-3.5 w-3.5" />
                          Stop Voting
                        </button>
                      </>
                    )}

                    {status === "voting_closed" && (
                      <>
                        <button
                          onClick={() => setSelectedCompForResults(c)}
                          className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3.5 py-2 text-xs font-bold text-foreground shadow-sm hover:bg-accent"
                        >
                          <Trophy className="h-3.5 w-3.5 text-amber-500" />
                          View Final Results
                        </button>
                        <button
                          onClick={() => handlePublishResults(c)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow hover:bg-emerald-700"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Publish Results
                        </button>
                      </>
                    )}

                    {status === "completed" && (
                      <button
                        onClick={() => setSelectedCompForResults(c)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600/15 px-3.5 py-2 text-xs font-bold text-emerald-600 hover:bg-emerald-600/25 dark:text-emerald-400"
                      >
                        <Trophy className="h-3.5 w-3.5" />
                        View Published Results
                      </button>
                    )}

                    <button
                      onClick={() => openEditModal(c)}
                      className="inline-flex items-center gap-1 rounded-lg border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground"
                      title="Edit details"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      Edit
                    </button>

                    <button
                      onClick={() => setDeleteModalComp(c)}
                      className="inline-flex items-center gap-1 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/20"
                      title="Delete competition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete Competition
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE / EDIT COMPETITION MODAL */}
      {formModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
          <div className="mx-auto my-8 max-w-2xl rounded-2xl border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-4">
              <h2 className="font-serif text-2xl font-bold">
                {editingComp ? "Edit Competition" : "Create Competition"}
              </h2>
              <button onClick={() => setFormModalOpen(false)} className="rounded-lg p-1 text-muted-foreground hover:bg-accent">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate();
              }}
              className="mt-6 space-y-4"
            >
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">Competition Name</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Best Eco-Friendly Ganpati Decoration 2025"
                  className={fieldStyle}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">Category</label>
                  <input
                    required
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    placeholder="e.g., Decoration / Rangoli"
                    className={fieldStyle}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">Max Images Allowed</label>
                  <select
                    value={form.maxImages}
                    onChange={(e) => setForm({ ...form, maxImages: e.target.value })}
                    className={fieldStyle}
                  >
                    <option value="1">1 Image</option>
                    <option value="2">2 Images</option>
                    <option value="3">3 Images</option>
                    <option value="4">4 Images</option>
                    <option value="5">5 Images</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</label>
                <textarea
                  required
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Briefly describe the competition guidelines, eligibility, etc."
                  className={fieldStyle}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">Rules (Optional)</label>
                <textarea
                  rows={2}
                  value={form.rules}
                  onChange={(e) => setForm({ ...form, rules: e.target.value })}
                  placeholder="Specific guidelines or terms for participants..."
                  className={fieldStyle}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">Competition Date</label>
                  <input
                    type="datetime-local"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className={fieldStyle}
                  />
                </div>
              </div>

              <div className="grid gap-4 rounded-xl border bg-accent/20 p-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">Registration Start Date</label>
                  <input
                    type="datetime-local"
                    value={form.registrationStart}
                    onChange={(e) => setForm({ ...form, registrationStart: e.target.value })}
                    className={fieldStyle}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">Registration End Date</label>
                  <input
                    type="datetime-local"
                    value={form.registrationEnd}
                    onChange={(e) => setForm({ ...form, registrationEnd: e.target.value })}
                    className={fieldStyle}
                  />
                </div>
              </div>

              <div className="grid gap-4 rounded-xl border bg-accent/20 p-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">Voting Start Date</label>
                  <input
                    type="datetime-local"
                    value={form.votingStart}
                    onChange={(e) => setForm({ ...form, votingStart: e.target.value })}
                    className={fieldStyle}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">Voting End Date</label>
                  <input
                    type="datetime-local"
                    value={form.votingEnd}
                    onChange={(e) => setForm({ ...form, votingEnd: e.target.value })}
                    className={fieldStyle}
                  />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Note: Entering dates is for display only. Registration and Voting will NOT open automatically until you manually activate them from the dashboard.
              </p>

              <div className="flex justify-end gap-2 border-t pt-4">
                <button
                  type="button"
                  onClick={() => setFormModalOpen(false)}
                  className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
                >
                  {saveMutation.isPending ? "Saving..." : editingComp ? "Update Competition" : "Create Competition"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG */}
      {confirmDialog.open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-500">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <h3 className="font-serif text-xl font-bold text-foreground">{confirmDialog.title}</h3>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{confirmDialog.description}</p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
                className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={confirmDialog.action}
                disabled={transitionMutation.isPending}
                className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
              >
                {transitionMutation.isPending ? "Processing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE COMPETITION CONFIRMATION DIALOG */}
      {deleteModalComp && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-destructive">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <h3 className="font-serif text-xl font-bold text-foreground">Delete this competition?</h3>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              This will permanently delete the competition and its associated entries, images, votes, and competition data. This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteModalComp(null)}
                disabled={deleteMutation.isPending}
                className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(deleteModalComp)}
                disabled={deleteMutation.isPending}
                className="rounded-lg bg-destructive px-5 py-2 text-sm font-bold text-destructive-foreground shadow hover:bg-destructive/90 disabled:opacity-50"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete Competition"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ENTRIES REVIEW PANEL */}
      {selectedCompForEntries && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
          <div className="mx-auto my-6 max-w-5xl rounded-2xl border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-primary">{selectedCompForEntries.name}</p>
                <h2 className="mt-1 font-serif text-2xl font-bold">Resident Submissions Review</h2>
              </div>
              <button onClick={() => setSelectedCompForEntries(null)} className="rounded-lg p-1 text-muted-foreground hover:bg-accent">
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Entry Filter Tabs */}
            <div className="flex border-b bg-accent/20 px-5 py-2 gap-2">
              {["all", "pending", "approved", "rejected"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setEntryFilter(tab)}
                  className={`rounded-full px-3 py-1 text-xs font-bold capitalize transition ${
                    entryFilter === tab ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-6 space-y-4">
              {entries.isLoading ? (
                <p className="py-12 text-center text-muted-foreground">Loading entries...</p>
              ) : !shownEntries.length ? (
                <p className="py-12 text-center text-muted-foreground">No entries found for this filter.</p>
              ) : (
                shownEntries.map((e) => (
                  <article key={e.id} className="rounded-xl border bg-background p-4 shadow-sm">
                    <div className="flex flex-col gap-4 md:flex-row">
                      {/* Entry Images */}
                      <div className="flex shrink-0 gap-2 overflow-x-auto md:w-48">
                        {e.images?.length ? (
                          e.images.map((img, idx) => (
                            <img
                              key={idx}
                              src={img.imageUrl}
                              alt={e.title}
                              className="h-28 w-28 rounded-lg object-cover border"
                            />
                          ))
                        ) : (
                          <div className="grid h-28 w-28 place-items-center rounded-lg border bg-muted text-xs text-muted-foreground">
                            No Image
                          </div>
                        )}
                      </div>

                      {/* Entry Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="font-semibold text-lg">{e.title}</h3>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              e.status === "approved"
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                : e.status === "rejected"
                                ? "bg-red-500/15 text-red-600 dark:text-red-400"
                                : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {e.status}
                          </span>
                        </div>

                        <p className="mt-1 text-sm text-muted-foreground">{e.description}</p>

                        <div className="mt-3 rounded-lg border bg-accent/20 p-3 text-xs">
                          <p className="font-bold uppercase tracking-wider text-muted-foreground text-[10px] mb-1.5">Participant Information</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 text-muted-foreground">
                            <div>
                              <strong className="text-foreground">Name:</strong> {e.residentName}
                            </div>
                            <div>
                              <strong className="text-foreground">Mobile:</strong> {e.mobile || "N/A"}
                            </div>
                            <div>
                              <strong className="text-foreground">Building:</strong> {e.buildingName}
                            </div>
                            <div>
                              <strong className="text-foreground">Wing:</strong> {e.wingName || "N/A"}
                            </div>
                            <div>
                              <strong className="text-foreground">Flat:</strong> {e.flatNo}
                            </div>
                            <div>
                              <strong className="text-foreground">Submitted:</strong> {new Date(e.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>

                        {e.reviewNote && (
                          <p className="mt-2 text-xs italic text-muted-foreground bg-accent/30 p-2 rounded">
                            Review Note: {e.reviewNote}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex shrink-0 items-center gap-2 border-t pt-3 md:border-l md:border-t-0 md:pl-4 md:pt-0">
                        {e.status === "pending" && (
                          <>
                            <button
                              onClick={() => entryDecisionMutation.mutate({ entryId: e.id, action: "approve" })}
                              disabled={entryDecisionMutation.isPending}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-700 disabled:opacity-50"
                            >
                              <Check className="h-3.5 w-3.5" />
                              Approve
                            </button>
                            <button
                              onClick={() => setRejectingEntry(e)}
                              disabled={entryDecisionMutation.isPending}
                              className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-red-700 disabled:opacity-50"
                            >
                              <X className="h-3.5 w-3.5" />
                              Reject
                            </button>
                          </>
                        )}

                        {e.status === "approved" && (
                          <button
                            onClick={() => setRejectingEntry(e)}
                            className="text-xs text-red-500 hover:underline"
                          >
                            Revoke / Reject
                          </button>
                        )}

                        {e.status === "rejected" && (
                          <button
                            onClick={() => entryDecisionMutation.mutate({ entryId: e.id, action: "approve" })}
                            className="text-xs text-emerald-500 hover:underline"
                          >
                            Re-approve
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* REJECT NOTE DIALOG */}
      {rejectingEntry && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl">
            <h3 className="font-serif text-xl font-bold">Reject Submission</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Optionally provide a reason for rejecting "{rejectingEntry.title}".
            </p>
            <textarea
              rows={3}
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder="Reason for rejection (e.g. invalid photo, duplicate)..."
              className={`${fieldStyle} mt-4`}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setRejectingEntry(null);
                  setReviewNote("");
                }}
                className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={() => entryDecisionMutation.mutate({ entryId: rejectingEntry.id, action: "reject" })}
                disabled={entryDecisionMutation.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-red-700 disabled:opacity-50"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESULTS MODAL */}
      {selectedCompForResults && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
          <div className="mx-auto my-6 max-w-4xl rounded-2xl border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-primary">{selectedCompForResults.name}</p>
                <h2 className="mt-1 font-serif text-2xl font-bold">Competition Results & Rankings</h2>
              </div>
              <button onClick={() => setSelectedCompForResults(null)} className="rounded-lg p-1 text-muted-foreground hover:bg-accent">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-6 space-y-4">
              {results.isLoading ? (
                <p className="py-12 text-center text-muted-foreground">Loading results...</p>
              ) : !results.data?.length ? (
                <p className="py-12 text-center text-muted-foreground">No approved entries or votes available yet.</p>
              ) : (
                results.data.map((r) => (
                  <article
                    key={r.entryId}
                    className={`flex items-center justify-between rounded-xl border p-4 transition ${
                      r.position === 1 ? "border-amber-500/50 bg-amber-500/10" :
                      r.position === 2 ? "border-slate-400/50 bg-slate-400/10" :
                      r.position === 3 ? "border-amber-700/50 bg-amber-700/10" :
                      "bg-background"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="grid h-12 w-12 place-items-center rounded-full font-serif text-xl font-bold bg-accent">
                        {r.position === 1 ? "🏆" : r.position === 2 ? "🥈" : r.position === 3 ? "🥉" : `#${r.position}`}
                      </div>

                      {r.images?.[0]?.imageUrl && (
                        <img src={r.images[0].imageUrl} alt={r.title} className="h-16 w-16 rounded-lg object-cover border" />
                      )}

                      <div>
                        <h4 className="font-bold text-base">{r.title}</h4>
                        <p className="text-xs text-muted-foreground">
                          {r.participantName} · {r.buildingName}{r.wingName ? ` / ${r.wingName}` : ""} {r.flatNo ? `Flat ${r.flatNo}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-serif text-2xl font-bold text-primary">{r.votes}</span>
                      <span className="block text-[10px] font-semibold uppercase text-muted-foreground">Votes</span>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
