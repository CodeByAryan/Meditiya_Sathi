import { useState, useEffect, useCallback } from 'react';
import { Link } from 'wouter';
import {
  ArrowLeft,
  Plus,
  Search,
  Eye,
  Edit3,
  Trash2,
  CalendarDays,
  MapPin,
  Filter,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  IndianRupee,
  Users,
  Wallet,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn, getApiUrl } from '@/lib/utils';
import { useAdminAuth } from '@/lib/AdminAuthContext';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Festival {
  id: number;
  name: string;
  slug: string;
  description: string;
  year: number;
  startDate: string;
  endDate: string;
  expectedDonation: string | null;
  status: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;

  totalCollection: number;
  totalEntries: number;
  residentsPaid: number;
  residentsPending: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth helpers
// ─────────────────────────────────────────────────────────────────────────────

function getAdminToken(): string | null {
  try {
    const stored = localStorage.getItem('admin_auth');

    if (!stored) return null;

    const parsed = JSON.parse(stored);

    return parsed?.token || null;
  } catch {
    return null;
  }
}

function authHeaders(): Record<string, string> {
  const token = getAdminToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';

  try {
    const d = new Date(dateStr);

    if (Number.isNaN(d.getTime())) return dateStr;

    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// Gold / Black status styles
// ─────────────────────────────────────────────────────────────────────────────

const statusColors: Record<string, string> = {
  upcoming:
    'text-[#D4AF37] bg-[#D4AF37]/10 border-[#D4AF37]/25',

  active:
    'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',

  completed:
    'text-zinc-400 bg-zinc-500/10 border-zinc-500/25',
};

const statusIcons: Record<string, any> = {
  upcoming: Clock,
  active: CheckCircle,
  completed: XCircle,
};

// ─────────────────────────────────────────────────────────────────────────────
// Delete Confirmation Dialog
// ─────────────────────────────────────────────────────────────────────────────

function DeleteConfirmDialog({
  festival,
  onConfirm,
  onCancel,
  isLoading,
}: {
  festival: Festival;
  onConfirm: (force: boolean) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [forceDelete, setForceDelete] = useState(false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={onCancel}
    >
      <div
        className="bg-[#0d0d0d] border border-[#D4AF37]/30 rounded-2xl shadow-2xl shadow-black/50 max-w-sm w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gold top line */}
        <div className="h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />

        <div className="p-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-red-400" />
          </div>

          <h3 className="text-lg font-bold text-white mb-2">
            Delete Festival?
          </h3>

          <p className="text-sm text-zinc-400 mb-1">
            Are you sure you want to delete
          </p>

          <p className="text-sm font-bold text-[#D4AF37]">
            {festival.name} ({festival.year})?
          </p>

          {festival.totalEntries > 0 && (
            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-left">
              <p className="text-xs text-amber-400 font-semibold">
                This festival has {festival.totalEntries} donation record(s).
                All related data will be permanently deleted.
              </p>

              <label className="flex items-center gap-2 mt-3 text-xs text-amber-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={forceDelete}
                  onChange={(e) => setForceDelete(e.target.checked)}
                  className="rounded border-amber-500/40 bg-black"
                />

                <span>I understand and want to proceed</span>
              </label>
            </div>
          )}

          <p className="text-xs text-zinc-500 mt-3">
            This action cannot be undone.
          </p>
        </div>

        <div className="flex gap-3 p-4 pt-0">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 py-2.5 border border-zinc-700 bg-zinc-900 rounded-xl text-sm font-semibold text-zinc-300 hover:border-[#D4AF37]/40 hover:text-white transition-all disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            onClick={() => onConfirm(forceDelete)}
            disabled={
              isLoading ||
              (festival.totalEntries > 0 && !forceDelete)
            }
            className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-500 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}

            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminFestivalsList() {
  const { canDeleteFestivals, canManageFestivals } = useAdminAuth();

  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & filters
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState('year');
  const [sortOrder, setSortOrder] = useState('desc');

  // Delete
  const [deleteFestival, setDeleteFestival] =
    useState<Festival | null>(null);

  const [isDeleting, setIsDeleting] = useState(false);

  // ───────────────────────────────────────────────────────────────────────────
  // Fetch festivals
  // ───────────────────────────────────────────────────────────────────────────

  const fetchFestivals = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `${getApiUrl()}/api/admin/festivals`,
        {
          headers: authHeaders(),
        }
      );

      if (!res.ok) {
        throw new Error('Failed to fetch festivals');
      }

      const data: Festival[] = await res.json();

      setFestivals(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load festivals');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFestivals();
  }, [fetchFestivals]);

  // ───────────────────────────────────────────────────────────────────────────
  // Filter & sort
  // ───────────────────────────────────────────────────────────────────────────

  let filtered = [...festivals];

  if (search) {
    const s = search.toLowerCase();

    filtered = filtered.filter(
      (f) =>
        f.name.toLowerCase().includes(s) ||
        String(f.year).includes(s) ||
        (f.description || '').toLowerCase().includes(s)
    );
  }

  if (filterStatus) {
    filtered = filtered.filter(
      (f) => f.status === filterStatus
    );
  }

  filtered.sort((a, b) => {
    let cmp = 0;

    if (sortBy === 'name') {
      cmp = a.name.localeCompare(b.name);
    } else if (sortBy === 'year') {
      cmp = a.year - b.year;
    } else if (sortBy === 'collection') {
      cmp = a.totalCollection - b.totalCollection;
    }

    return sortOrder === 'asc' ? cmp : -cmp;
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Sort
  // ───────────────────────────────────────────────────────────────────────────

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder((o) =>
        o === 'asc' ? 'desc' : 'asc'
      );
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Delete
  // ───────────────────────────────────────────────────────────────────────────

  const handleDelete = async (force: boolean) => {
    if (!deleteFestival) return;

    setIsDeleting(true);

    try {
      const url = force
        ? `${getApiUrl()}/api/admin/festivals/${deleteFestival.id}/force`
        : `${getApiUrl()}/api/admin/festivals/${deleteFestival.id}`;

      const res = await fetch(url, {
        method: 'DELETE',
        headers: authHeaders(),
      });

      if (res.status === 409) {
        const err = await res
          .json()
          .catch(() => ({
            error: 'Cannot delete festival',
          }));

        toast.error(
          err.error ||
            'Cannot delete festival with existing donations'
        );

        return;
      }

      if (!res.ok) {
        throw new Error('Failed to delete');
      }

      toast.success('Festival deleted successfully');

      setDeleteFestival(null);

      fetchFestivals();
    } catch (err: any) {
      toast.error(
        err?.message || 'Failed to delete festival'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Sort header
  // ───────────────────────────────────────────────────────────────────────────

  const SortHeader = ({
    label,
    field,
  }: {
    label: string;
    field: string;
  }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-zinc-500 hover:text-[#D4AF37] transition-colors"
    >
      {label}

      {sortBy === field ? (
        <span className="text-[#D4AF37]">
          {sortOrder === 'asc' ? '▲' : '▼'}
        </span>
      ) : (
        <span className="opacity-30">⇅</span>
      )}
    </button>
  );

  // ───────────────────────────────────────────────────────────────────────────
  // UI
  // ───────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen w-full bg-[#070707] text-white pb-20">
      {/* Decorative background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-[#D4AF37]/[0.06] blur-[120px]" />

        <div className="absolute top-[40%] -left-40 w-[450px] h-[450px] rounded-full bg-[#D4AF37]/[0.035] blur-[120px]" />

        <div className="absolute bottom-0 right-[25%] w-[400px] h-[400px] rounded-full bg-amber-500/[0.025] blur-[100px]" />
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          Header
      ───────────────────────────────────────────────────────────────────── */}

      <header className="relative border-b border-[#D4AF37]/20 bg-[#0b0b0b]/90 backdrop-blur-xl">
        <div className="container mx-auto max-w-6xl px-4 py-6 md:py-8">
          <div className="flex items-center justify-between gap-4">
            {/* Left */}
            <div className="flex items-center gap-4">
              <Link
                href="/admin"
                className="group w-11 h-11 rounded-xl border border-zinc-800 bg-zinc-900/70 flex items-center justify-center hover:bg-[#D4AF37] hover:text-black hover:border-[#D4AF37] transition-all"
              >
                <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" />
              </Link>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                  </div>

                  <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.18em] text-[#D4AF37]">
                    Festival Management
                  </span>
                </div>

                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                  Festivals
                </h1>

                <p className="text-sm text-zinc-500 mt-1">
                  Manage society festivals and donations
                </p>
              </div>
            </div>

            {/* Festival creation is administrative; Volunteers only see assigned festivals. */}
            {canManageFestivals && <Link
              href="/admin/festivals/create"
              className="group flex items-center gap-2 px-4 md:px-5 py-3 bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#E5C158] text-black rounded-xl font-bold text-sm shadow-lg shadow-[#D4AF37]/10 hover:shadow-[#D4AF37]/25 hover:brightness-110 transition-all"
            >
              <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />

              <span className="hidden sm:inline">
                Create Festival
              </span>

              <span className="sm:hidden">
                Create
              </span>
            </Link>}
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────────────
          Main
      ───────────────────────────────────────────────────────────────────── */}

      <main className="relative container mx-auto max-w-6xl px-4 py-6 md:py-8">
        {/* Search & Filters */}
        <div className="rounded-2xl border border-zinc-800 bg-[#0d0d0d]/90 backdrop-blur-xl shadow-xl overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-zinc-800/80 bg-gradient-to-r from-[#D4AF37]/[0.05] via-transparent to-transparent">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center">
                <Filter className="w-4 h-4 text-[#D4AF37]" />
              </div>

              <div>
                <h2 className="text-sm font-bold text-white">
                  Search & Filters
                </h2>

                <p className="text-[11px] text-zinc-500">
                  Find and organize festivals
                </p>
              </div>
            </div>
          </div>

          <div className="p-4">
            <div className="flex flex-wrap items-end gap-3">
              {/* Search */}
              <div className="flex-1 min-w-[220px]">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
                  <Search className="w-3 h-3 inline mr-1" />
                  Search
                </label>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 pointer-events-none" />

                    <input
                      type="text"
                      value={searchInput}
                      onChange={(e) =>
                        setSearchInput(e.target.value)
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setSearch(searchInput);
                        }
                      }}
                      placeholder="Search festivals..."
                      className="w-full pl-10 pr-3 py-2.5 text-sm rounded-xl border border-zinc-800 bg-black/40 text-white placeholder:text-zinc-600 outline-none focus:border-[#D4AF37]/60 focus:ring-4 focus:ring-[#D4AF37]/10 transition-all"
                    />
                  </div>

                  <button
                    onClick={() => setSearch(searchInput)}
                    className="px-4 py-2.5 bg-[#D4AF37] text-black rounded-xl text-sm font-bold hover:bg-[#E5C158] transition-all shadow-lg shadow-[#D4AF37]/10"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Status */}
              <div className="w-full sm:w-[180px]">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
                  <Filter className="w-3 h-3 inline mr-1" />
                  Status
                </label>

                <select
                  value={filterStatus}
                  onChange={(e) =>
                    setFilterStatus(e.target.value)
                  }
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-zinc-800 bg-black/40 text-white outline-none focus:border-[#D4AF37]/60 focus:ring-4 focus:ring-[#D4AF37]/10 transition-all"
                >
                  <option value="" className="bg-[#0d0d0d]">
                    All Status
                  </option>

                  <option
                    value="upcoming"
                    className="bg-[#0d0d0d]"
                  >
                    Upcoming
                  </option>

                  <option
                    value="active"
                    className="bg-[#0d0d0d]"
                  >
                    Active
                  </option>

                  <option
                    value="completed"
                    className="bg-[#0d0d0d]"
                  >
                    Completed
                  </option>
                </select>
              </div>

              {/* Refresh */}
              <button
                onClick={fetchFestivals}
                disabled={isLoading}
                className="w-11 h-11 flex items-center justify-center border border-zinc-800 bg-black/40 rounded-xl text-zinc-400 hover:text-[#D4AF37] hover:border-[#D4AF37]/40 transition-all disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw
                  className={cn(
                    'w-4 h-4',
                    isLoading && 'animate-spin'
                  )}
                />
              </button>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────
            Festival Table
        ───────────────────────────────────────────────────────────────── */}

        <div className="rounded-2xl border border-zinc-800 bg-[#0d0d0d]/90 backdrop-blur-xl shadow-xl overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="relative mb-5">
                <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-[#D4AF37] animate-pulse" />
                </div>

                <div className="absolute -inset-1 rounded-xl border-2 border-[#D4AF37]/20 border-t-[#D4AF37] animate-spin" />
              </div>

              <p className="text-sm font-medium text-zinc-500">
                Loading festivals...
              </p>
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-7 h-7 text-red-400" />
              </div>

              <p className="font-semibold text-red-400">
                {error}
              </p>

              <button
                onClick={fetchFestivals}
                className="mt-5 px-5 py-2.5 bg-[#D4AF37] text-black rounded-xl text-sm font-bold hover:bg-[#E5C158] transition-all"
              >
                Retry
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-16 h-16 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center mx-auto mb-5">
                <MapPin className="w-7 h-7 text-[#D4AF37]/60" />
              </div>

              <p className="text-lg font-bold text-white">
                No festivals found
              </p>

              <p className="text-sm text-zinc-500 mt-1">
                Create your first festival to get started.
              </p>

              {canManageFestivals && <Link
                href="/admin/festivals/create"
                className="inline-flex items-center gap-2 mt-6 px-5 py-3 bg-gradient-to-r from-[#B8860B] to-[#D4AF37] text-black rounded-xl font-bold text-sm hover:brightness-110 transition-all shadow-lg shadow-[#D4AF37]/10"
              >
                <Plus className="w-4 h-4" />
                Create Festival
              </Link>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800 bg-black/30">
                    <th className="px-5 py-4 text-left">
                      <SortHeader
                        label="Festival"
                        field="name"
                      />
                    </th>

                    <th className="px-4 py-4 text-left">
                      <SortHeader
                        label="Year"
                        field="year"
                      />
                    </th>

                    <th className="px-4 py-4 text-left text-[11px] font-bold uppercase tracking-widest text-zinc-500">
                      Dates
                    </th>

                    <th className="px-4 py-4 text-left text-[11px] font-bold uppercase tracking-widest text-zinc-500">
                      Status
                    </th>

                    <th className="px-4 py-4 text-left">
                      <SortHeader
                        label="Collection"
                        field="collection"
                      />
                    </th>

                    <th className="px-4 py-4 text-left text-[11px] font-bold uppercase tracking-widest text-zinc-500">
                      Paid
                    </th>

                    <th className="px-5 py-4 text-right text-[11px] font-bold uppercase tracking-widest text-zinc-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.map((f, idx) => {
                    const StatusIcon =
                      statusIcons[f.status] || Clock;

                    return (
                      <tr
                        key={f.id}
                        className={cn(
                          'border-b border-zinc-800/60 transition-all hover:bg-[#D4AF37]/[0.035]',
                          idx % 2 === 0
                            ? 'bg-[#0d0d0d]'
                            : 'bg-black/20'
                        )}
                      >
                        {/* Festival */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center shrink-0">
                              <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                            </div>

                            <div className="min-w-0">
                              <span className="font-bold text-white block">
                                {f.name}
                              </span>

                              {f.description && (
                                <p className="text-xs text-zinc-500 mt-0.5 max-w-[240px] truncate">
                                  {f.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Year */}
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20 font-mono font-bold text-[#D4AF37] text-sm">
                            {f.year}
                          </span>
                        </td>

                        {/* Dates */}
                        <td className="px-4 py-4">
                          <div className="flex items-start gap-2">
                            <CalendarDays className="w-4 h-4 text-zinc-600 mt-0.5 shrink-0" />

                            <div className="text-xs text-zinc-400 whitespace-nowrap">
                              <div>
                                {formatDate(f.startDate)}
                              </div>

                              <div className="text-zinc-700 my-0.5">
                                ↓
                              </div>

                              <div>
                                {formatDate(f.endDate)}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-4">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border',
                              statusColors[f.status] ||
                                statusColors.upcoming
                            )}
                          >
                            <StatusIcon className="w-3 h-3" />

                            {f.status}
                          </span>
                        </td>

                        {/* Collection */}
                        <td className="px-4 py-4">
                          <div>
                            <span className="font-bold text-white flex items-center gap-1">
                              <IndianRupee className="w-3.5 h-3.5 text-[#D4AF37]" />

                              {formatCurrency(
                                f.totalCollection
                              ).replace('₹', '')}
                            </span>

                            {f.expectedDonation && (
                              <span className="text-[10px] text-zinc-600 mt-1 block">
                                Target ₹
                                {Number(
                                  f.expectedDonation
                                ).toLocaleString('en-IN')}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Paid */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                              <Users className="w-3.5 h-3.5 text-emerald-400" />
                            </div>

                            <div>
                              <span className="text-sm font-bold text-emerald-400">
                                {f.residentsPaid}
                              </span>

                              <span className="text-[10px] text-zinc-600 block">
                                paid
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={`/admin/festivals/${f.id}`}
                              className="w-9 h-9 rounded-lg border border-transparent flex items-center justify-center text-zinc-500 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 hover:border-[#D4AF37]/20 transition-all"
                              title="Open Festival"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>

                            {canManageFestivals && <Link
                              href={`/admin/festivals/${f.id}/expenses`}
                              className="w-9 h-9 rounded-lg border-transparent flex items-center justify-center text-zinc-500 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 hover:border-[#D4AF37]/20 transition-all"
                              title="Expenses"
                            >
                              <Wallet className="w-4 h-4" />
                            </Link>}

                            {canManageFestivals && <Link
                              href={`/admin/festivals/${f.id}/edit`}
                              className="w-9 h-9 rounded-lg border border-transparent flex items-center justify-center text-zinc-500 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 hover:border-[#D4AF37]/20 transition-all"
                              title="Edit"
                            >
                              <Edit3 className="w-4 h-4" />
                            </Link>}

                            {canDeleteFestivals && (
                              <button
                                onClick={() =>
                                  setDeleteFestival(f)
                                }
                                className="w-9 h-9 rounded-lg border border-transparent flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Bottom info */}
        {!isLoading && !error && filtered.length > 0 && (
          <div className="flex items-center justify-center gap-2 mt-5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />

            <span className="text-xs text-zinc-600">
              Showing {filtered.length} of {festivals.length}{' '}
              festival{festivals.length !== 1 ? 's' : ''}
            </span>

            <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
          </div>
        )}
      </main>

      {/* Delete modal */}
      {deleteFestival && (
        <DeleteConfirmDialog
          festival={deleteFestival}
          onConfirm={handleDelete}
          onCancel={() => setDeleteFestival(null)}
          isLoading={isDeleting}
        />
      )}
    </div>
  );
}