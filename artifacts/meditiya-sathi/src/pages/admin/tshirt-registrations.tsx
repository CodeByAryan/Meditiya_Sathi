import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearch } from 'wouter';
import {
  ArrowLeft, Shirt, Search, Plus, X, CheckCircle, Clock, User, Phone,
  Save, ChevronDown, AlertTriangle, Eye, Edit3, Trash2, RefreshCw,
  ChevronLeft, ChevronRight, ListFilter, Building2, Download, Ruler,
  CreditCard, Banknote, Wallet, QrCode, Printer, IndianRupee, ExternalLink, Camera,
  FileText, Share2,
} from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { cn, getApiUrl } from '@/lib/utils';
import { PENDING_REASONS } from '@/lib/pending-reasons';

// ── Types ────────────────────────────────────────────────────────────────────

interface FestivalOption {
  id: number;
  name: string;
  year: number;
  status: string;
  isActive: boolean;
}

interface Building {
  id: number;
  buildingName: string;
  hasWings: boolean;
}

interface Wing {
  id: number;
  wingName: string;
}

interface AdminOption {
  id: string;
  fullName: string;
  username: string;
  role: string;
}

interface TshirtRegistration {
  id: number;
  festivalId: number;
  festivalName: string;
  festivalYear: number;
  name: string;
  mobileNumber: string;
  buildingId: number;
  buildingName: string;
  wingId: number | null;
wingName: string | null;
  tShirtSize: string;
  tShirtSizeNumeric: number | null;
  quantity: number;
  tshirtPrice: number;
  totalAmount: number;
  chestSize: number | null;
  paidToAdminId: string | null;
  paidToName: string | null;
paymentMode: string;
  pendingReason: string | null;
  collectionId: string | null;
  collectionStatus: string;
  collectedAt: string | null;
  collectedByAdminId: string | null;
  collectedByName: string | null;
  collectionNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Pagination { page: number; limit: number; total: number; totalPages: number; }

interface Summary {
  totalRegistrations?: number;
  totalQuantity?: number;
  totalTshirtAmount?: number;
  totalAmountCollected?: number;
  distributedTshirts?: number;
  // compatibility aliases for older summary consumers
  total?: number;
  totalTshirts?: number;
  totalAmount?: number;
  amountCollected?: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

const T_SHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

const QUANTITY_OPTIONS = [1, 2, 3, 4, 5];

const TSHIRT_PRICES = [230, 250];

const PAYMENT_MODES = [
  { value: 'cash', label: '💵 Cash' },
  { value: 'upi', label: '📱 UPI' },
  { value: 'online', label: '🌐 Online' },
  { value: 'pending', label: '⏳ Pending' },
];

const paymentModeLabels: Record<string, string> = {
  cash: 'Cash', upi: 'UPI', online: 'Online', pending: 'Pending',
};

const paymentModeIcons: Record<string, any> = {
  cash: Banknote, upi: CreditCard, online: Wallet, pending: Clock,
};

// ── Auth helpers ─────────────────────────────────────────────────────────────

function getAdminToken(): string | null {
  try {
    const stored = localStorage.getItem('admin_auth');
    if (!stored) return null;
    return JSON.parse(stored)?.token || null;
  } catch { return null; }
}

function getAdminUser(): { fullName: string; username: string; role: string } | null {
  try {
    const stored = localStorage.getItem('admin_auth');
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return { fullName: parsed.fullName, username: parsed.username, role: parsed.role };
  } catch { return null; }
}

function authHeaders(): Record<string, string> {
  const token = getAdminToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  try { return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return dateStr; }
}

function isPaid(mode: string): boolean {
  return mode !== 'pending';
}

function formatCurrency(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

// ── Stats Card ──────────────────────────────────────────────────────────────

function StatsCard({ title, value, icon: Icon, color, subtitle }: {
  title: string; value: string; icon: any; color: string; subtitle?: string;
}) {
  return (
    <div className="glass-card-glow rounded-xl p-4 relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-purple-500 to-teal-400 opacity-60" />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className={cn("text-2xl font-bold mt-1", color)}>{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-muted shrink-0">
          <Icon className={cn("w-5 h-5", color)} />
        </div>
      </div>
    </div>
  );
}

// ── Building Search Dropdown ────────────────────────────────────────────────

function BuildingSearchDropdown({ onSelect, selectedBuilding, onClear }: {
  onSelect: (building: Building) => void;
  selectedBuilding: Building | null;
  onClear: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Building[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (selectedBuilding) return;
    if (query.length < 1) { setResults([]); setIsOpen(false); return; }
    fetch(`${getApiUrl()}/api/admin/buildings/manage`, { headers: authHeaders() })
      .then(r => r.json())
      .then((data: Building[]) => {
        const filtered = data.filter(b =>
          b.buildingName.toLowerCase().includes(query.toLowerCase())
        );
        setResults(filtered);
        setIsOpen(true);
      })
      .catch(() => {});
  }, [query, selectedBuilding]);

  const handleSelect = (b: Building) => {
    onSelect(b);
    setQuery(b.buildingName);
    setIsOpen(false);
  };

  const handleClear = () => {
    onClear();
    setQuery('');
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-xs font-semibold text-foreground mb-1.5">Building <span className="text-destructive">*</span></label>
      <div className="relative">
        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); if (selectedBuilding) handleClear(); }}
          onFocus={() => { if (results.length > 0) setIsOpen(true); }}
          placeholder="Search building..."
          className="w-full pl-10 pr-10 py-2.5 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none"
        />
        {selectedBuilding && (
          <button type="button" onClick={handleClear} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-destructive">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && !selectedBuilding && (
        <div className="floating-suggestion-panel mt-1 max-h-60 overflow-y-auto rounded-xl border border-border shadow-xl">
          {results.map(b => (
            <button
              key={b.id}
              type="button"
              onClick={() => handleSelect(b)}
              className="w-full px-3 py-2.5 text-left hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0"
            >
              <span className="font-semibold text-foreground text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" /> {b.buildingName}
              </span>
            </button>
          ))}
        </div>
      )}

      {isOpen && results.length === 0 && query.length >= 2 && (
        <div className="floating-suggestion-panel mt-1 rounded-xl border border-border p-4 text-center text-sm text-muted-foreground shadow-xl">
          No buildings found matching "{query}"
        </div>
      )}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

// ── WhatsApp PDF helpers ──────────────────────────────────────────────────

function getPublicAppUrl(): string {
  const envUrl =
    (import.meta as any).env?.VITE_PUBLIC_APP_URL ||
    (import.meta as any).env?.PUBLIC_APP_URL ||
    (import.meta as any).env?.VITE_FRONTEND_URL ||
    (import.meta as any).env?.VITE_WEB_APP_URL;

  if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
    return envUrl.replace(/\/+$/, "");
  }

  if (typeof window !== "undefined" && window.location.origin) {
    const origin = window.location.origin.replace(/\/+$/, "");
    if (!origin.includes("localhost") && !origin.includes("127.0.0.1") && !origin.includes(":8080")) {
      return origin;
    }
  }

  return "https://meditiya-sathi.vercel.app";
}

function normalizePublicUrl(rawUrl: string): string {
  if (!rawUrl) return "";
  const publicBase = getPublicAppUrl();
  if (rawUrl.startsWith("/")) {
    return `${publicBase}${rawUrl}`;
  }
  if (rawUrl.includes("localhost:") || rawUrl.includes("127.0.0.1:")) {
    try {
      const parsed = new URL(rawUrl);
      return `${publicBase}${parsed.pathname}${parsed.search}`;
    } catch {}
  }
  return rawUrl;
}

function formatWhatsAppUrl(phone: string, text: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    cleaned = `91${cleaned}`;
  } else if (cleaned.length === 11 && cleaned.startsWith("0")) {
    cleaned = `91${cleaned.slice(1)}`;
  } else if (cleaned.length === 12 && cleaned.startsWith("91")) {
    // already 91
  }
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(text)}`;
}

function buildTshirtWhatsAppMessage(data: {
  name: string;
  tshirtId: string;
  tShirtSize: string;
  quantity: number;
  pdfUrl: string;
}): string {
  const publicPdf = normalizePublicUrl(data.pdfUrl);
  return `Hello ${data.name} 👋\n\nYour Meditiya Sathi T-shirt registration is confirmed.\n\nT-Shirt ID: ${data.tshirtId}\nSize: ${data.tShirtSize}\nQuantity: ${data.quantity}\n\n📄 Your T-shirt collection PDF:\n${publicPdf}\n\nPlease keep this PDF safe and show the QR code inside it when collecting your T-shirt.\n\nImportant:\n• This QR code is linked to your T-shirt registration.\n• Please do not share it with another person.\n• Bring/show this QR code when collecting your T-shirt.\n• Your T-shirt payment is already recorded as PAID.\n\nThank you for participating in Meditiya Sathi! 🙏`;
}

export default function AdminTshirtRegistrations() {
// wouter v3's useSearch() returns the query string (e.g. "festivalId=123")
  // while useLocation() returns only the pathname. Use useSearch() so we can
  // read the festival pre-selected from the Festival Detail page.
  const urlSearch = useSearch();

  // Read ?festivalId=ID (or legacy ?festival=ID) from URL to pre-select a festival
  // (e.g. from the festival detail page). This mirrors the Donation flow's
  // navigation/prefill pattern: opening the page with a festivalId query param
  // auto-selects that festival in the Add form.
  const initialFestivalId = (() => {
    try {
      const qp = new URLSearchParams(urlSearch);
      const v = qp.get('festivalId') || qp.get('festival');
      return v && !isNaN(parseInt(v, 10)) ? String(parseInt(v, 10)) : '';
    } catch { return ''; }
  })();

  const [festivals, setFestivals] = useState<FestivalOption[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [wings, setWings] = useState<Wing[]>([]);
  const [admins, setAdmins] = useState<AdminOption[]>([]);
  const [registrations, setRegistrations] = useState<TshirtRegistration[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form state
  const [selectedFestival, setSelectedFestival] = useState<number | ''>('');
  const [name, setName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [selectedWing, setSelectedWing] = useState<number | ''>('');
  const [tShirtSize, setTShirtSize] = useState('');
  const [tShirtSizeNumeric, setTShirtSizeNumeric] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [tshirtPrice, setTshirtPrice] = useState(250);
  const [chestSize, setChestSize] = useState('');
  const [paidToAdminId, setPaidToAdminId] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [pendingReason, setPendingReason] = useState('');
  const [pendingCustomReason, setPendingCustomReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filterFestival, setFilterFestival] = useState(initialFestivalId);
  const [filterBuilding, setFilterBuilding] = useState('');
  const [filterWing, setFilterWing] = useState('');
  const [filterSize, setFilterSize] = useState('');
  const [filterQuantity, setFilterQuantity] = useState('');
  const [filterPaymentMode, setFilterPaymentMode] = useState('');
  const [filterPaidTo, setFilterPaidTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

// Modals
  const [viewReg, setViewReg] = useState<TshirtRegistration | null>(null);
  const [editReg, setEditReg] = useState<TshirtRegistration | null>(null);
  const [deleteReg, setDeleteReg] = useState<TshirtRegistration | null>(null);
  const [qrReg, setQrReg] = useState<TshirtRegistration | null>(null);
  const [sendingPdfId, setSendingPdfId] = useState<number | null>(null);

  const handleSendPdfOnWhatsApp = async (registration: TshirtRegistration) => {
    try {
      setSendingPdfId(registration.id);
      toast.info(`Generating collection PDF for ${registration.name}...`);

      const res = await fetch(`${getApiUrl()}/api/admin/tshirt-registrations/${registration.id}/pdf`, {
        method: "POST",
        headers: authHeaders(),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Unable to generate the T-shirt PDF. Please try again.");
      }

      const data = await res.json();
      const pdfUrl = data.pdfUrl || data.downloadUrl;
      if (!pdfUrl) {
        throw new Error("PDF was generated but could not be uploaded. Please try again.");
      }

      const msg = buildTshirtWhatsAppMessage({
        name: registration.name,
        tshirtId: registration.collectionId || `TSH-#${registration.id}`,
        tShirtSize: registration.tShirtSize,
        quantity: registration.quantity,
        pdfUrl,
      });

      const waUrl = formatWhatsAppUrl(registration.mobileNumber, msg);
      window.open(waUrl, "_blank");
      toast.success(`WhatsApp opened for ${registration.name}!`);
    } catch (err: any) {
      toast.error(err?.message || "Unable to generate the T-shirt PDF. Please try again.");
    } finally {
      setSendingPdfId(null);
    }
  };
  const [isDeleting, setIsDeleting] = useState(false);

  const adminUser = getAdminUser();
  const isVolunteer = adminUser?.role === 'Volunteer';

  // Load festivals, buildings, admins
  useEffect(() => {
    fetch(`${getApiUrl()}/api/admin/festivals`, { headers: authHeaders() })
      .then(r => r.json())
      .then((data: FestivalOption[]) => {
        setFestivals(data);
        // Default to first festival if none selected
        if (data.length > 0 && !filterFestival) {
          setFilterFestival(String(data[0].id));
        }
      })
      .catch(() => toast.error('Failed to load festivals'));
  }, []);

  // Apply the festival from URL query param to the registration form too
  useEffect(() => {
    if (initialFestivalId && festivals.some(f => String(f.id) === initialFestivalId)) {
      setSelectedFestival(Number(initialFestivalId));
    }
  }, [initialFestivalId, festivals]);

  useEffect(() => {
    fetch(`${getApiUrl()}/api/admin/buildings/manage`, { headers: authHeaders() })
      .then(r => r.json())
      .then((data: Building[]) => setBuildings(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`${getApiUrl()}/api/admin/manage`, { headers: authHeaders() })
      .then(r => r.json())
      .then((data: AdminOption[]) => setAdmins(data))
      .catch(() => {});
  }, []);

  // Load wings when building selected in form
  useEffect(() => {
    if (!selectedBuilding) { setWings([]); setSelectedWing(''); return; }
    fetch(`${getApiUrl()}/api/admin/buildings/${selectedBuilding.id}/wings/manage`, { headers: authHeaders() })
      .then(r => r.json())
      .then((data: Wing[]) => setWings(data))
      .catch(() => setWings([]));
  }, [selectedBuilding]);

  // Load wings when building filter changes
  const [filterWings, setFilterWings] = useState<Wing[]>([]);
  useEffect(() => {
    if (!filterBuilding) { setFilterWings([]); setFilterWing(''); return; }
    fetch(`${getApiUrl()}/api/admin/buildings/${filterBuilding}/wings/manage`, { headers: authHeaders() })
      .then(r => r.json())
      .then((data: Wing[]) => setFilterWings(data))
      .catch(() => setFilterWings([]));
  }, [filterBuilding]);

  const fetchSummary = useCallback(async () => {
    if (!filterFestival) { setSummary(null); return; }
    try {
      const res = await fetch(`${getApiUrl()}/api/admin/tshirt-registrations/summary?festivalId=${filterFestival}`, { headers: authHeaders() });
      if (res.ok) setSummary(await res.json());
    } catch { /* silent */ }
  }, [filterFestival]);

  const fetchRegistrations = useCallback(async (pageNum?: number) => {
    setIsLoading(true);
    try {
      const sp = new URLSearchParams();
      sp.set('page', String(pageNum ?? pagination.page));
      sp.set('limit', '20');
      if (search) sp.set('search', search);
      if (filterFestival) sp.set('festival', filterFestival);
      if (filterBuilding) sp.set('building', filterBuilding);
      if (filterWing) sp.set('wing', filterWing);
      if (filterSize) sp.set('size', filterSize);
      if (filterQuantity) sp.set('quantity', filterQuantity);
      if (filterPaymentMode) sp.set('payment_mode', filterPaymentMode);
      if (filterPaidTo) sp.set('paid_to', filterPaidTo);
      const res = await fetch(`${getApiUrl()}/api/admin/tshirt-registrations?${sp.toString()}`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setRegistrations(data.registrations);
      setPagination(data.pagination);
    } catch { /* silent */ }
    finally { setIsLoading(false); }
  }, [pagination.page, search, filterFestival, filterBuilding, filterWing, filterSize, filterQuantity, filterPaymentMode, filterPaidTo]);

  useEffect(() => { fetchRegistrations(); }, [fetchRegistrations]);
  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const handleSearch = () => {
    setPagination(p => ({ ...p, page: 1 }));
    setSearch(searchInput);
  };

  const clearFilters = () => {
    setFilterBuilding(''); setFilterWing(''); setFilterSize('');
    setFilterQuantity(''); setFilterPaymentMode(''); setFilterPaidTo('');
    setPagination(p => ({ ...p, page: 1 }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!selectedFestival) newErrors.festival = 'Please select a festival';
    if (!name.trim()) newErrors.name = 'Name is required';
    if (!mobileNumber.trim()) newErrors.mobileNumber = 'Mobile number is required';
    else if (!/^[6-9][0-9]{9}$/.test(mobileNumber.replace(/[\s-]/g, ''))) newErrors.mobileNumber = 'Enter a valid 10-digit Indian mobile number';
    if (!selectedBuilding) newErrors.building = 'Please select a building';
    if (!tShirtSize) newErrors.tShirtSize = 'Please select a t-shirt size';
if (!quantity || quantity < 1) newErrors.quantity = 'Valid quantity is required';
if (!TSHIRT_PRICES.includes(tshirtPrice)) newErrors.tshirtPrice = 'Please select a valid t-shirt price';
    if (chestSize && parseFloat(chestSize) <= 0) newErrors.chestSize = 'Valid chest size (in inches) is required';
    if (!paidToAdminId) newErrors.paidTo = 'Please select who payment is paid to';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

const clearForm = () => {
    setSelectedFestival(''); setName(''); setMobileNumber('');
    setSelectedBuilding(null); setSelectedWing(''); setTShirtSize('');
    setTShirtSizeNumeric(''); setQuantity(1); setTshirtPrice(250); setChestSize(''); setPaidToAdminId(''); setPaymentMode('cash');
    setPendingReason(''); setPendingCustomReason(''); setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSaving(true);
    try {
      const body: any = {
        festivalId: Number(selectedFestival),
        name: name.trim(),
        mobileNumber: mobileNumber.trim(),
        buildingId: selectedBuilding!.id,
        wingId: selectedWing ? Number(selectedWing) : null,
        tShirtSize,
        tShirtSizeNumeric: tShirtSizeNumeric ? parseInt(tShirtSizeNumeric, 10) : null,
        quantity,
        tshirtPrice,
        chestSize: chestSize ? parseFloat(chestSize) : null,
        paidToAdminId,
        paymentMode,
      };
      if (paymentMode === 'pending') {
        const reasonValue = pendingReason === 'Other' ? pendingCustomReason : pendingReason;
        body.pendingReason = reasonValue.trim() || null;
      }
      const res = await fetch(`${getApiUrl()}/api/admin/tshirt-registrations`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to save' }));
        toast.error(err.error || 'Failed to save registration');
        return;
      }
      toast.success('🎉 T-shirt registration saved!');
      clearForm();
      fetchRegistrations(); fetchSummary();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save registration');
    } finally { setIsSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteReg) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/admin/tshirt-registrations/${deleteReg.id}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Registration deleted');
      setDeleteReg(null);
      fetchRegistrations(); fetchSummary();
    } catch (err: any) { toast.error(err?.message || 'Failed to delete'); }
    finally { setIsDeleting(false); }
  };

  const handleExport = async () => {
    try {
      const sp = new URLSearchParams();
      if (search) sp.set('search', search);
      if (filterFestival) sp.set('festival', filterFestival);
      if (filterBuilding) sp.set('building', filterBuilding);
      if (filterWing) sp.set('wing', filterWing);
      if (filterSize) sp.set('size', filterSize);
      if (filterQuantity) sp.set('quantity', filterQuantity);
      if (filterPaymentMode) sp.set('payment_mode', filterPaymentMode);
      if (filterPaidTo) sp.set('paid_to', filterPaidTo);
      const res = await fetch(`${getApiUrl()}/api/admin/tshirt-registrations/export?${sp.toString()}`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to export');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tshirt-registrations.csv';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV exported successfully');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to export');
    }
  };

  // Export filtered registrations to a real Excel (.xlsx) file
  const handleExportExcel = async () => {
    try {
      const sp = new URLSearchParams();
      if (search) sp.set('search', search);
      if (filterFestival) sp.set('festival', filterFestival);
      if (filterBuilding) sp.set('building', filterBuilding);
      if (filterWing) sp.set('wing', filterWing);
      if (filterSize) sp.set('size', filterSize);
      if (filterQuantity) sp.set('quantity', filterQuantity);
      if (filterPaymentMode) sp.set('payment_mode', filterPaymentMode);
      if (filterPaidTo) sp.set('paid_to', filterPaidTo);
      sp.set('limit', '100000');

      const res = await fetch(`${getApiUrl()}/api/admin/tshirt-registrations?${sp.toString()}`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to export');
      const data = await res.json();
      const rows: TshirtRegistration[] = data.registrations || [];

      const sheetData = rows.map(r => ({
        Festival: `${r.festivalName} ${r.festivalYear || ''}`.trim(),
        Name: r.name,
        'Mobile Number': r.mobileNumber,
        Building: r.buildingName || '',
        Wing: r.wingName || '',
'T-Shirt Size': r.tShirtSize,
        'Numeric Size': r.tShirtSizeNumeric != null ? r.tShirtSizeNumeric : '',
        Quantity: r.quantity,
        'T-Shirt Price': r.tshirtPrice,
        'Total Amount': r.totalAmount,
        'Chest Size (inches)': r.chestSize != null ? r.chestSize : '',
        'Paid To': r.paidToName || '',
        'Payment Mode': paymentModeLabels[r.paymentMode] || r.paymentMode,
        'Pending Reason': r.pendingReason || '',
        'Registration Date': formatDate(r.createdAt),
      }));

      if (sheetData.length === 0) {
        toast.error('No registrations to export');
        return;
      }

      const ws = XLSX.utils.json_to_sheet(sheetData);
      ws['!cols'] = [
        { wch: 24 }, { wch: 24 }, { wch: 16 }, { wch: 20 }, { wch: 10 },
        { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 20 }, { wch: 14 }, { wch: 24 }, { wch: 18 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'T-Shirt Registrations');
      XLSX.writeFile(wb, 'tshirt-registrations.xlsx');
      toast.success(`Excel exported with ${sheetData.length} record(s)`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to export Excel');
    }
  };

  const goToPage = (page: number) => {
    if (page < 1 || page > pagination.totalPages) return;
    setPagination(p => ({ ...p, page }));
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const total = pagination.totalPages;
    const current = pagination.page;
    if (total <= 7) { for (let i = 1; i <= total; i++) pages.push(i); }
    else {
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

  const hasActiveFilters = filterBuilding || filterWing || filterSize || filterQuantity || filterPaymentMode || filterPaidTo;

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
                <Shirt className="w-7 h-7 text-primary" /> T-Shirt Registrations
              </h1>
              <p className="text-white/70">
                {(() => {
                  const activeFestival = festivals.find(f => String(f.id) === filterFestival);
                  return activeFestival
                    ? `T-Shirt Registrations for ${activeFestival.name} ${activeFestival.year}`
                    : 'Register residents for festival t-shirts';
                })()}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 py-6">
        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-4">
            <StatsCard title="Total Registrations" value={String(summary.totalRegistrations ?? 0)} icon={Shirt} color="text-primary" />
            <StatsCard title="Total Quantity" value={String(summary.totalQuantity ?? 0)} icon={Shirt} color="text-indigo-600" />
            <StatsCard title="Total T-Shirt Amount" value={formatCurrency(summary.totalTshirtAmount ?? 0)} icon={IndianRupee} color="text-emerald-600" />
            <StatsCard title="Total Amount Collected" value={formatCurrency(summary.totalAmountCollected ?? 0)} icon={CheckCircle} color="text-emerald-600" />
            <StatsCard title="Distributed T-Shirts" value={String(summary.distributedTshirts ?? 0)} icon={Shirt} color="text-teal-600" />
          </div>
        )}

        {/* Registration Form */}
        <div className="glass-card-glow relative mb-6 rounded-2xl p-6">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-purple-500 to-teal-400 opacity-70" />
          <h2 className="text-lg font-serif font-bold text-foreground mb-5 flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" /> Add T-Shirt Registration
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
{/* Festival */}
            <div>
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <Shirt className="w-4 h-4" /> Festival
              </h3>

              {/* Prominent banner showing the festival auto-selected from the URL
                  (mirrors the Donation flow's "Collecting for" display). */}
              {(() => {
                const preSelected = festivals.find(f => String(f.id) === initialFestivalId);
                if (preSelected) {
                  return (
                    <div className="mb-3 p-3 bg-primary/5 border border-primary/20 rounded-xl flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Shirt className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Registering for</p>
                        <p className="font-bold text-foreground text-sm">{preSelected.name} ({preSelected.year})</p>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Festival <span className="text-destructive">*</span></label>
                <div className="relative">
                  <select value={selectedFestival} onChange={e => { setSelectedFestival(e.target.value === '' ? '' : Number(e.target.value)); setErrors(p => { const { festival, ...r } = p; return r; }); }} className={cn("w-full px-3 py-2.5 text-sm rounded-lg border bg-background focus:ring-2 focus:ring-primary outline-none appearance-none", errors.festival ? 'border-destructive' : 'border-border')}>
                    <option value="">Select a festival...</option>
                    {festivals.map(f => (
                      <option key={f.id} value={f.id}>{f.name} {f.year}{f.status === 'active' ? ' (Active)' : ''}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-muted-foreground" />
                </div>
                {errors.festival && <p className="text-xs text-destructive mt-1">{errors.festival}</p>}
              </div>
            </div>

            {/* Resident Details */}
            <div>
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <User className="w-4 h-4" /> Resident Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Name <span className="text-destructive">*</span></label>
                  <input type="text" value={name} onChange={e => { setName(e.target.value); setErrors(p => { const { name, ...r } = p; return r; }); }} placeholder="Resident's full name" className={cn("w-full px-3 py-2.5 text-sm rounded-lg border bg-background focus:ring-2 focus:ring-primary outline-none", errors.name ? 'border-destructive' : 'border-border')} />
                  {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Mobile Number <span className="text-destructive">*</span></label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input type="tel" value={mobileNumber} onChange={e => { setMobileNumber(e.target.value); setErrors(p => { const { mobileNumber, ...r } = p; return r; }); }} placeholder="10-digit mobile number" className={cn("w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border bg-background focus:ring-2 focus:ring-primary outline-none", errors.mobileNumber ? 'border-destructive' : 'border-border')} />
                  </div>
                  {errors.mobileNumber && <p className="text-xs text-destructive mt-1">{errors.mobileNumber}</p>}
                </div>
                <div>
                  <BuildingSearchDropdown
                    selectedBuilding={selectedBuilding}
                    onSelect={(b) => { setSelectedBuilding(b); setSelectedWing(''); setErrors(p => { const { building, ...r } = p; return r; }); }}
                    onClear={() => { setSelectedBuilding(null); setSelectedWing(''); setErrors(p => { const { building, ...r } = p; return r; }); }}
                  />
                  {errors.building && <p className="text-xs text-destructive mt-1">{errors.building}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Wing <span className="text-destructive">*</span></label>
                  <div className="relative">
                    <select value={selectedWing} onChange={e => setSelectedWing(e.target.value === '' ? '' : Number(e.target.value))} disabled={!selectedBuilding} className={cn("w-full px-3 py-2.5 text-sm rounded-lg border bg-background focus:ring-2 focus:ring-primary outline-none appearance-none", !selectedBuilding && 'opacity-50 cursor-not-allowed')}>
                      <option value="">{selectedBuilding ? 'Select wing...' : 'Select building first'}</option>
                      {wings.map(w => <option key={w.id} value={w.id}>{w.wingName}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-muted-foreground" />
                  </div>
                </div>
              </div>
            </div>

            {/* T-Shirt Details */}
            <div>
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <Ruler className="w-4 h-4" /> T-Shirt Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">T-Shirt Size <span className="text-destructive">*</span></label>
                  <div className="relative">
                    <select value={tShirtSize} onChange={e => { setTShirtSize(e.target.value); setErrors(p => { const { tShirtSize, ...r } = p; return r; }); }} className={cn("w-full px-3 py-2.5 text-sm rounded-lg border bg-background focus:ring-2 focus:ring-primary outline-none appearance-none", errors.tShirtSize ? 'border-destructive' : 'border-border')}>
                      <option value="">Select size...</option>
                      {T_SHIRT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-muted-foreground" />
                  </div>
{errors.tShirtSize && <p className="text-xs text-destructive mt-1">{errors.tShirtSize}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Numeric Size <span className="text-muted-foreground">(optional)</span></label>
                  <input type="number" value={tShirtSizeNumeric} onChange={e => setTShirtSizeNumeric(e.target.value)} min={1} step={1} placeholder="e.g. 42" className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Quantity <span className="text-destructive">*</span></label>
                  <div className="relative">
                    <select value={quantity} onChange={e => { setQuantity(Number(e.target.value)); setErrors(p => { const { quantity, ...r } = p; return r; }); }} className={cn("w-full px-3 py-2.5 text-sm rounded-lg border bg-background focus:ring-2 focus:ring-primary outline-none appearance-none", errors.quantity ? 'border-destructive' : 'border-border')}>
                      {QUANTITY_OPTIONS.map(q => <option key={q} value={q}>{q}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-muted-foreground" />
                  </div>
                  {errors.quantity && <p className="text-xs text-destructive mt-1">{errors.quantity}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">T-Shirt Price <span className="text-destructive">*</span></label>
                  <div className="relative">
                    <select value={tshirtPrice} onChange={e => { setTshirtPrice(Number(e.target.value)); setErrors(p => { const { tshirtPrice, ...r } = p; return r; }); }} className={cn("w-full px-3 py-2.5 text-sm rounded-lg border bg-background focus:ring-2 focus:ring-primary outline-none appearance-none", errors.tshirtPrice ? 'border-destructive' : 'border-border')}>
                      {TSHIRT_PRICES.map(price => <option key={price} value={price}>{`₹${price}`}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-muted-foreground" />
                  </div>
                  {errors.tshirtPrice && <p className="text-xs text-destructive mt-1">{errors.tshirtPrice}</p>}
                </div>
                <div>
<label className="block text-xs font-semibold text-foreground mb-1.5">Chest Size (inches) <span className="text-muted-foreground">(optional)</span></label>
                  <div className="relative">
                    <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input type="number" value={chestSize} onChange={e => { setChestSize(e.target.value); setErrors(p => { const { chestSize, ...r } = p; return r; }); }} min={0} step={0.5} placeholder="e.g. 38" className={cn("w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border bg-background focus:ring-2 focus:ring-primary outline-none", errors.chestSize ? 'border-destructive' : 'border-border')} />
                  </div>
                  {errors.chestSize && <p className="text-xs text-destructive mt-1">{errors.chestSize}</p>}
                </div>
                {/* <div className="md:col-span-3">
                  <p className="text-xs text-muted-foreground">Total Amount</p>
                  <div className="mt-1 rounded-xl border border-border bg-slate-50 px-3 py-2 text-sm font-semibold text-foreground">
                    {formatCurrency(tshirtPrice * quantity)}
                  </div>
                </div> */}
              </div>
            </div>

            {/* Payment Details */}
            <div>
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4" /> Payment Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Paid To <span className="text-destructive">*</span></label>
                  <div className="relative">
                    <select value={paidToAdminId} onChange={e => { setPaidToAdminId(e.target.value); setErrors(p => { const { paidTo, ...r } = p; return r; }); }} className={cn("w-full px-3 py-2.5 text-sm rounded-lg border bg-background focus:ring-2 focus:ring-primary outline-none appearance-none", errors.paidTo ? 'border-destructive' : 'border-border')}>
                      <option value="">Select admin/volunteer...</option>
                      {admins.map(a => (
                        <option key={a.id} value={a.id}>{a.fullName} ({a.role})</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-muted-foreground" />
                  </div>
                  {errors.paidTo && <p className="text-xs text-destructive mt-1">{errors.paidTo}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Mode of Payment <span className="text-destructive">*</span></label>
                  <div className="relative">
                    <select value={paymentMode} onChange={e => { setPaymentMode(e.target.value); if (e.target.value !== 'pending') { setPendingReason(''); setPendingCustomReason(''); } }} className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none appearance-none">
                      {PAYMENT_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-muted-foreground" />
                  </div>
                </div>
              </div>

              {paymentMode === 'pending' && (
                <div className="mt-4 p-4 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-900/30 rounded-xl">
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Pending Reason</label>
                  <select value={pendingReason === 'Other' && pendingCustomReason ? 'Other' : pendingReason} onChange={e => { setPendingReason(e.target.value); setPendingCustomReason(''); }} className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none">
                    <option value="">Select a reason...</option>
                    {PENDING_REASONS.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  {pendingReason === 'Other' && (
                    <input type="text" value={pendingCustomReason} onChange={e => setPendingCustomReason(e.target.value)} placeholder="Specify reason..." className="w-full mt-2 px-3 py-2.5 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none" autoFocus />
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button type="submit" disabled={isSaving} className="w-full sm:w-auto px-8 py-3 bg-primary text-white rounded-xl font-bold text-lg hover:bg-primary/90 transition-all shadow-lg disabled:opacity-60 flex items-center justify-center gap-2">
                {isSaving ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
                Save Registration
              </button>
              <button type="button" onClick={clearForm} disabled={isSaving} className="w-full sm:w-auto px-8 py-3 border border-border text-foreground rounded-xl font-bold text-lg hover:bg-muted/50 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                <X className="w-5 h-5" /> Clear Form
              </button>
            </div>
          </form>
        </div>

        {/* Registrations Table */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-serif font-bold text-foreground">T-Shirt Registration Records</h2>
              <p className="text-xs text-muted-foreground">Manage all t-shirt registrations</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={handleExportExcel} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all">
                <Download className="w-3.5 h-3.5" /> Export Excel
              </button>
              <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-blue-300 text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all">
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
              <button onClick={() => setShowFilters(!showFilters)} className={cn("flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all", showFilters || hasActiveFilters ? 'bg-primary/10 border-primary/30 text-primary' : 'border-border text-muted-foreground hover:bg-muted/50')}>
                <ListFilter className="w-3.5 h-3.5" /> Filters {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-primary" />}
              </button>
              <button onClick={() => { fetchRegistrations(); fetchSummary(); }} disabled={isLoading} className="px-3 py-2 border border-border rounded-lg text-sm font-semibold hover:bg-muted/50 transition-all">
                <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              </button>
            </div>
          </div>

          <div className="p-4 border-b border-border bg-muted/10">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-semibold text-foreground mb-1"><Search className="w-3 h-3 inline mr-1" /> Search</label>
                <div className="flex gap-2">
                  <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} placeholder="Name, Mobile, Building, Wing..." className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none" />
                  <button onClick={handleSearch} className="px-3 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all"><Search className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="w-[150px]">
                <label className="block text-xs font-semibold text-foreground mb-1">Festival</label>
                <select value={filterFestival} onChange={e => { setFilterFestival(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none">
                  <option value="">All</option>
                  {festivals.map(f => <option key={f.id} value={f.id}>{f.name} {f.year}</option>)}
                </select>
              </div>
              <div className="w-[140px]">
                <label className="block text-xs font-semibold text-foreground mb-1">Building</label>
                <select value={filterBuilding} onChange={e => { setFilterBuilding(e.target.value); setFilterWing(''); setPagination(p => ({ ...p, page: 1 })); }} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none">
                  <option value="">All</option>
                  {buildings.map(b => <option key={b.id} value={b.id}>{b.buildingName}</option>)}
                </select>
              </div>
              <div className="w-[110px]">
                <label className="block text-xs font-semibold text-foreground mb-1">Size</label>
                <select value={filterSize} onChange={e => { setFilterSize(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none">
                  <option value="">All</option>
                  {T_SHIRT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="w-[100px]">
                <label className="block text-xs font-semibold text-foreground mb-1">Quantity</label>
                <select value={filterQuantity} onChange={e => { setFilterQuantity(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none">
                  <option value="">All</option>
                  {QUANTITY_OPTIONS.map(q => <option key={q} value={q}>{q}</option>)}
                </select>
              </div>
              <div className="w-[120px]">
                <label className="block text-xs font-semibold text-foreground mb-1">Payment</label>
                <select value={filterPaymentMode} onChange={e => { setFilterPaymentMode(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none">
                  <option value="">All</option>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="online">Online</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            </div>

            {showFilters && (
              <div className="mt-3 pt-3 border-t border-border">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="w-[130px]">
                    <label className="block text-xs font-semibold text-foreground mb-1">Wing</label>
                    <select value={filterWing} onChange={e => { setFilterWing(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none" disabled={!filterBuilding}>
                      <option value="">All</option>
                      {filterWings.map(w => <option key={w.id} value={w.id}>{w.wingName}</option>)}
                    </select>
                  </div>
                  <div className="w-[160px]">
                    <label className="block text-xs font-semibold text-foreground mb-1">Paid To</label>
                    <select value={filterPaidTo} onChange={e => { setFilterPaidTo(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none">
                      <option value="">All</option>
                      {admins.map(a => <option key={a.id} value={a.id}>{a.fullName}</option>)}
                    </select>
                  </div>
                  <button onClick={clearFilters} className="px-3 py-2 border border-border rounded-lg text-xs font-semibold hover:bg-muted/50 transition-all">Clear Filters</button>
                </div>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
          ) : registrations.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Shirt className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
              <p className="font-semibold text-foreground">{hasActiveFilters ? 'No registrations match your filters' : 'No t-shirt registrations yet'}</p>
              <p className="text-sm mt-1">{hasActiveFilters ? 'Try adjusting your filters.' : 'Use the form above to register the first resident.'}</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground w-[50px]">#</th>
                      <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Festival</th>
                      <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Name</th>
                      <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Mobile</th>
                      <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Building</th>
                      <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Wing</th>
                      <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Size</th>
<th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Num</th>
                      <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Qty</th>
                      <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Price</th>
                      <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Amount</th>
                      <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Chest</th>
                      <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Paid To</th>
<th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Payment</th>
                      <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Collect</th>
                      <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Date</th>
                      <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground w-[150px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrations.map((r, idx) => {
                      const PayIcon = paymentModeIcons[r.paymentMode] || Banknote;
                      return (
                        <tr key={r.id} className={cn("border-b border-border/50 transition-colors hover:bg-muted/20", idx % 2 === 0 ? "bg-background" : "bg-muted/10")}>
                          <td className="px-3 py-3 text-xs text-muted-foreground font-mono">{(pagination.page - 1) * pagination.limit + idx + 1}</td>
                          <td className="px-3 py-3 text-sm text-muted-foreground">{r.festivalName} {r.festivalYear || ''}</td>
                          <td className="px-3 py-3"><span className="font-semibold text-foreground text-sm">{r.name}</span></td>
                          <td className="px-3 py-3 text-sm text-muted-foreground whitespace-nowrap">{r.mobileNumber}</td>
                          <td className="px-3 py-3 text-sm text-muted-foreground">{r.buildingName || '—'}</td>
                          <td className="px-3 py-3 text-sm text-muted-foreground">{r.wingName || '—'}</td>
                          <td className="px-3 py-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/5 text-primary border border-primary/20">
                              <Shirt className="w-3 h-3" /> {r.tShirtSize}
</span>
                          </td>
                          <td className="px-3 py-3 text-sm text-muted-foreground">{r.tShirtSizeNumeric != null ? r.tShirtSizeNumeric : '—'}</td>
                          <td className="px-3 py-3 text-sm font-semibold text-foreground whitespace-nowrap">{r.quantity} ×</td>
                          <td className="px-3 py-3 text-sm text-muted-foreground">{formatCurrency(r.tshirtPrice)}</td>
                          <td className="px-3 py-3 text-sm font-semibold text-foreground whitespace-nowrap">{formatCurrency(r.totalAmount)}</td>
                          <td className="px-3 py-3 text-sm text-muted-foreground">{r.chestSize != null ? `${r.chestSize}"` : '—'}</td>
                          <td className="px-3 py-3 text-sm text-muted-foreground">{r.paidToName || '—'}</td>
                          <td className="px-3 py-3">
<span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold", isPaid(r.paymentMode) ? 'text-emerald-700 bg-emerald-100' : 'text-amber-700 bg-amber-100')}>
                              <PayIcon className="w-3 h-3" />{paymentModeLabels[r.paymentMode] || r.paymentMode}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold", r.collectionStatus === 'collected' ? 'text-emerald-700 bg-emerald-100' : 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-400')}>
                              {r.collectionStatus === 'collected' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                              {r.collectionId || '—'}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-sm text-muted-foreground whitespace-nowrap">{formatDate(r.createdAt)}</td>
                          <td className="px-3 py-3">
                            <div className="flex items-center justify-end gap-0.5">
                              <button
                                  onClick={() => handleSendPdfOnWhatsApp(r)}
                                  disabled={sendingPdfId === r.id}
                                  className="p-1.5 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-950/30 transition-colors text-emerald-600 disabled:opacity-50"
                                  title="📄 Send PDF on WhatsApp"
                                >
                                  {sendingPdfId === r.id ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <FileText className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <button onClick={() => setQrReg(r)} className="p-1.5 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-950/30 transition-colors text-indigo-600" title="View QR & Collection Link"><QrCode className="w-3.5 h-3.5" /></button>
                              <button onClick={() => setViewReg(r)} className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors text-primary" title="View"><Eye className="w-3.5 h-3.5" /></button>
                              <button onClick={() => setEditReg(r)} className="p-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-950/30 transition-colors text-amber-600" title="Edit"><Edit3 className="w-3.5 h-3.5" /></button>
                              {!isVolunteer && (
                                <button onClick={() => setDeleteReg(r)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-destructive" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
                  <span className="text-xs text-muted-foreground">Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => goToPage(pagination.page - 1)} disabled={pagination.page <= 1} className="p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                    {getPageNumbers().map((p, i) =>
                      typeof p === 'string' ? <span key={`e-${i}`} className="px-2 text-xs text-muted-foreground">...</span>
                        : <button key={p} onClick={() => goToPage(p)} className={cn("min-w-[30px] h-7 rounded-lg text-xs font-semibold transition-all", p === pagination.page ? "bg-primary text-white shadow-sm" : "hover:bg-muted text-foreground")}>{p}</button>
                    )}
                    <button onClick={() => goToPage(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages} className="p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* View Modal */}
      {viewReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setViewReg(null)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-lg font-serif font-bold text-foreground flex items-center gap-2"><Shirt className="w-5 h-5 text-primary" /> Registration Details</h2>
              <button onClick={() => setViewReg(null)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-[130px_1fr] gap-y-3 text-sm">
                <span className="text-muted-foreground font-medium">Festival</span>
                <span className="font-semibold text-foreground">{viewReg.festivalName} {viewReg.festivalYear || ''}</span>
                <span className="text-muted-foreground font-medium">Name</span>
                <span className="font-semibold text-foreground">{viewReg.name}</span>
                <span className="text-muted-foreground font-medium">Mobile</span>
                <span>{viewReg.mobileNumber}</span>
                <span className="text-muted-foreground font-medium">Building</span>
                <span>{viewReg.buildingName || '—'}</span>
                <span className="text-muted-foreground font-medium">Wing</span>
                <span>{viewReg.wingName || '—'}</span>
<span className="text-muted-foreground font-medium">T-Shirt Size</span>
                <span className="font-bold text-primary">{viewReg.tShirtSize}</span>
                <span className="text-muted-foreground font-medium">Numeric Size</span>
                <span>{viewReg.tShirtSizeNumeric != null ? viewReg.tShirtSizeNumeric : '—'}</span>
                <span className="text-muted-foreground font-medium">Quantity</span>
                <span className="font-semibold text-foreground">{viewReg.quantity} ×</span>
                <span className="text-muted-foreground font-medium">Chest Size</span>
                <span>{viewReg.chestSize != null ? `${viewReg.chestSize}"` : '—'}</span>
                <span className="text-muted-foreground font-medium">Paid To</span>
                <span className="flex items-center gap-1.5"><User className="w-4 h-4 text-muted-foreground" />{viewReg.paidToName || '—'}</span>
                <span className="text-muted-foreground font-medium">Payment Mode</span>
                <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold w-fit", isPaid(viewReg.paymentMode) ? 'text-emerald-700 bg-emerald-100' : 'text-amber-700 bg-amber-100')}>
                  {paymentModeLabels[viewReg.paymentMode] || viewReg.paymentMode}
                </span>
                {viewReg.pendingReason && (<><span className="text-muted-foreground font-medium">Pending Reason</span><span>{viewReg.pendingReason}</span></>)}
                <span className="text-muted-foreground font-medium">Registered On</span>
                <span>{formatDate(viewReg.createdAt)}</span>
              </div>
            </div>
            <div className="flex justify-end p-4 border-t border-border bg-muted/20">
              <button onClick={() => setViewReg(null)} className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all">Close</button>
            </div>
          </div>
        </div>
      )}

{/* Edit Modal */}
      {editReg && (
        <EditRegistrationModal registration={editReg} onClose={() => setEditReg(null)} onSaved={() => { setEditReg(null); fetchRegistrations(); fetchSummary(); }} />
      )}

      {/* QR Code Modal */}
      {qrReg && (
        <QrCodeModal registration={qrReg} onClose={() => setQrReg(null)} />
      )}

      {/* Delete Confirm */}
      {deleteReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteReg(null)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-7 h-7 text-destructive" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Delete Registration?</h3>
              <p className="text-sm text-muted-foreground mb-1">Remove t-shirt registration for</p>
              <p className="text-sm font-bold text-foreground">{deleteReg.name}?</p>
              <p className="text-xs text-muted-foreground mt-2">This action cannot be undone.</p>
            </div>
            <div className="flex gap-3 p-4 pt-0">
              <button onClick={() => setDeleteReg(null)} disabled={isDeleting} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold hover:bg-muted/50 transition-all">Cancel</button>
              <button onClick={handleDelete} disabled={isDeleting} className="flex-1 py-2.5 bg-destructive text-destructive-foreground rounded-xl text-sm font-semibold hover:bg-destructive/90 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                {isDeleting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />} Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Edit Registration Modal ─────────────────────────────────────────────────

function EditRegistrationModal({ registration, onClose, onSaved }: {
  registration: TshirtRegistration;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(registration.name);
  const [mobileNumber, setMobileNumber] = useState(registration.mobileNumber);
const [tShirtSize, setTShirtSize] = useState(registration.tShirtSize);
  const [tShirtSizeNumeric, setTShirtSizeNumeric] = useState(registration.tShirtSizeNumeric != null ? String(registration.tShirtSizeNumeric) : '');
  const [quantity, setQuantity] = useState(registration.quantity || 1);
  const [tshirtPrice, setTshirtPrice] = useState(registration.tshirtPrice || 250);
  const [chestSize, setChestSize] = useState(registration.chestSize != null ? String(registration.chestSize) : '');
  const [paymentMode, setPaymentMode] = useState(registration.paymentMode);
  const [pendingReason, setPendingReason] = useState(registration.pendingReason || '');
  const [pendingCustomReason, setPendingCustomReason] = useState(
    registration.pendingReason && !PENDING_REASONS.some(r => r.value === registration.pendingReason) ? registration.pendingReason : ''
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Name is required'); return; }
    if (!/^[6-9][0-9]{9}$/.test(mobileNumber.replace(/[\s-]/g, ''))) { toast.error('Enter a valid 10-digit Indian mobile number'); return; }
    if (!tShirtSize) { toast.error('Please select a t-shirt size'); return; }
    if (!quantity || quantity < 1) { toast.error('Valid quantity is required'); return; }
    if (!TSHIRT_PRICES.includes(tshirtPrice)) { toast.error('Please select a valid t-shirt price'); return; }
    if (chestSize && parseFloat(chestSize) <= 0) { toast.error('Valid chest size is required'); return; }
    setIsSaving(true);
    try {
      const body: any = {
        name: name.trim(),
        mobileNumber: mobileNumber.trim(),
        tShirtSize,
        tShirtSizeNumeric: tShirtSizeNumeric ? parseInt(tShirtSizeNumeric, 10) : null,
        quantity,
        tshirtPrice,
        chestSize: chestSize ? parseFloat(chestSize) : null,
        paymentMode,
      };
      if (paymentMode === 'pending') {
        const reasonValue = pendingReason === 'Other' ? pendingCustomReason : pendingReason;
        body.pendingReason = reasonValue.trim() || null;
      }
      const res = await fetch(`${getApiUrl()}/api/admin/tshirt-registrations/${registration.id}`, {
        method: 'PATCH', headers: authHeaders(), body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to update' }));
        toast.error(err.error);
        return;
      }
      toast.success('Registration updated successfully');
      onSaved();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update registration');
    } finally { setIsSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-serif font-bold text-foreground flex items-center gap-2"><Edit3 className="w-5 h-5 text-amber-500" /> Edit Registration</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="p-3 bg-muted/30 rounded-xl">
            <p className="text-xs text-muted-foreground mb-1">Resident</p>
            <p className="font-semibold text-foreground">{registration.name}</p>
            <p className="text-xs text-muted-foreground">{registration.buildingName}{registration.wingName ? ` - ${registration.wingName}` : ''}</p>
            <div className="mt-3 grid gap-2 text-xs text-muted-foreground">
              <div><span className="font-semibold text-foreground">Price:</span> {formatCurrency(registration.tshirtPrice)}</div>
              <div><span className="font-semibold text-foreground">Amount:</span> {formatCurrency(registration.totalAmount)}</div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Name <span className="text-destructive">*</span></label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Mobile Number <span className="text-destructive">*</span></label>
            <input type="tel" value={mobileNumber} onChange={e => setMobileNumber(e.target.value)} className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">T-Shirt Size <span className="text-destructive">*</span></label>
<select value={tShirtSize} onChange={e => setTShirtSize(e.target.value)} className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none">
                <option value="">Size...</option>
                {T_SHIRT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Numeric Size <span className="text-muted-foreground">(optional)</span></label>
              <input type="number" value={tShirtSizeNumeric} onChange={e => setTShirtSizeNumeric(e.target.value)} min={1} step={1} placeholder="e.g. 42" className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Quantity <span className="text-destructive">*</span></label>
              <select value={quantity} onChange={e => setQuantity(Number(e.target.value))} className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none">
                {QUANTITY_OPTIONS.map(q => <option key={q} value={q}>{q}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">T-Shirt Price <span className="text-destructive">*</span></label>
              <select value={tshirtPrice} onChange={e => setTshirtPrice(Number(e.target.value))} className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none">
                {TSHIRT_PRICES.map(price => <option key={price} value={price}>{`₹${price}`}</option>)}
              </select>
            </div>
            <div>
<label className="block text-xs font-semibold text-foreground mb-1.5">Chest (in) <span className="text-muted-foreground">(optional)</span></label>
              <input type="number" value={chestSize} onChange={e => setChestSize(e.target.value)} min={1} step={0.5} className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Payment Mode <span className="text-destructive">*</span></label>
            <select value={paymentMode} onChange={e => { setPaymentMode(e.target.value); if (e.target.value !== 'pending') { setPendingReason(''); setPendingCustomReason(''); } }} className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none">
              {PAYMENT_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          {paymentMode === 'pending' && (
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Pending Reason</label>
              <select value={pendingReason === 'Other' && pendingCustomReason ? 'Other' : pendingReason} onChange={e => { setPendingReason(e.target.value); setPendingCustomReason(''); }} className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none">
                <option value="">Select a reason...</option>
                {PENDING_REASONS.map(r => (<option key={r.value} value={r.value}>{r.label}</option>))}
              </select>
              {pendingReason === 'Other' && (<div className="mt-2"><label className="block text-xs font-semibold text-foreground mb-1.5">Custom Reason</label><input type="text" value={pendingCustomReason} onChange={e => setPendingCustomReason(e.target.value)} placeholder="Enter custom reason..." className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none" autoFocus /></div>)}
              {registration.pendingReason && !PENDING_REASONS.some(r => r.value === registration.pendingReason) && !pendingReason && (
                <p className="text-xs text-muted-foreground mt-1">Previous reason: "{registration.pendingReason}"</p>
              )}
            </div>
          )}

<div className="flex gap-3 pt-2">
            <button type="submit" disabled={isSaving} className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
              {isSaving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Edit3 className="w-4 h-4" />} Update Registration
            </button>
            <button type="button" onClick={onClose} className="px-5 py-2.5 border border-border rounded-xl text-sm font-semibold hover:bg-muted/50 transition-all">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── QR Code Modal ───────────────────────────────────────────────────────────

function QrCodeModal({ registration, onClose }: {
  registration: TshirtRegistration;
  onClose: () => void;
}) {
  const [qrData, setQrData] = useState<{ qrDataUrl: string; payload: string } | null>(null);
  const [isLoadingQr, setIsLoadingQr] = useState(true);
  const [error, setError] = useState('');
  const [pdfLoadingState, setPdfLoadingState] = useState<null | 'generating' | 'uploading' | 'opening'>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingQr(true);
    setError('');
    fetch(`${getApiUrl()}/api/admin/tshirt-registrations/${registration.id}/qr`, { headers: authHeaders() })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Failed to load QR' }));
          throw new Error(err.error || 'Failed to load QR');
        }
        const data = await res.json();
        if (!cancelled) setQrData({ qrDataUrl: data.qrDataUrl, payload: data.payload });
      })
      .catch((err: any) => { if (!cancelled) setError(err?.message || 'Failed to load QR'); })
      .finally(() => { if (!cancelled) setIsLoadingQr(false); });
    return () => { cancelled = true; };
  }, [registration.id]);

  const handleGenerateAndSendPdf = async (openWhatsApp: boolean) => {
    try {
      setPdfLoadingState('generating');
      const res = await fetch(`${getApiUrl()}/api/admin/tshirt-registrations/${registration.id}/pdf`, {
        method: 'POST',
        headers: authHeaders(),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Unable to generate the T-shirt PDF. Please try again.');
      }

      setPdfLoadingState('uploading');
      const data = await res.json();
      const pdfUrl = data.pdfUrl || data.downloadUrl;
      if (!pdfUrl) {
        throw new Error('PDF was generated but could not be uploaded. Please try again.');
      }

      if (openWhatsApp) {
        setPdfLoadingState('opening');
        const msg = buildTshirtWhatsAppMessage({
          name: registration.name,
          tshirtId: registration.collectionId || `TSH-#${registration.id}`,
          tShirtSize: registration.tShirtSize,
          quantity: registration.quantity,
          pdfUrl,
        });

        const waUrl = formatWhatsAppUrl(registration.mobileNumber, msg);
        window.open(waUrl, '_blank');
        toast.success('WhatsApp opened with T-shirt collection PDF link!');
      } else {
        const a = document.createElement('a');
        a.href = data.downloadUrl || pdfUrl;
        a.target = '_blank';
        a.download = data.filename || `Meditiya-Sathi-Tshirt-${registration.collectionId || registration.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success('PDF download started!');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Unable to generate the T-shirt PDF. Please try again.');
    } finally {
      setPdfLoadingState(null);
    }
  };

  const handleDownload = () => {
    if (!qrData?.qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrData.qrDataUrl;
    a.download = `${registration.collectionId || 'tshirt'}-qr.png`;
    a.click();
  };

  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(
      `<html><head><title>${registration.collectionId || 'T-Shirt'} QR</title></head>` +
      `<body style="display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:sans-serif;padding:24px;">` +
      `<h2 style="margin:0 0 4px;">${registration.festivalName} ${registration.festivalYear || ''}</h2>` +
      `<p style="margin:0 0 16px;color:#555;">${registration.name} • ${registration.tShirtSize} × ${registration.quantity}</p>` +
      `<img src="${qrData?.qrDataUrl}" style="width:320px;height:320px;" />` +
      `<p style="margin:16px 0 0;font-weight:bold;font-size:18px;">${registration.collectionId}</p>` +
      `</body></html>`
    );
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-sm w-full p-6 relative animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-4 top-4 p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto mb-2">
            <QrCode className="w-5 h-5" />
          </div>
          <h3 className="font-serif font-bold text-lg text-foreground">T-Shirt Collection Pass</h3>
          <p className="text-xs text-muted-foreground">{registration.name} • {registration.tShirtSize} × {registration.quantity}</p>
        </div>

        <div className="flex flex-col items-center justify-center p-4 bg-muted/40 rounded-xl border border-border mb-4 min-h-[220px]">
          {isLoadingQr ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <RefreshCw className="w-6 h-6 animate-spin text-primary" />
              <span className="text-xs">Generating QR...</span>
            </div>
          ) : error ? (
            <div className="text-center text-sm text-destructive py-4"><AlertTriangle className="w-6 h-6 mx-auto mb-2 opacity-70" />{error}</div>
          ) : qrData ? (
            <>
              <img src={qrData.qrDataUrl} alt="T-Shirt Collection QR" className="w-48 h-48 rounded-xl border border-border bg-white p-2 shadow-sm" />
              <p className="mt-3 font-mono text-sm font-bold text-primary tracking-wider">{registration.collectionId}</p>
              <span className="mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                ✓ Payment: PAID
              </span>
            </>
          ) : null}
        </div>

        <div className="space-y-2.5">
          {/* Main Action: Send PDF on WhatsApp */}
          <button
            type="button"
            onClick={() => handleGenerateAndSendPdf(true)}
            disabled={Boolean(pdfLoadingState)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
          >
            {pdfLoadingState ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>
                  {pdfLoadingState === 'generating'
                    ? 'Generating PDF...'
                    : pdfLoadingState === 'uploading'
                    ? 'Uploading PDF...'
                    : 'Opening WhatsApp...'}
                </span>
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                <span>📄 Send PDF on WhatsApp</span>
              </>
            )}
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleGenerateAndSendPdf(false)}
              disabled={Boolean(pdfLoadingState)}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 border border-border bg-background hover:bg-muted/50 rounded-xl text-xs font-semibold text-foreground transition-all disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-primary" />
              <span>Download PDF</span>
            </button>
            <a
              href={`/tshirt-distribution/${registration.collectionId || registration.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 border border-border bg-background hover:bg-muted/50 rounded-xl text-xs font-semibold text-foreground transition-all text-center"
            >
              <ExternalLink className="w-3.5 h-3.5 text-primary" />
              <span>Open Scanner</span>
            </a>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/50">
            <button
              onClick={handlePrint}
              disabled={!qrData}
              className="flex items-center justify-center gap-1.5 px-3 py-2 border border-border/70 rounded-xl text-xs font-medium hover:bg-muted/40 transition-all text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5" /> Print QR
            </button>
            <button
              onClick={handleDownload}
              disabled={!qrData}
              className="flex items-center justify-center gap-1.5 px-3 py-2 border border-border/70 rounded-xl text-xs font-medium hover:bg-muted/40 transition-all text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" /> Download QR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
