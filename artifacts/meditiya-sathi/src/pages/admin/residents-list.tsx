import { useState, useEffect, useCallback } from 'react';
import { Link } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Building2,
  Plus,
  Search,
  Eye,
  Edit3,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  RefreshCw,
  AlertTriangle,
  User,
  Phone,
  CalendarDays,
  Home,
  Hash,
  Filter,
  MapPin,
  Sparkles, Download, FileSpreadsheet,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { cn, getApiUrl } from '@/lib/utils';

/* ============================================================
   TYPES
============================================================ */

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

/* ============================================================
   AUTH HELPERS
============================================================ */

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

/* ============================================================
   DATE
============================================================ */

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);

    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/* ============================================================
   SHARED GLASS STYLES
============================================================ */

const glassCard =
  'border border-white/10 bg-white/[0.045] backdrop-blur-2xl shadow-[0_20px_80px_rgba(0,0,0,0.25)]';

const inputStyle =
  'w-full rounded-xl border border-white/10 bg-white/[0.045] px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition-all focus:border-amber-300/40 focus:bg-white/[0.07] focus:ring-1 focus:ring-amber-300/20';

const selectStyle =
  'w-full rounded-xl border border-white/10 bg-[#111111] px-3.5 py-2.5 text-sm text-white outline-none transition-all focus:border-amber-300/40 focus:ring-1 focus:ring-amber-300/20';

/* ============================================================
   VIEW MODAL
============================================================ */

function ViewResidentModal({
  resident,
  onClose,
}: {
  resident: Resident;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 25, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 15, scale: 0.98 }}
          transition={{ duration: 0.25 }}
          className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-[#101010] shadow-[0_30px_120px_rgba(0,0,0,0.7)]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Glow */}
          <div className="pointer-events-none absolute -top-32 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-amber-400/10 blur-[90px]" />

          <div className="relative flex items-center justify-between border-b border-white/10 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-300/20 bg-amber-300/10">
                <User className="h-4 w-4 text-amber-300" />
              </div>

              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.25em] text-amber-300/70">
                  Resident
                </p>

                <h2 className="mt-0.5 font-serif text-lg font-semibold text-white">
                  Resident Details
                </h2>
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/[0.04] p-2 text-white/50 transition hover:bg-white/[0.08] hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="relative space-y-3 p-5">
            <InfoRow
              label="Full Name"
              value={resident.fullName}
              icon={<User className="h-3.5 w-3.5" />}
            />

            <InfoRow
              label="Building"
              value={resident.buildingName || '—'}
              icon={<Building2 className="h-3.5 w-3.5" />}
            />

            <InfoRow
              label="Wing"
              value={resident.wingName || '—'}
            />

            <InfoRow
              label="Flat Number"
              value={resident.flatNo}
              icon={<Home className="h-3.5 w-3.5" />}
              highlight
            />

            <InfoRow
              label="Mobile"
              value={resident.mobile}
              icon={<Phone className="h-3.5 w-3.5" />}
            />

            <InfoRow
              label="Address"
              value={resident.address || '—'}
              icon={<MapPin className="h-3.5 w-3.5" />}
            />

            <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.025] px-4 py-3">
              <span className="text-xs font-medium text-white/40">
                Status
              </span>

              <StatusBadge status={resident.status} />
            </div>

            <InfoRow
              label="Created"
              value={formatDate(resident.createdAt)}
              icon={<CalendarDays className="h-3.5 w-3.5" />}
            />
          </div>

          <div className="border-t border-white/10 bg-white/[0.02] p-4">
            <button
              onClick={onClose}
              className="w-full rounded-xl bg-white py-2.5 text-sm font-semibold text-black transition hover:scale-[1.01]"
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function InfoRow({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-white/[0.025] px-4 py-3">
      <span className="text-xs font-medium text-white/40">{label}</span>

      <span
        className={cn(
          'flex items-center gap-1.5 text-right text-sm font-medium',
          highlight
            ? 'rounded-lg border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 font-mono text-amber-300'
            : 'text-white/85',
        )}
      >
        {icon && (
          <span className={highlight ? 'text-amber-300' : 'text-white/35'}>
            {icon}
          </span>
        )}

        {value}
      </span>
    </div>
  );
}

/* ============================================================
   STATUS
============================================================ */

function StatusBadge({ status }: { status: string }) {
  const active = status === 'active';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em]',
        active
          ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
          : 'border-white/10 bg-white/[0.05] text-white/40',
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          active ? 'bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.8)]' : 'bg-white/30',
        )}
      />

      {status}
    </span>
  );
}

/* ============================================================
   DELETE DIALOG
============================================================ */

function DeleteConfirmDialog({
  resident,
  onConfirm,
  onCancel,
  isLoading,
}: {
  resident: Resident;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
        onClick={onCancel}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-[#101010] shadow-[0_30px_120px_rgba(0,0,0,0.7)]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-red-400/20 bg-red-400/10">
              <AlertTriangle className="h-6 w-6 text-red-400" />
            </div>

            <h3 className="font-serif text-xl font-semibold text-white">
              Delete Resident?
            </h3>

            <p className="mt-2 text-sm text-white/45">
              Are you sure you want to delete
            </p>

            <p className="mt-1 text-sm font-semibold text-white">
              {resident.fullName} ({resident.flatNo})
            </p>

            <p className="mt-3 text-xs text-white/30">
              This action cannot be undone.
            </p>
          </div>

          <div className="flex gap-3 border-t border-white/10 bg-white/[0.02] p-4">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-sm font-semibold text-white/70 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-40"
            >
              Cancel
            </button>

            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500/90 disabled:opacity-50"
            >
              {isLoading ? (
                <span className="mx-auto block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  Delete
                </span>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ============================================================
   EDIT MODAL
============================================================ */

function EditResidentModal({
  resident,
  buildings,
  onClose,
  onSaved,
}: {
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

  const selectedBuilding = buildings.find(
    (b) => b.id === form.buildingId,
  );

  useEffect(() => {
    if (!form.buildingId || !selectedBuilding?.hasWings) {
      setWings([]);
      return;
    }

    setLoadingWings(true);

    fetch(
      getApiUrl() +
        `/api/admin/buildings/${form.buildingId}/wings`,
      {
        headers: authHeaders(),
      },
    )
      .then((r) => r.json())
      .then((data: Wing[]) => setWings(data))
      .catch(() => setWings([]))
      .finally(() => setLoadingWings(false));
  }, [form.buildingId, selectedBuilding?.hasWings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSaving(true);

    try {
      const res = await fetch(
        getApiUrl() +
          `/api/admin/residents/${resident.id}`,
        {
          method: 'PATCH',
          headers: authHeaders(),
          body: JSON.stringify({
            ...form,
            wingId: selectedBuilding?.hasWings
              ? form.wingId
              : null,
          }),
        },
      );

      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ error: 'Failed to update' }));

        toast.error(err.error);

        return;
      }

      toast.success('Resident updated successfully');

      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(
        err?.message || 'Failed to update resident',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 25, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="relative my-8 w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-[#101010] shadow-[0_30px_120px_rgba(0,0,0,0.7)]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="pointer-events-none absolute -top-32 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-amber-400/10 blur-[90px]" />

          <div className="relative flex items-center justify-between border-b border-white/10 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-300/20 bg-amber-300/10">
                <Edit3 className="h-4 w-4 text-amber-300" />
              </div>

              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.25em] text-amber-300/70">
                  Manage
                </p>

                <h2 className="font-serif text-lg font-semibold text-white">
                  Edit Resident
                </h2>
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/[0.04] p-2 text-white/50 transition hover:bg-white/[0.08] hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            className="relative space-y-5 p-5"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <FormField label="Building" required>
                <select
                  value={form.buildingId}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      buildingId: parseInt(e.target.value),
                      wingId: null,
                    }))
                  }
                  className={selectStyle}
                  required
                >
                  <option value="">Select</option>

                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.buildingName}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField
                label="Wing"
                required={selectedBuilding?.hasWings}
              >
                {selectedBuilding?.hasWings ? (
                  <select
                    value={form.wingId || ''}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        wingId: e.target.value
                          ? parseInt(e.target.value)
                          : null,
                      }))
                    }
                    className={selectStyle}
                    required={selectedBuilding?.hasWings}
                  >
                    <option value="">Select</option>

                    {loadingWings ? (
                      <option disabled>
                        Loading...
                      </option>
                    ) : (
                      wings.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.wingName}
                        </option>
                      ))
                    )}
                  </select>
                ) : (
                  <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.025] px-3.5 py-2.5 text-sm text-white/30">
                    N/A
                  </div>
                )}
              </FormField>

              <FormField label="Flat" required>
                <input
                  type="text"
                  value={form.flatNo}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      flatNo: e.target.value,
                    }))
                  }
                  className={inputStyle}
                  required
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label="Full Name" required>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      fullName: e.target.value,
                    }))
                  }
                  className={inputStyle}
                  required
                />
              </FormField>

              <FormField label="Mobile" required>
                <input
                  type="tel"
                  value={form.mobile}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      mobile: e.target.value,
                    }))
                  }
                  className={inputStyle}
                  required
                />
              </FormField>
            </div>

            <FormField label="Address">
              <textarea
                value={form.address}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    address: e.target.value,
                  }))
                }
                rows={2}
                className={cn(inputStyle, 'resize-none')}
              />
            </FormField>

            <div>
              <label className="mb-2 block text-xs font-semibold text-white/60">
                Status
              </label>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      status: 'active',
                    }))
                  }
                  className={cn(
                    'rounded-xl border px-4 py-2 text-xs font-semibold transition',
                    form.status === 'active'
                      ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                      : 'border-white/10 bg-white/[0.03] text-white/40 hover:bg-white/[0.06]',
                  )}
                >
                  Active
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      status: 'inactive',
                    }))
                  }
                  className={cn(
                    'rounded-xl border px-4 py-2 text-xs font-semibold transition',
                    form.status === 'inactive'
                      ? 'border-red-400/30 bg-red-400/10 text-red-300'
                      : 'border-white/10 bg-white/[0.03] text-white/40 hover:bg-white/[0.06]',
                  )}
                >
                  Inactive
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2 sm:flex-row">
              <button
                type="submit"
                disabled={isSaving}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white py-3 text-sm font-semibold text-black transition hover:scale-[1.01] disabled:opacity-50"
              >
                {isSaving ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                ) : (
                  <Edit3 className="h-4 w-4" />
                )}

                Update Resident
              </button>

              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="rounded-xl border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-semibold text-white/70 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-40"
              >
                Cancel
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45">
        {label}

        {required && (
          <span className="ml-1 text-amber-300">*</span>
        )}
      </label>

      {children}
    </div>
  );
}

/* ============================================================
   SORT HEADER
============================================================ */

function SortHeader({
  label,
  field,
  currentSort,
  currentOrder,
  onSort,
}: {
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
      className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/40 transition hover:text-amber-300"
    >
      {label}

      {isActive ? (
        <span className="text-amber-300">
          {currentOrder === 'asc' ? '▲' : '▼'}
        </span>
      ) : (
        <span className="opacity-30">⇅</span>
      )}
    </button>
  );
}

/* ============================================================
   MAIN PAGE
============================================================ */

export default function AdminResidentsList() {
  const [residents, setResidents] = useState<Resident[]>([]);

  const [pagination, setPagination] =
    useState<Pagination>({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const [filterBuildingId, setFilterBuildingId] =
    useState<number | null>(null);

  const [filterWingId, setFilterWingId] =
    useState<number | null>(null);

  const [filterStatus, setFilterStatus] = useState('');

  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  const [buildings, setBuildings] = useState<Building[]>([]);
  const [filterWings, setFilterWings] = useState<Wing[]>([]);

  const [viewResident, setViewResident] =
    useState<Resident | null>(null);

  const [editResident, setEditResident] =
    useState<Resident | null>(null);

  const [deleteResident, setDeleteResident] =
    useState<Resident | null>(null);

  const [isDeleting, setIsDeleting] = useState(false);
  const [exporting, setExporting] = useState<'excel' | 'csv' | null>(null);
  const exportResidents = async (format: 'excel' | 'csv') => {
    setExporting(format);
    try {
      const q = new URLSearchParams(); if (search) q.set('search', search); if (filterBuildingId) q.set('buildingId', String(filterBuildingId)); if (filterWingId) q.set('wingId', String(filterWingId)); if (filterStatus) q.set('status', filterStatus);
      const response = await fetch(getApiUrl() + '/api/admin/residents/export?' + q.toString(), { headers: authHeaders() }); if (!response.ok) throw new Error('Failed to export residents');
      const data = await response.json(); const rows = (data.residents || []).map((r: Resident) => ({ Name: r.fullName, Mobile: r.mobile, Building: r.buildingName || '', Wing: r.wingName || '', Flat: r.flatNo, Address: r.address || '', Status: r.status, 'Created Date': formatDate(r.createdAt) })); const ws = XLSX.utils.json_to_sheet(rows);
      if (format === 'excel') { const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Residents'); XLSX.writeFile(wb, 'residents.xlsx'); } else { const blob = new Blob(['﻿' + XLSX.utils.sheet_to_csv(ws)], { type: 'text/csv;charset=utf-8' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'residents.csv'; a.click(); URL.revokeObjectURL(a.href); }
      toast.success((format === 'excel' ? 'Excel' : 'CSV') + ' downloaded successfully');
    } catch (err: any) { toast.error(err?.message || 'Failed to export residents'); } finally { setExporting(null); }
  };


  /* ============================================================
     BUILDINGS
  ============================================================ */

  useEffect(() => {
    fetch(
      getApiUrl() + '/api/admin/buildings/manage',
      {
        headers: authHeaders(),
      },
    )
      .then((r) => r.json())
      .then((data: Building[]) => setBuildings(data))
      .catch(() => {});
  }, []);

  /* ============================================================
     WINGS
  ============================================================ */

  useEffect(() => {
    if (!filterBuildingId) {
      setFilterWings([]);
      return;
    }

    fetch(
      getApiUrl() +
        `/api/admin/buildings/${filterBuildingId}/wings/manage`,
      {
        headers: authHeaders(),
      },
    )
      .then((r) => r.json())
      .then((data: Wing[]) => setFilterWings(data))
      .catch(() => setFilterWings([]));
  }, [filterBuildingId]);

  /* ============================================================
     FETCH RESIDENTS
  ============================================================ */

  const fetchResidents = useCallback(
    async (pageNum?: number) => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();

        params.set(
          'page',
          String(pageNum ?? pagination.page),
        );

        params.set('limit', '10');

        if (search) {
          params.set('search', search);
        }

        if (filterBuildingId) {
          params.set(
            'buildingId',
            String(filterBuildingId),
          );
        }

        if (filterWingId) {
          params.set(
            'wingId',
            String(filterWingId),
          );
        }

        if (filterStatus) {
          params.set('status', filterStatus);
        }

        params.set('sortBy', sortBy);
        params.set('sortOrder', sortOrder);

        const res = await fetch(
          getApiUrl() +
            `/api/admin/residents?${params.toString()}`,
          {
            headers: authHeaders(),
          },
        );

        if (!res.ok) {
          throw new Error('Failed to fetch residents');
        }

        const data: ListResponse = await res.json();

        setResidents(data.residents);
        setPagination(data.pagination);
      } catch (err: any) {
        setError(
          err?.message || 'Failed to load residents',
        );
      } finally {
        setIsLoading(false);
      }
    },
    [
      pagination.page,
      search,
      filterBuildingId,
      filterWingId,
      filterStatus,
      sortBy,
      sortOrder,
    ],
  );

  useEffect(() => {
    fetchResidents();
  }, [fetchResidents]);

  /* ============================================================
     SEARCH
  ============================================================ */

  const handleSearch = () => {
    setPagination((p) => ({
      ...p,
      page: 1,
    }));

    setSearch(searchInput);
  };

  /* ============================================================
     SORT
  ============================================================ */

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder((o) =>
        o === 'asc' ? 'desc' : 'asc',
      );
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  /* ============================================================
     PAGINATION
  ============================================================ */

  const goToPage = (page: number) => {
    if (
      page < 1 ||
      page > pagination.totalPages
    ) {
      return;
    }

    setPagination((p) => ({
      ...p,
      page,
    }));
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];

    const total = pagination.totalPages;
    const current = pagination.page;

    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (current > 3) {
        pages.push('...');
      }

      const start = Math.max(2, current - 1);
      const end = Math.min(
        total - 1,
        current + 1,
      );

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (current < total - 2) {
        pages.push('...');
      }

      pages.push(total);
    }

    return pages;
  };

  /* ============================================================
     DELETE
  ============================================================ */

  const handleDelete = async () => {
    if (!deleteResident) return;

    setIsDeleting(true);

    try {
      const res = await fetch(
        getApiUrl() +
          `/api/admin/residents/${deleteResident.id}`,
        {
          method: 'DELETE',
          headers: authHeaders(),
        },
      );

      if (res.status === 409) {
        const err = await res
          .json()
          .catch(() => ({
            error: 'Cannot delete',
          }));

        toast.error(
          err.error ||
            'This resident has donation records and cannot be deleted.',
        );

        setDeleteResident(null);

        return;
      }

      if (!res.ok) {
        throw new Error('Failed to delete');
      }

      toast.success(
        'Resident deleted successfully',
      );

      setDeleteResident(null);

      fetchResidents();
    } catch (err: any) {
      toast.error(
        err?.message ||
          'Failed to delete resident',
      );
    } finally {
      setIsDeleting(false);
    }
  };

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#080808] pb-20 text-white">
      {/* ========================================================
          BACKGROUND
      ======================================================== */}

      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,170,70,0.10),transparent_35%)]" />

        <div className="absolute -left-40 top-40 h-96 w-96 rounded-full bg-amber-400/[0.035] blur-[120px]" />

        <div className="absolute -right-40 top-[45%] h-96 w-96 rounded-full bg-orange-400/[0.025] blur-[120px]" />

        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#080808]" />
      </div>

      {/* ========================================================
          HEADER
      ======================================================== */}

      <header className="relative z-10 border-b border-white/10 bg-black/30 backdrop-blur-2xl">
        <div className="mx-auto max-w-7xl px-5 py-7 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <Link
              href="/admin"
              className="group flex w-fit items-center gap-2 text-white/45 transition hover:text-white"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] transition group-hover:border-amber-300/20 group-hover:bg-amber-300/10">
                <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-0.5" />
              </span>

              <span className="text-xs font-medium">
                Admin
              </span>
            </Link>

            <div className="hidden h-8 w-px bg-white/10 sm:block" />

            <div className="flex-1">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/10 shadow-[0_0_25px_rgba(251,191,36,0.08)]">
                  <Building2 className="h-5 w-5 text-amber-300" />
                </div>

                <div>
                  <p className="mb-0.5 text-[9px] font-semibold uppercase tracking-[0.3em] text-amber-300/70">
                    Community Management
                  </p>

                  <h1 className="font-serif text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                    Residents
                  </h1>
                </div>
              </div>

              <p className="mt-2 text-sm text-white/40">
                Manage and organize all registered residents.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button onClick={() => exportResidents('excel')} disabled={!!exporting} className="inline-flex items-center gap-2 rounded-full border-amber-300/30 px-4 py-3 text-sm font-semibold text-amber-200 disabled:opacity-50"><FileSpreadsheet className="h-4 w-4" />{exporting === 'excel' ? 'Downloading…' : 'Download Excel'}</button>
              <button onClick={() => exportResidents('csv')} disabled={!!exporting} className="inline-flex items-center gap-2 rounded-full border-white/15 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"><Download className="h-4 w-4" />{exporting === 'csv' ? 'Downloading…' : 'Download CSV'}</button>
            </div>

            <Link
              href="/admin/residents"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black shadow-[0_0_35px_rgba(255,255,255,0.08)] transition hover:scale-[1.02]"
            >
              <Plus className="h-4 w-4" />

              Add Resident

              <span className="transition group-hover:translate-x-0.5">
                →
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* ========================================================
          CONTENT
      ======================================================== */}

      <main className="relative z-10 mx-auto max-w-7xl px-5 pt-7 sm:px-6 lg:px-8">
        {/* ======================================================
            TOP STATS
        ====================================================== */}

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat
            label="Total Residents"
            value={pagination.total}
            icon={<User className="h-4 w-4" />}
          />

          <MiniStat
            label="Page"
            value={`${pagination.page} / ${Math.max(
              pagination.totalPages,
              1,
            )}`}
            icon={<Hash className="h-4 w-4" />}
          />

          <MiniStat
            label="Building Filter"
            value={
              filterBuildingId
                ? buildings.find(
                    (b) =>
                      b.id ===
                      filterBuildingId,
                  )?.buildingName || 'Selected'
                : 'All'
            }
            icon={<Building2 className="h-4 w-4" />}
          />

          <MiniStat
            label="Status"
            value={
              filterStatus
                ? filterStatus
                : 'All'
            }
            icon={<Sparkles className="h-4 w-4" />}
          />
        </div>

        {/* ======================================================
            FILTER PANEL
        ====================================================== */}

        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            glassCard,
            'mb-6 rounded-2xl p-4 sm:p-5',
          )}
        >
          <div className="mb-4 flex items-center gap-2">
            <Filter className="h-4 w-4 text-amber-300" />

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
                Search & Filters
              </p>

              <p className="mt-0.5 text-[11px] text-white/30">
                Find residents quickly
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-[1.6fr_1fr_0.8fr_0.7fr_auto]">
            {/* Search */}

            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.15em] text-white/35">
                Search
              </label>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />

                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) =>
                      setSearchInput(
                        e.target.value,
                      )
                    }
                    onKeyDown={(e) =>
                      e.key === 'Enter' &&
                      handleSearch()
                    }
                    placeholder="Name, mobile or flat..."
                    className={cn(
                      inputStyle,
                      'pl-9',
                    )}
                  />
                </div>

                <button
                  onClick={handleSearch}
                  className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-white text-black transition hover:scale-105"
                >
                  <Search className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Building */}

            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.15em] text-white/35">
                Building
              </label>

              <select
                value={filterBuildingId || ''}
                onChange={(e) => {
                  setFilterBuildingId(
                    e.target.value
                      ? parseInt(
                          e.target.value,
                        )
                      : null,
                  );

                  setFilterWingId(null);
                }}
                className={selectStyle}
              >
                <option value="">
                  All Buildings
                </option>

                {buildings.map((b) => (
                  <option
                    key={b.id}
                    value={b.id}
                  >
                    {b.buildingName}
                  </option>
                ))}
              </select>
            </div>

            {/* Wing */}

            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.15em] text-white/35">
                Wing
              </label>

              <select
                value={filterWingId || ''}
                onChange={(e) =>
                  setFilterWingId(
                    e.target.value
                      ? parseInt(
                          e.target.value,
                        )
                      : null,
                  )
                }
                className={cn(
                  selectStyle,
                  !filterBuildingId &&
                    'cursor-not-allowed opacity-40',
                )}
                disabled={!filterBuildingId}
              >
                <option value="">
                  All Wings
                </option>

                {filterWings.map((w) => (
                  <option
                    key={w.id}
                    value={w.id}
                  >
                    {w.wingName}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}

            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.15em] text-white/35">
                Status
              </label>

              <select
                value={filterStatus}
                onChange={(e) =>
                  setFilterStatus(
                    e.target.value,
                  )
                }
                className={selectStyle}
              >
                <option value="">All</option>
                <option value="active">
                  Active
                </option>
                <option value="inactive">
                  Inactive
                </option>
              </select>
            </div>

            {/* Refresh */}

            <button
              onClick={() => fetchResidents()}
              disabled={isLoading}
              title="Refresh"
              className="flex h-[42px] items-center justify-center self-end rounded-xl border border-white/10 bg-white/[0.04] px-4 text-white/50 transition hover:border-amber-300/20 hover:bg-amber-300/10 hover:text-amber-300 disabled:opacity-40"
            >
              <RefreshCw
                className={cn(
                  'h-4 w-4',
                  isLoading &&
                    'animate-spin',
                )}
              />
            </button>
          </div>
        </motion.section>

        {/* ======================================================
            TABLE
        ====================================================== */}

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className={cn(
            glassCard,
            'overflow-hidden rounded-2xl',
          )}
        >
          {isLoading ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center">
              <div className="relative">
                <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/10 border-t-amber-300" />

                <div className="absolute inset-0 rounded-full bg-amber-300/10 blur-xl" />
              </div>

              <p className="mt-4 text-xs uppercase tracking-[0.2em] text-white/30">
                Loading residents
              </p>
            </div>
          ) : error ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center px-5 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-red-400/20 bg-red-400/10">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>

              <p className="mt-4 font-semibold text-white">
                Unable to load residents
              </p>

              <p className="mt-1 text-sm text-white/35">
                {error}
              </p>

              <button
                onClick={() =>
                  fetchResidents()
                }
                className="mt-5 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:scale-105"
              >
                Retry
              </button>
            </div>
          ) : residents.length === 0 ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center px-5 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-300/15 bg-amber-300/[0.06]">
                <User className="h-7 w-7 text-amber-300/60" />
              </div>

              <h3 className="mt-5 font-serif text-xl font-semibold text-white">
                No residents found
              </h3>

              <p className="mt-1 text-sm text-white/35">
                Try changing your filters or add a new resident.
              </p>

              <Link
                href="/admin/residents"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:scale-105"
              >
                <Plus className="h-4 w-4" />

                Add Resident
              </Link>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px]">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.025]">
                      <th className="w-[60px] px-4 py-4 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-white/25">
                        #
                      </th>

                      <th className="px-4 py-4 text-left">
                        <SortHeader
                          label="Name"
                          field="fullName"
                          currentSort={sortBy}
                          currentOrder={
                            sortOrder
                          }
                          onSort={
                            handleSort
                          }
                        />
                      </th>

                      <th className="px-4 py-4 text-left">
                        <SortHeader
                          label="Building"
                          field="buildingName"
                          currentSort={sortBy}
                          currentOrder={
                            sortOrder
                          }
                          onSort={
                            handleSort
                          }
                        />
                      </th>

                      <th className="px-4 py-4 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-white/40">
                        Wing
                      </th>

                      <th className="px-4 py-4 text-left">
                        <SortHeader
                          label="Flat"
                          field="flatNo"
                          currentSort={sortBy}
                          currentOrder={
                            sortOrder
                          }
                          onSort={
                            handleSort
                          }
                        />
                      </th>

                      <th className="px-4 py-4 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-white/40">
                        Mobile
                      </th>

                      <th className="hidden px-4 py-4 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-white/40 md:table-cell">
                        Status
                      </th>

                      <th className="px-4 py-4 text-left">
                        <SortHeader
                          label="Created"
                          field="createdAt"
                          currentSort={sortBy}
                          currentOrder={
                            sortOrder
                          }
                          onSort={
                            handleSort
                          }
                        />
                      </th>

                      <th className="w-[125px] px-4 py-4 text-right text-[10px] font-bold uppercase tracking-[0.15em] text-white/40">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {residents.map(
                      (r, idx) => (
                        <motion.tr
                          key={r.id}
                          initial={{
                            opacity: 0,
                          }}
                          animate={{
                            opacity: 1,
                          }}
                          transition={{
                            delay:
                              idx * 0.025,
                          }}
                          className="group border-b border-white/[0.055] transition hover:bg-white/[0.025]"
                        >
                          <td className="px-4 py-4 font-mono text-xs text-white/20">
                            {(
                              (pagination.page -
                                1) *
                                pagination.limit +
                              idx +
                              1
                            )
                              .toString()
                              .padStart(
                                2,
                                '0',
                              )}
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-xs font-semibold text-white/60 transition group-hover:border-amber-300/20 group-hover:bg-amber-300/10 group-hover:text-amber-300">
                                {r.fullName
                                  .charAt(
                                    0,
                                  )
                                  .toUpperCase()}
                              </div>

                              <div>
                                <p className="font-medium text-white/90">
                                  {
                                    r.fullName
                                  }
                                </p>

                                <p className="mt-0.5 text-[10px] text-white/25">
                                  Resident
                                  #{r.id}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300/10 bg-amber-300/[0.06] px-2.5 py-1.5 text-xs font-medium text-amber-200/80">
                              <Building2 className="h-3 w-3 text-amber-300/70" />

                              {r.buildingName ||
                                '—'}
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            {r.wingName ? (
                              <span className="font-mono text-sm font-semibold text-white/70">
                                {r.wingName}
                              </span>
                            ) : (
                              <span className="text-sm text-white/20">
                                —
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-4">
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300/20 bg-amber-300/10 px-2.5 py-1.5 font-mono text-xs font-bold text-amber-300">
                              <Home className="h-3 w-3" />

                              {r.flatNo}
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            <span className="flex items-center gap-2 text-sm text-white/55">
                              <Phone className="h-3 w-3 text-white/25" />

                              {r.mobile}
                            </span>
                          </td>

                          <td className="hidden px-4 py-4 md:table-cell">
                            <StatusBadge
                              status={
                                r.status
                              }
                            />
                          </td>

                          <td className="px-4 py-4">
                            <span className="flex items-center gap-1.5 text-xs text-white/35">
                              <CalendarDays className="h-3 w-3" />

                              {formatDate(
                                r.createdAt,
                              )}
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex items-center justify-end gap-1">
                              <ActionButton
                                icon={
                                  <Eye className="h-3.5 w-3.5" />
                                }
                                title="View"
                                onClick={() =>
                                  setViewResident(
                                    r,
                                  )
                                }
                              />

                              <ActionButton
                                icon={
                                  <Edit3 className="h-3.5 w-3.5" />
                                }
                                title="Edit"
                                amber
                                onClick={() =>
                                  setEditResident(
                                    r,
                                  )
                                }
                              />

                              <ActionButton
                                icon={
                                  <Trash2 className="h-3.5 w-3.5" />
                                }
                                title="Delete"
                                danger
                                onClick={() =>
                                  setDeleteResident(
                                    r,
                                  )
                                }
                              />
                            </div>
                          </td>
                        </motion.tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>

              {/* ==================================================
                  PAGINATION
              ================================================== */}

              {pagination.totalPages > 1 && (
                <div className="flex flex-col gap-4 border-t border-white/10 bg-white/[0.018] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-xs text-white/30">
                    Showing{' '}
                    <span className="text-white/60">
                      {(pagination.page -
                        1) *
                        pagination.limit +
                        1}
                      –
                      {Math.min(
                        pagination.page *
                          pagination.limit,
                        pagination.total,
                      )}
                    </span>{' '}
                    of{' '}
                    <span className="text-white/60">
                      {pagination.total}
                    </span>{' '}
                    residents
                  </span>

                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() =>
                        goToPage(
                          pagination.page -
                            1,
                        )
                      }
                      disabled={
                        pagination.page <=
                        1
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-white/40 transition hover:bg-white/[0.07] hover:text-white disabled:opacity-20"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>

                    {getPageNumbers().map(
                      (p, i) =>
                        typeof p ===
                        'string' ? (
                          <span
                            key={`ellipsis-${i}`}
                            className="px-2 text-xs text-white/20"
                          >
                            ...
                          </span>
                        ) : (
                          <button
                            key={p}
                            onClick={() =>
                              goToPage(p)
                            }
                            className={cn(
                              'h-8 min-w-8 rounded-lg px-2 text-xs font-semibold transition',
                              p ===
                                pagination.page
                                ? 'bg-amber-300 text-black shadow-[0_0_20px_rgba(252,211,77,0.12)]'
                                : 'text-white/40 hover:bg-white/[0.06] hover:text-white',
                            )}
                          >
                            {p}
                          </button>
                        ),
                    )}

                    <button
                      onClick={() =>
                        goToPage(
                          pagination.page +
                            1,
                        )
                      }
                      disabled={
                        pagination.page >=
                        pagination.totalPages
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-white/40 transition hover:bg-white/[0.07] hover:text-white disabled:opacity-20"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </motion.section>
      </main>

      {/* ========================================================
          MODALS
      ======================================================== */}

      {viewResident && (
        <ViewResidentModal
          resident={viewResident}
          onClose={() =>
            setViewResident(null)
          }
        />
      )}

      {editResident && (
        <EditResidentModal
          resident={editResident}
          buildings={buildings}
          onClose={() =>
            setEditResident(null)
          }
          onSaved={() => {
            fetchResidents();
          }}
        />
      )}

      {deleteResident && (
        <DeleteConfirmDialog
          resident={deleteResident}
          onConfirm={handleDelete}
          onCancel={() =>
            setDeleteResident(null)
          }
          isLoading={isDeleting}
        />
      )}
    </div>
  );
}

/* ============================================================
   MINI STAT
============================================================ */

function MiniStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        glassCard,
        'rounded-2xl p-4',
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-300/15 bg-amber-300/[0.06] text-amber-300">
          {icon}
        </div>

        <div className="min-w-0">
          <p className="truncate text-[9px] font-semibold uppercase tracking-[0.15em] text-white/30">
            {label}
          </p>

          <p className="mt-1 truncate text-sm font-semibold text-white/80">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   ACTION BUTTON
============================================================ */

function ActionButton({
  icon,
  title,
  onClick,
  amber,
  danger,
}: {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
  amber?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-white/35 transition',
        !amber &&
          !danger &&
          'hover:border-sky-300/15 hover:bg-sky-300/10 hover:text-sky-300',
        amber &&
          'hover:border-amber-300/15 hover:bg-amber-300/10 hover:text-amber-300',
        danger &&
          'hover:border-red-400/15 hover:bg-red-400/10 hover:text-red-400',
      )}
    >
      {icon}
    </button>
  );
}
