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
  Home,
  Upload,
  FolderOpen,
  X,
  Save,
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
  bannerImageUrl?: string | null;
  googleDriveUrl?: string | null;
  shortDescription?: string | null;
  venue?: string | null;
  homepageVisible?: boolean;
  isHomepageFeatured?: boolean;
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
  const [deleteFestival, setDeleteFestival] = useState<Festival | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Homepage showcase modal state
  const [showHomepageModal, setShowHomepageModal] = useState(false);
  const [selectedFestivalId, setSelectedFestivalId] = useState<number | null>(null);
  const [hfVisible, setHfVisible] = useState(true);
  const [hfName, setHfName] = useState('');
  const [hfShortDescription, setHfShortDescription] = useState('');
  const [hfDescription, setHfDescription] = useState('');
  const [hfVenue, setHfVenue] = useState('Medtiya Nagar, Mumbai');
  const [hfStartDate, setHfStartDate] = useState('');
  const [hfEndDate, setHfEndDate] = useState('');
  const [hfBannerUrl, setHfBannerUrl] = useState('');
  const [hfGoogleDriveUrl, setHfGoogleDriveUrl] = useState('');
  const [isSavingHomepage, setIsSavingHomepage] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Initialize homepage showcase form when selecting festival
  const selectShowcaseFestival = (fId: number) => {
    setSelectedFestivalId(fId);
    const target = festivals.find((item) => item.id === fId);
    if (target) {
      setHfVisible(target.homepageVisible !== false);
      setHfName(target.name || '');
      setHfShortDescription(target.shortDescription || '');
      setHfDescription(target.description || '');
      setHfVenue(target.venue || 'Medtiya Nagar, Mumbai');
      setHfStartDate(target.startDate ? target.startDate.split('T')[0] : '');
      setHfEndDate(target.endDate ? target.endDate.split('T')[0] : '');
      setHfBannerUrl(target.bannerImageUrl || '');
      setHfGoogleDriveUrl(target.googleDriveUrl || '');
    }
  };

  const openHomepageModal = () => {
    // Pick the currently featured festival, or the first active one
    const featured = festivals.find((f) => f.isHomepageFeatured) || festivals.find((f) => f.isActive) || festivals[0];
    if (featured) {
      selectShowcaseFestival(featured.id);
    }
    setShowHomepageModal(true);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5 MB');
      return;
    }
    const formData = new FormData();
    formData.append('image', file);
    setIsUploadingPhoto(true);
    try {
      const token = getAdminToken();
      const res = await fetch(`${getApiUrl()}/api/admin/uploads/festival-image`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload image');
      const url = data.secureUrl || data.secure_url;
      setHfBannerUrl(url);
      toast.success('Festival photo uploaded successfully');
    } catch (err: any) {
      toast.error(err.message || 'Image upload failed');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSaveHomepageFestival = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFestivalId) {
      toast.error('Please select a festival');
      return;
    }
    if (!hfName.trim()) {
      toast.error('Festival name cannot be empty');
      return;
    }
    if (hfGoogleDriveUrl && !/^https:\/\/drive\.google\.com\//i.test(hfGoogleDriveUrl.trim())) {
      toast.error('Please enter a valid Google Drive link.');
      return;
    }

    setIsSavingHomepage(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/admin/festivals/homepage-featured`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          festivalId: selectedFestivalId,
          homepageVisible: hfVisible,
          festivalName: hfName.trim(),
          shortDescription: hfShortDescription.trim(),
          description: hfDescription.trim(),
          venue: hfVenue.trim(),
          startDate: hfStartDate || null,
          endDate: hfEndDate || null,
          bannerImageUrl: hfBannerUrl.trim() || null,
          googleDriveUrl: hfGoogleDriveUrl.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update homepage festival');
      toast.success('Homepage Festival Showcase updated!');
      setShowHomepageModal(false);
      await fetchFestivals();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save homepage festival');
    } finally {
      setIsSavingHomepage(false);
    }
  };

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
            <div className="flex items-center gap-3">
              {canManageFestivals && (
                <button
                  onClick={openHomepageModal}
                  className="group flex items-center gap-2 px-4 md:px-5 py-3 rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#D4AF37] hover:bg-[#D4AF37]/20 font-bold text-sm shadow-lg shadow-[#D4AF37]/5 transition-all"
                >
                  <Home className="w-4 h-4 text-[#D4AF37]" />
                  <span className="hidden sm:inline">Homepage Festival</span>
                  <span className="sm:hidden">Homepage</span>
                </button>
              )}

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

      {/* Homepage Festival Showcase Modal */}
      {showHomepageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-3xl border border-[#D4AF37]/25 bg-[#0e0e0e] shadow-2xl p-6 sm:p-8 my-8 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-5 border-b border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center">
                  <Home className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <div>
                  <h2 className="text-xl font-serif font-bold text-white">Homepage Festival Showcase</h2>
                  <p className="text-xs text-zinc-400">Configure which festival is showcased on the public homepage</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHomepageModal(false)}
                className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveHomepageFestival} className="mt-6 space-y-5">
              {/* Select Festival Dropdown */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#D4AF37]">
                  Select Festival
                </label>
                <select
                  value={selectedFestivalId || ''}
                  onChange={(e) => selectShowcaseFestival(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-black/60 text-white text-sm outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 transition-all [color-scheme:dark]"
                >
                  {festivals.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.year}) {f.isHomepageFeatured ? '★ [Current Homepage]' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Homepage Visible Toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-white/[0.08] bg-white/[0.02]">
                <div>
                  <p className="text-sm font-semibold text-white">Homepage Visibility</p>
                  <p className="text-xs text-zinc-500">Show or hide the Festival showcase section on the homepage</p>
                </div>
                <button
                  type="button"
                  onClick={() => setHfVisible(!hfVisible)}
                  className={cn(
                    'px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border transition-all',
                    hfVisible
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                  )}
                >
                  {hfVisible ? 'ON (Visible)' : 'OFF (Hidden)'}
                </button>
              </div>

              {/* Festival Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-400">Festival Name</label>
                <input
                  type="text"
                  required
                  value={hfName}
                  onChange={(e) => setHfName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/[0.03] text-white text-sm outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 transition-all"
                />
              </div>

              {/* Short Description */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-400">Short Description (for Homepage subtitle/summary)</label>
                <input
                  type="text"
                  value={hfShortDescription}
                  onChange={(e) => setHfShortDescription(e.target.value)}
                  placeholder="Grand community celebrations with devotion, culture, and togetherness."
                  className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/[0.03] text-white text-sm outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 transition-all"
                />
              </div>

              {/* Full Description */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-400">Full Description</label>
                <textarea
                  rows={3}
                  value={hfDescription}
                  onChange={(e) => setHfDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/[0.03] text-white text-sm outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 transition-all"
                />
              </div>

              {/* Venue & Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5 sm:col-span-1">
                  <label className="block text-xs font-medium text-zinc-400">Venue / Location</label>
                  <input
                    type="text"
                    value={hfVenue}
                    onChange={(e) => setHfVenue(e.target.value)}
                    placeholder="Medtiya Nagar, Mumbai"
                    className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/[0.03] text-white text-sm outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 transition-all"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-1">
                  <label className="block text-xs font-medium text-zinc-400">Start Date</label>
                  <input
                    type="date"
                    value={hfStartDate}
                    onChange={(e) => setHfStartDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/[0.03] text-white text-sm outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 transition-all [color-scheme:dark]"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-1">
                  <label className="block text-xs font-medium text-zinc-400">End Date</label>
                  <input
                    type="date"
                    value={hfEndDate}
                    onChange={(e) => setHfEndDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/[0.03] text-white text-sm outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 transition-all [color-scheme:dark]"
                  />
                </div>
              </div>

              {/* Festival Photo (Upload / Preview) */}
              <div className="space-y-2 pt-2 border-t border-white/[0.08]">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#D4AF37]">
                  Festival Photo
                </label>
                {hfBannerUrl ? (
                  <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-white/10 bg-black group">
                    <img src={hfBannerUrl} alt="Festival Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <label className="cursor-pointer px-4 py-2 bg-[#D4AF37] text-black rounded-xl font-bold text-xs hover:bg-[#E5C158] transition-all flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5" /> Replace Photo
                        <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                      </label>
                      <button
                        type="button"
                        onClick={() => setHfBannerUrl('')}
                        className="px-4 py-2 bg-red-500/20 text-red-300 border border-red-500/30 rounded-xl font-bold text-xs hover:bg-red-500/30 transition-all"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border border-dashed border-white/20 rounded-2xl p-6 text-center bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                    <label className="cursor-pointer inline-flex flex-col items-center">
                      <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center mb-2">
                        <Upload className="w-6 h-6 text-[#D4AF37]" />
                      </div>
                      <span className="text-sm font-semibold text-white">
                        {isUploadingPhoto ? 'Uploading...' : 'Upload Festival Photo'}
                      </span>
                      <span className="text-xs text-zinc-500 mt-1">PNG, JPG, or WEBP up to 5 MB</span>
                      <input type="file" accept="image/*" disabled={isUploadingPhoto} onChange={handlePhotoUpload} className="hidden" />
                    </label>
                  </div>
                )}
                {/* Optional manual URL */}
                <input
                  type="url"
                  placeholder="Or paste external image URL: https://..."
                  value={hfBannerUrl}
                  onChange={(e) => setHfBannerUrl(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-white/10 bg-white/[0.02] text-xs text-white placeholder:text-zinc-600 outline-none focus:border-[#D4AF37]/60"
                />
              </div>

              {/* Google Drive URL */}
              <div className="space-y-1.5 pt-2 border-t border-white/[0.08]">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#D4AF37] flex items-center gap-1.5">
                  <FolderOpen className="w-4 h-4" /> Google Drive URL
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={hfGoogleDriveUrl}
                  onChange={(e) => setHfGoogleDriveUrl(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/[0.03] text-white text-sm outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 transition-all"
                />
                <p className="text-[11px] text-zinc-500">Only Google Drive links are accepted. Opens public Drive photos in a new tab.</p>
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowHomepageModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-white/10 text-zinc-400 hover:text-white hover:bg-white/[0.05] text-sm font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingHomepage || isUploadingPhoto}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#E5C158] text-black font-bold text-sm shadow-lg shadow-[#D4AF37]/15 hover:shadow-[#D4AF37]/30 hover:brightness-110 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSavingHomepage ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}