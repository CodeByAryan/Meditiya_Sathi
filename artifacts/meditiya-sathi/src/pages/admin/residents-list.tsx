import { useState, useEffect, useCallback } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Building2, Plus, Search, Eye, Edit3, Trash2, ChevronLeft, ChevronRight, X, RefreshCw, AlertTriangle, User, Phone, MapPin, CalendarDays, Hash, Home, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────────────────────
interface Building {
  id: number;
  buildingName: string;
  hasWings: boolean;
  status: string;
}

interface Wing {
  id: number;
  wingName: string;
  status: string;
}

interface Resident {
  id: number;
  fullName: string;
  mobile: string;
  buildingId: number;
  wingId: number | null;
  flatNo: string;
  address: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  buildingName: string | null;
  wingName: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ListResponse {
  residents: Resident[];
  pagination: Pagination;
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

// ── Format date helper ───────────────────────────────────────────────────────
function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

// ── View Modal ───────────────────────────────────────────────────────────────
function ViewResidentModal({ resident, onClose }: { resident: Resident; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-serif font-bold text-foreground flex items-center gap-2">
            <User className="w-5 h-5 text-primary" /> Resident Details
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-[140px_1fr] gap-y-3 text-sm">
            <span className="text-muted-foreground font-medium">Full Name</span>
            <span className="font-semibold text-foreground">{resident.fullName}</span>

            <span className="text-muted-foreground font-medium">Building</span>
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-primary" /> {resident.buildingName || '—'}
            </span>

            <span className="text-muted-foreground font-medium">Wing</span>
            <span className="font-semibold text-foreground">{resident.wingName || '—'}</span>

            <span className="text-muted-foreground font-medium">Flat Number</span>
            <span className="font-semibold text-foreground">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-mono font-bold text-sm">
                <Home className="w-3 h-3" /> {resident.flatNo}
              </span>
            </span>

            <span className="text-muted-foreground font-medium">Mobile</span>
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-muted-foreground" /> {resident.mobile}
            </span>

            <span className="text-muted-foreground font-medium">Address</span>
            <span className="text-foreground">{resident.address || '—'}</span>

            <span className="text-muted-foreground font-medium">Status</span>
            <span>
              <span className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider",
                resident.status === 'active'
                  ? "text-emerald-700 bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : "text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400"
              )}>
                {resident.status}
              </span>
            </span>

            <span className="text-muted-foreground font-medium">Created</span>
            <span className="text-foreground flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" /> {formatDate(resident.createdAt)}
            </span>
          </div>
        </div>
        <div className="flex justify-end p-4 border-t border-border bg-muted/20">
          <button onClick={onClose} className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete Confirm Dialog ────────────────────────────────────────────────────
function DeleteConfirmDialog({ resident, onConfirm, onCancel, isLoading }: {
  resident: Resident;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <div className="p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-destructive" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">Delete Resident?</h3>
          <p className="text-sm text-muted-foreground mb-1">Are you sure you want to delete</p>
          <p className="text-sm font-bold text-foreground">{resident.fullName} ({resident.flatNo})?</p>
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
            onClick={onConfirm}
            disabled={isLoading}
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

// ── Edit Form Modal ────────────────────────────────────────────────────────
function EditResidentModal({ resident, buildings, onClose, onSaved }: {
  resident: Resident;
  buildings: Building[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    fullName: resident.fullName,
    mobile: resident.mobile,
    buildingId: resident.buildingId,
    wingId: resident.wingId,
    flatNo: resident.flatNo,
    address: resident.address || '',
    status: resident.status,
  });
  const [wings, setWings] = useState<Wing[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingWings, setLoadingWings] = useState(false);

  const selectedBuilding = buildings.find(b => b.id === form.buildingId);

  useEffect(() => {
    if (!form.buildingId || !selectedBuilding?.hasWings) {
      setWings([]);
      return;
    }
    setLoadingWings(true);
    fetch(`/api/admin/buildings/${form.buildingId}/wings`, { headers: authHeaders() })
      .then(r => r.json())
      .then((data: Wing[]) => setWings(data))
      .catch(() => setWings([]))
      .finally(() => setLoadingWings(false));
  }, [form.buildingId, selectedBuilding?.hasWings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/residents/${resident.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({
          ...form,
          wingId: selectedBuilding?.hasWings ? form.wingId : null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to update' }));
        toast.error(err.error);
        return;
      }
      toast.success('Resident updated successfully');
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update resident');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-lg w-full my-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-serif font-bold text-foreground flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-primary" /> Edit Resident
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Building <span className="text-destructive">*</span></label>
              <select
                value={form.buildingId}
                onChange={e => setForm(f => ({ ...f, buildingId: parseInt(e.target.value), wingId: null }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none"
                required
              >
                <option value="">Select</option>
                {buildings.map(b => (
                  <option key={b.id} value={b.id}>{b.buildingName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Wing {selectedBuilding?.hasWings && <span className="text-destructive">*</span>}</label>
              {selectedBuilding?.hasWings ? (
                <select
                  value={form.wingId || ''}
                  onChange={e => setForm(f => ({ ...f, wingId: e.target.value ? parseInt(e.target.value) : null }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none"
                  required={selectedBuilding?.hasWings}
                >
                  <option value="">Select</option>
                  {loadingWings ? (
                    <option disabled>Loading...</option>
                  ) : wings.map(w => (
                    <option key={w.id} value={w.id}>{w.wingName}</option>
                  ))}
                </select>
              ) : (
                <div className="px-3 py-2 text-sm rounded-lg border border-dashed border-border bg-muted/30 text-muted-foreground">N/A</div>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Flat <span className="text-destructive">*</span></label>
              <input
                type="text"
                value={form.flatNo}
                onChange={e => setForm(f => ({ ...f, flatNo: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Full Name <span className="text-destructive">*</span></label>
              <input
                type="text"
                value={form.fullName}
                onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Mobile <span className="text-destructive">*</span></label>
              <input
                type="tel"
                value={form.mobile}
                onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Address</label>
            <textarea
              value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none resize-none"
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="text-xs font-semibold text-foreground">Status:</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, status: 'active' }))}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all",
                  form.status === 'active'
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700"
                    : "border-border text-muted-foreground"
                )}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, status: 'inactive' }))}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all",
                  form.status === 'inactive'
                    ? "border-destructive bg-destructive/10 text-destructive"
                    : "border-border text-muted-foreground"
                )}
              >
                Inactive
              </button>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isSaving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Edit3 className="w-4 h-4" />}
              Update Resident
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-5 py-2.5 border border-border rounded-xl text-sm font-semibold hover:bg-muted/50 transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Sort Header ──────────────────────────────────────────────────────────────
function SortHeader({ label, field, currentSort, currentOrder, onSort }: {
  label: string;
  field: string;
  currentSort: string;
  currentOrder: string;
  onSort: (field: string) => void;
}) {
  const isActive = currentSort === field;
  return (
    <button
      onClick={() => onSort(field)}
      className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
    >
      {label}
      {isActive ? (
        <span className="text-primary">{currentOrder === 'asc' ? ' ▲' : ' ▼'}</span>
      ) : (
        <span className="opacity-30"> ⇅</span>
      )}
    </button>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function AdminResidentsList() {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filterBuildingId, setFilterBuildingId] = useState<number | null>(null);
  const [filterWingId, setFilterWingId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');

  // Sort
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Buildings & Wings for filters
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [filterWings, setFilterWings] = useState<Wing[]>([]);

  // View / Edit / Delete state
  const [viewResident, setViewResident] = useState<Resident | null>(null);
  const [editResident, setEditResident] = useState<Resident | null>(null);
  const [deleteResident, setDeleteResident] = useState<Resident | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch buildings for filter
  useEffect(() => {
    fetch('/api/admin/buildings/manage', { headers: authHeaders() })
      .then(r => r.json())
      .then((data: Building[]) => setBuildings(data))
      .catch(() => {});
  }, []);

  // Fetch wings when filter building changes
  useEffect(() => {
    if (!filterBuildingId) {
      setFilterWings([]);
      return;
    }
    fetch(`/api/admin/buildings/${filterBuildingId}/wings/manage`, { headers: authHeaders() })
      .then(r => r.json())
      .then((data: Wing[]) => setFilterWings(data))
      .catch(() => setFilterWings([]));
  }, [filterBuildingId]);

  // Fetch residents
  const fetchResidents = useCallback(async (pageNum?: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(pageNum ?? pagination.page));
      params.set('limit', '10');
      if (search) params.set('search', search);
      if (filterBuildingId) params.set('buildingId', String(filterBuildingId));
      if (filterWingId) params.set('wingId', String(filterWingId));
      if (filterStatus) params.set('status', filterStatus);
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);

      const res = await fetch(`/api/admin/residents?${params.toString()}`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch residents');
      const data: ListResponse = await res.json();
      setResidents(data.residents);
      setPagination(data.pagination);
    } catch (err: any) {
      setError(err?.message || 'Failed to load residents');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, search, filterBuildingId, filterWingId, filterStatus, sortBy, sortOrder]);

  useEffect(() => {
    fetchResidents();
  }, [fetchResidents]);

  const handleSearch = () => {
    setPagination(p => ({ ...p, page: 1 }));
    setSearch(searchInput);
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const goToPage = (page: number) => {
    if (page < 1 || page > pagination.totalPages) return;
    setPagination(p => ({ ...p, page }));
  };

  const handleDelete = async () => {
    if (!deleteResident) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/residents/${deleteResident.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (res.status === 409) {
        const err = await res.json().catch(() => ({ error: 'Cannot delete' }));
        toast.error(err.error || 'This resident has donation records and cannot be deleted.');
        setDeleteResident(null);
        return;
      }
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Resident deleted successfully');
      setDeleteResident(null);
      fetchResidents();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete resident');
    } finally {
      setIsDeleting(false);
    }
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const total = pagination.totalPages;
    const current = pagination.page;
    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      if (current > 3) pages.push('...');
      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (current < total - 2) pages.push('...');
      pages.push(total);
    }
    return pages;
  };

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
                <Building2 className="w-7 h-7 text-primary" /> Residents List
              </h1>
              <p className="text-white/70">Manage all registered residents</p>
            </div>
            <Link
              href="/admin/residents"
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all shadow-lg"
            >
              <Plus className="w-4 h-4" /> Add Resident
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
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="Name, Mobile, or Flat No..."
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none"
                />
                <button
                  onClick={handleSearch}
                  className="px-3 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="w-[200px]">
              <label className="block text-xs font-semibold text-foreground mb-1">
                <Building2 className="w-3 h-3 inline mr-1" /> Building
              </label>
              <select
                value={filterBuildingId || ''}
                onChange={e => { setFilterBuildingId(e.target.value ? parseInt(e.target.value) : null); setFilterWingId(null); }}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none"
              >
                <option value="">All Buildings</option>
                {buildings.map(b => (
                  <option key={b.id} value={b.id}>{b.buildingName}</option>
                ))}
              </select>
            </div>
            <div className="w-[150px]">
              <label className="block text-xs font-semibold text-foreground mb-1">
                <Filter className="w-3 h-3 inline mr-1" /> Wing
              </label>
              <select
                value={filterWingId || ''}
                onChange={e => setFilterWingId(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none"
                disabled={!filterBuildingId}
              >
                <option value="">All Wings</option>
                {filterWings.map(w => (
                  <option key={w.id} value={w.id}>{w.wingName}</option>
                ))}
              </select>
            </div>
            <div className="w-[130px]">
              <label className="block text-xs font-semibold text-foreground mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none"
              >
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <button
              onClick={() => fetchResidents()}
              disabled={isLoading}
              className="px-3 py-2 border border-border rounded-lg text-sm font-semibold hover:bg-muted/50 transition-all"
              title="Refresh"
            >
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-16 text-destructive">
              <AlertTriangle className="w-10 h-10 mx-auto mb-3" />
              <p className="font-semibold">{error}</p>
              <button onClick={() => fetchResidents()} className="mt-4 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold">
                Retry
              </button>
            </div>
          ) : residents.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Building2 className="w-14 h-14 mx-auto mb-4 text-muted-foreground/40" />
              <p className="text-lg font-semibold text-foreground">No residents found</p>
              <p className="text-sm mt-1">Please add a resident.</p>
              <Link
                href="/admin/residents"
                className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all shadow-lg"
              >
                <Plus className="w-4 h-4" /> Add Resident
              </Link>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground w-[60px]">#</th>
                      <th className="px-4 py-3 text-left">
                        <SortHeader label="Name" field="fullName" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                      </th>
                      <th className="px-4 py-3 text-left">
                        <SortHeader label="Building" field="buildingName" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Wing</th>
                      <th className="px-4 py-3 text-left">
                        <SortHeader label="Flat" field="flatNo" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Mobile</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground hidden md:table-cell">Status</th>
                      <th className="px-4 py-3 text-left">
                        <SortHeader label="Created" field="createdAt" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground w-[120px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {residents.map((r, idx) => (
                      <tr
                        key={r.id}
                        className={cn(
                          "border-b border-border/50 transition-colors hover:bg-muted/20",
                          idx % 2 === 0 ? "bg-background" : "bg-muted/10"
                        )}
                      >
                        <td className="px-4 py-3 text-sm text-muted-foreground font-mono">
                          {(pagination.page - 1) * pagination.limit + idx + 1}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-foreground">{r.fullName}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/5 text-primary text-sm font-medium">
                            <Building2 className="w-3 h-3" /> {r.buildingName || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {r.wingName ? (
                            <span className="font-mono text-sm font-semibold text-foreground">{r.wingName}</span>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 font-mono font-bold text-sm border border-amber-200 dark:border-amber-900/50">
                            <Home className="w-3 h-3" /> {r.flatNo}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-foreground">{r.mobile}</span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                            r.status === 'active'
                              ? "text-emerald-700 bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400"
                              : "text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400"
                          )}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" /> {formatDate(r.createdAt)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setViewResident(r)}
                              className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors text-primary"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditResident(r)}
                              className="p-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-950/30 transition-colors text-amber-600"
                              title="Edit"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteResident(r)}
                              className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-destructive"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
                  <span className="text-xs text-muted-foreground">
                    Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => goToPage(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-30"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {getPageNumbers().map((p, i) =>
                      typeof p === 'string' ? (
                        <span key={`ellipsis-${i}`} className="px-2 text-xs text-muted-foreground">...</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => goToPage(p)}
                          className={cn(
                            "min-w-[32px] h-8 rounded-lg text-xs font-semibold transition-all",
                            p === pagination.page
                              ? "bg-primary text-white shadow-sm"
                              : "hover:bg-muted text-foreground"
                          )}
                        >
                          {p}
                        </button>
                      )
                    )}
                    <button
                      onClick={() => goToPage(pagination.page + 1)}
                      disabled={pagination.page >= pagination.totalPages}
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-30"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {viewResident && <ViewResidentModal resident={viewResident} onClose={() => setViewResident(null)} />}
      {editResident && (
        <EditResidentModal
          resident={editResident}
          buildings={buildings}
          onClose={() => setEditResident(null)}
          onSaved={() => { fetchResidents(); }}
        />
      )}
      {deleteResident && (
        <DeleteConfirmDialog
          resident={deleteResident}
          onConfirm={handleDelete}
          onCancel={() => setDeleteResident(null)}
          isLoading={isDeleting}
        />
      )}
    </div>
  );
}
