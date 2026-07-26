import { useState, useEffect, useCallback } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Building2, Plus, Search, Eye, Edit3, Trash2, CalendarDays, MapPin, Filter, RefreshCw, AlertTriangle, CheckCircle, XCircle, Clock, IndianRupee, Users } from 'lucide-react';
import { toast } from 'sonner';
import { cn, getApiUrl } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────────────────────
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
  // Computed stats
  totalCollection: number;
  totalEntries: number;
  residentsPaid: number;
  residentsPending: number;
}

// ── Auth helpers ─────────────────────────────────────────────────────────────
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
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

const statusColors: Record<string, string> = {
  upcoming: 'text-blue-700 bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400',
  active: 'text-emerald-700 bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400',
  completed: 'text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400',
};

const statusIcons: Record<string, any> = {
  upcoming: Clock,
  active: CheckCircle,
  completed: XCircle,
};

// ── Delete Confirm Dialog ────────────────────────────────────────────────────
function DeleteConfirmDialog({ festival, onConfirm, onCancel, isLoading }: {
  festival: Festival;
  onConfirm: (force: boolean) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [forceDelete, setForceDelete] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <div className="p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-destructive" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">Delete Festival?</h3>
          <p className="text-sm text-muted-foreground mb-1">Are you sure you want to delete</p>
          <p className="text-sm font-bold text-foreground">{festival.name} ({festival.year})?</p>
          {festival.totalEntries > 0 && (
            <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl">
              <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold">
                This festival has {festival.totalEntries} donation record(s). All related data will be permanently deleted.
              </p>
              <label className="flex items-center gap-2 mt-2 text-xs text-amber-700 dark:text-amber-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={forceDelete}
                  onChange={e => setForceDelete(e.target.checked)}
                  className="rounded border-amber-300"
                />
                I understand and want to proceed
              </label>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-2">This action cannot be undone.</p>
        </div>
        <div className="flex gap-3 p-4 pt-0">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold hover:bg-muted/50 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(forceDelete)}
            disabled={isLoading || (festival.totalEntries > 0 && !forceDelete)}
            className="flex-1 py-2.5 bg-destructive text-destructive-foreground rounded-xl text-sm font-semibold hover:bg-destructive/90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isLoading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function AdminFestivalsList() {
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('year');
  const [sortOrder, setSortOrder] = useState<string>('desc');

  // Delete state
  const [deleteFestival, setDeleteFestival] = useState<Festival | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch festivals
  const fetchFestivals = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${getApiUrl()}/api/admin/festivals`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch festivals');
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

  // Filter & sort
  let filtered = [...festivals];

  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(f =>
      f.name.toLowerCase().includes(s) ||
      String(f.year).includes(s) ||
      f.description.toLowerCase().includes(s)
    );
  }

  if (filterStatus) {
    filtered = filtered.filter(f => f.status === filterStatus);
  }

  filtered.sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'name') {
      cmp = a.name.localeCompare(b.name);
    } else if (sortBy === 'year') {
      cmp = a.year - b.year;
    } else if (sortBy === 'collection') {
      cmp = a.totalCollection - b.totalCollection;
    } else {
      cmp = a.year - b.year;
    }
    return sortOrder === 'asc' ? cmp : -cmp;
  });

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleDelete = async (force: boolean) => {
    if (!deleteFestival) return;
    setIsDeleting(true);
    try {
      const url = force
        ? `${getApiUrl()}/api/admin/festivals/${deleteFestival.id}/force`
        : `${getApiUrl()}/api/admin/festivals/${deleteFestival.id}`;
      const res = await fetch(url, { method: 'DELETE', headers: authHeaders() });

      if (res.status === 409) {
        const err = await res.json().catch(() => ({ error: 'Cannot delete' }));
        toast.error(err.error || 'Cannot delete festival with existing donations');
        // Show the dialog again with force option
        return;
      }

      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Festival deleted successfully');
      setDeleteFestival(null);
      fetchFestivals();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete festival');
    } finally {
      setIsDeleting(false);
    }
  };

  const SortHeader = ({ label, field }: { label: string; field: string }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
    >
      {label}
      {sortBy === field ? (
        <span className="text-primary">{sortOrder === 'asc' ? ' ▲' : ' ▼'}</span>
      ) : (
        <span className="opacity-30"> ⇅</span>
      )}
    </button>
  );

  return (
    <div className="w-full min-h-screen bg-muted/10 pb-20">
      {/* Header */}
      <div className="bg-secondary text-secondary-foreground py-8 px-4 border-b border-border shadow-sm">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex-1">
              <h1 className="text-3xl font-serif font-bold text-white flex items-center gap-3">
                <MapPin className="w-7 h-7 text-primary" /> Festivals
              </h1>
              <p className="text-white/70">Manage society festivals and donations</p>
            </div>
            <Link
              href="/admin/festivals/create"
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all shadow-lg"
            >
              <Plus className="w-4 h-4" /> Create Festival
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 py-6">
        {/* Search & Filters */}
        <div className="bg-card border border-border rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-semibold text-foreground mb-1">
                <Search className="w-3 h-3 inline mr-1" /> Search
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && setSearch(searchInput)}
                  placeholder="Search festivals..."
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none"
                />
                <button
                  onClick={() => setSearch(searchInput)}
                  className="px-3 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="w-[180px]">
              <label className="block text-xs font-semibold text-foreground mb-1">
                <Filter className="w-3 h-3 inline mr-1" /> Status
              </label>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none"
              >
                <option value="">All Status</option>
                <option value="upcoming">Upcoming</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <button
              onClick={fetchFestivals}
              disabled={isLoading}
              className="px-3 py-2 border border-border rounded-lg text-sm font-semibold hover:bg-muted/50 transition-all"
              title="Refresh"
            >
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Festivals Table */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-16 text-destructive">
              <AlertTriangle className="w-10 h-10 mx-auto mb-3" />
              <p className="font-semibold">{error}</p>
              <button onClick={fetchFestivals} className="mt-4 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold">
                Retry
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <MapPin className="w-14 h-14 mx-auto mb-4 text-muted-foreground/40" />
              <p className="text-lg font-semibold text-foreground">No festivals found</p>
              <p className="text-sm mt-1">Create your first festival to get started.</p>
              <Link
                href="/admin/festivals/create"
                className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all shadow-lg"
              >
                <Plus className="w-4 h-4" /> Create Festival
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left"><SortHeader label="Festival Name" field="name" /></th>
                    <th className="px-4 py-3 text-left"><SortHeader label="Year" field="year" /></th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Dates</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left"><SortHeader label="Collection" field="collection" /></th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Paid</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground w-[140px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((f, idx) => {
                    const StatusIcon = statusIcons[f.status] || Clock;
                    return (
                      <tr
                        key={f.id}
                        className={cn(
                          "border-b border-border/50 transition-colors hover:bg-muted/20",
                          idx % 2 === 0 ? "bg-background" : "bg-muted/10"
                        )}
                      >
                        <td className="px-4 py-3">
                          <div>
                            <span className="font-semibold text-foreground">{f.name}</span>
                            {f.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{f.description}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono font-bold text-foreground">{f.year}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" />
                            {formatDate(f.startDate)} – {formatDate(f.endDate)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                            statusColors[f.status] || statusColors.upcoming
                          )}>
                            <StatusIcon className="w-3 h-3" />
                            {f.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-foreground flex items-center gap-1">
                            <IndianRupee className="w-3 h-3 text-primary" />
                            {formatCurrency(f.totalCollection)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-emerald-600">{f.residentsPaid}</span>
                            <span className="text-xs text-muted-foreground">paid</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              href={`/admin/festivals/${f.id}`}
                              className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors text-primary"
                              title="Open Festival"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            <Link
                              href={`/admin/festivals/${f.id}/edit`}
                              className="p-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-950/30 transition-colors text-amber-600"
                              title="Edit"
                            >
                              <Edit3 className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => setDeleteFestival(f)}
                              className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-destructive"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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
      </div>

      {/* Delete Modal */}
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

