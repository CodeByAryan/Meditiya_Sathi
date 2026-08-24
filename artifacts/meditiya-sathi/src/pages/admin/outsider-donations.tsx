import { useState, useEffect, useCallback } from 'react';
import { Link } from 'wouter';
import {
  ArrowLeft, HeartHandshake, Search, Plus, X, CheckCircle, Clock, User, Phone, Mail,
  MapPin, IndianRupee, Save, ChevronDown, AlertTriangle, MessageSquare, Eye, Edit3,
  Trash2, Users, TrendingUp, Wallet, Banknote, CreditCard, Receipt, RefreshCw,
  ChevronLeft, ChevronRight, ListFilter, Home,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn, getApiUrl } from '@/lib/utils';
import { PENDING_REASONS } from '@/lib/pending-reasons';
import { getPublicAppBaseUrl } from '@/lib/tshirt-url';

// ── Types ────────────────────────────────────────────────────────────────────

interface FestivalOption {
  id: number;
  name: string;
  year: number;
  status: string;
  isActive: boolean;
}

interface OutsiderDonation {
  id: number;
  festivalId: number;
  festivalName: string;
  festivalYear: number;
  fullName: string;
  mobile: string;
  email: string | null;
  address: string | null;
  amount: number | null;
  paymentStatus: string;
  paymentMethod: string;
  pendingReason: string | null;
  receiptNumber: string | null;
  notes: string | null;
  paymentDate: string | null;
  collectedByAdminId: string;
  collectedByAdminName: string;
  createdAt: string;
  updatedAt: string;
}

interface Pagination { page: number; limit: number; total: number; totalPages: number; }

interface Stats {
  totalCollection: number;
  totalDonors: number;
  todayCollection: number;
  pendingAmount: number;
}

interface Reports {
  residentCollection: number;
  outsiderCollection: number;
  grandTotal: number;
}

// ── Auth helpers ─────────────────────────────────────────────────────────────

function getAdminToken(): string | null {
  try {
    const stored = localStorage.getItem('admin_auth');
    if (!stored) return null;
    return JSON.parse(stored)?.token || null;
  } catch { return null; }
}

function getAdminUser(): { fullName: string; username: string } | null {
  try {
    const stored = localStorage.getItem('admin_auth');
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return { fullName: parsed.fullName, username: parsed.username };
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

function formatCurrency(amount: number | null): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

const paymentMethodLabels: Record<string, string> = {
  cash: 'Cash', upi: 'UPI', bank_transfer: 'Bank Transfer', cheque: 'Cheque', pending: 'Pending',
};

const paymentMethodIcons: Record<string, any> = {
  cash: Banknote, upi: CreditCard, bank_transfer: Wallet, cheque: Receipt, pending: Clock,
};

function isPaid(d: OutsiderDonation): boolean {
  return d.paymentStatus === 'paid';
}

// ── WhatsApp Receipt Builder ────────────────────────────────────────────────

function buildWhatsAppReceipt(d: OutsiderDonation, pdfUrl?: string): string {
  const defaultPdfUrl = d.receiptNumber ? `${getPublicAppBaseUrl()}/api/vargani-pdf/${encodeURIComponent(d.receiptNumber)}.pdf` : null;
  const finalPdfUrl = pdfUrl || defaultPdfUrl;
  const msg = [
    '🏡 *Meditiya Sathi*',
    '',
    '*🧾 Donation Receipt*',
    '',
    `Festival: ${d.festivalName} ${d.festivalYear || ''}`.trim(),
    `Donor: ${d.fullName}`,
    `Mobile: ${d.mobile}`,
    d.address ? `Address: ${d.address}` : null,
    `Amount Received: ₹${d.amount?.toLocaleString('en-IN') || '0'}`,
    `Payment Method: ${paymentMethodLabels[d.paymentMethod] || d.paymentMethod || '—'}`,
    `Date: ${formatDate(d.paymentDate)}`,
    `Collected By: ${d.collectedByAdminName}`,
    `Receipt No: ${d.receiptNumber || '—'}`,
    ...(finalPdfUrl ? ['', `📄 Your Vargani receipt:`, finalPdfUrl] : []),
    '',
    'Thank you for supporting our community. 🙏',
  ].filter(Boolean).join('\n');
  return encodeURIComponent(msg);
}

function openWhatsApp(mobile: string, message: string) {
  const cleanMobile = mobile.replace(/[^0-9]/g, '');
  if (cleanMobile.length < 10) {
    toast.error('Invalid mobile number for WhatsApp');
    return;
  }
  const url = `https://wa.me/91${cleanMobile}?text=${message}`;
  window.open(url, '_blank');
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

// ── Main Component ──────────────────────────────────────────────────────────

export default function AdminOutsiderDonations() {
  const [festivals, setFestivals] = useState<FestivalOption[]>([]);
  const [donations, setDonations] = useState<OutsiderDonation[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
const [stats, setStats] = useState<Stats | null>(null);
  const [reports, setReports] = useState<Reports | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form state
  const [selectedFestival, setSelectedFestival] = useState<number | ''>('');
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending'>('paid');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [pendingReason, setPendingReason] = useState('');
  const [pendingCustomReason, setPendingCustomReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filterFestival, setFilterFestival] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Modals
  const [viewDonation, setViewDonation] = useState<OutsiderDonation | null>(null);
  const [editDonation, setEditDonation] = useState<OutsiderDonation | null>(null);
  const [deleteDonation, setDeleteDonation] = useState<OutsiderDonation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sendingWhatsAppDonationId, setSendingWhatsAppDonationId] = useState<number | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleGeneratePdf = async (donation: OutsiderDonation) => {
    setIsGeneratingPdf(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/admin/outsider-donations/${donation.id}/vargani-pdf`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Cache-Control': 'no-cache' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate receipt');
      window.open(data.downloadUrl || data.pdfUrl, '_blank');
      toast.success('Vargani receipt generated');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to generate receipt');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSendWhatsAppReceipt = async (donation: OutsiderDonation) => {
    setSendingWhatsAppDonationId(donation.id);
    try {
      toast.info(`Generating receipt for ${donation.fullName}...`);
      const res = await fetch(`${getApiUrl()}/api/admin/outsider-donations/${donation.id}/vargani-pdf`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Cache-Control': 'no-cache' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate receipt');

      const freshDonation = data.donation ? {
        ...donation,
        fullName: data.donation.fullName || donation.fullName,
        mobile: data.donation.mobile || donation.mobile,
        amount: data.donation.amount != null ? data.donation.amount : donation.amount,
        paymentMethod: data.donation.paymentMethod || donation.paymentMethod,
        paymentDate: data.donation.paymentDate || donation.paymentDate,
        receiptNumber: data.donation.receiptNumber || donation.receiptNumber,
        festivalName: data.donation.festivalName || donation.festivalName,
        collectedByAdminName: data.donation.collectedByAdminName || donation.collectedByAdminName,
      } : donation;

      const targetMobile = freshDonation.mobile || donation.mobile;
      const msg = buildWhatsAppReceipt(freshDonation, data.pdfUrl);
      openWhatsApp(targetMobile, msg);
      toast.success('WhatsApp opened with fresh Vargani receipt!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to generate receipt');
    } finally {
      setSendingWhatsAppDonationId(null);
    }
  };

  const adminUser = getAdminUser();
  const collectedByName = adminUser?.fullName || adminUser?.username || '—';

const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${getApiUrl()}/api/admin/outsider-donations/stats`, { headers: authHeaders() });
      if (res.ok) setStats(await res.json());
    } catch { /* silent */ }
  }, []);

  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch(`${getApiUrl()}/api/admin/outsider-donations/reports`, { headers: authHeaders() });
      if (res.ok) setReports(await res.json());
    } catch { /* silent */ }
  }, []);

  const fetchDonations = useCallback(async (pageNum?: number) => {
    setIsLoading(true);
    try {
      const sp = new URLSearchParams();
      sp.set('page', String(pageNum ?? pagination.page));
      sp.set('limit', '20');
      if (search) sp.set('search', search);
      if (filterFestival) sp.set('festivalId', filterFestival);
      if (filterStatus) sp.set('status', filterStatus);
      if (filterPaymentMethod) sp.set('paymentMethod', filterPaymentMethod);
      if (filterDateFrom) sp.set('dateFrom', filterDateFrom);
      if (filterDateTo) sp.set('dateTo', filterDateTo);
      const res = await fetch(`${getApiUrl()}/api/admin/outsider-donations?${sp.toString()}`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setDonations(data.donations);
      setPagination(data.pagination);
    } catch { /* silent */ }
    finally { setIsLoading(false); }
  }, [pagination.page, search, filterFestival, filterStatus, filterPaymentMethod, filterDateFrom, filterDateTo]);

  useEffect(() => {
    fetch(`${getApiUrl()}/api/admin/festivals`, { headers: authHeaders() })
      .then(r => r.json())
      .then((data: FestivalOption[]) => setFestivals(data))
      .catch(() => toast.error('Failed to load festivals'));
  }, []);

  useEffect(() => { fetchStats(); fetchReports(); }, [fetchStats, fetchReports]);
  useEffect(() => { fetchDonations(); }, [fetchDonations]);

  const handleSearch = () => {
    setPagination(p => ({ ...p, page: 1 }));
    setSearch(searchInput);
  };

  const clearFilters = () => {
    setFilterFestival(''); setFilterStatus(''); setFilterPaymentMethod('');
    setFilterDateFrom(''); setFilterDateTo('');
    setPagination(p => ({ ...p, page: 1 }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!selectedFestival) newErrors.festival = 'Please select a festival';
    if (!fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!mobile.trim()) newErrors.mobile = 'Mobile number is required';
    else if (mobile.replace(/[^0-9]/g, '').length < 10) newErrors.mobile = 'Enter a valid 10-digit mobile number';
    if (paymentStatus === 'paid') {
      if (!amount || parseFloat(amount) <= 0) newErrors.amount = 'Valid donation amount is required';
      if (!paymentMethod || paymentMethod === 'pending') newErrors.paymentMethod = 'Payment method is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const clearForm = () => {
    setSelectedFestival(''); setFullName(''); setMobile(''); setEmail(''); setAddress('');
    setPaymentStatus('paid'); setPaymentMethod('cash'); setAmount('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPendingReason(''); setPendingCustomReason(''); setNotes('');
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSaving(true);
    try {
      const body: any = {
        festivalId: Number(selectedFestival),
        fullName: fullName.trim(),
        mobile: mobile.trim(),
        email: email.trim() || null,
        address: address.trim() || null,
        paymentStatus,
        notes: notes.trim() || null,
      };
      if (paymentStatus === 'paid') {
        body.amount = parseFloat(amount);
        body.paymentMethod = paymentMethod;
        body.paymentDate = paymentDate;
      } else {
        body.paymentMethod = 'pending';
        const reasonValue = pendingReason === 'Other' ? pendingCustomReason : pendingReason;
        body.pendingReason = reasonValue.trim() || null;
      }
      const res = await fetch(`${getApiUrl()}/api/admin/outsider-donations`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to save' }));
        toast.error(err.error || 'Failed to save donation');
        return;
      }
      toast.success(paymentStatus === 'paid' ? '🎉 Outsider donation recorded!' : '✅ Pending donation recorded');
      clearForm();
      fetchDonations(); fetchStats(); fetchReports();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save donation');
    } finally { setIsSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteDonation) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/admin/outsider-donations/${deleteDonation.id}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Donation deleted');
      setDeleteDonation(null);
      fetchDonations(); fetchStats(); fetchReports();
    } catch (err: any) { toast.error(err?.message || 'Failed to delete'); }
    finally { setIsDeleting(false); }
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

  const hasActiveFilters = filterFestival || filterStatus || filterPaymentMethod || filterDateFrom || filterDateTo;

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
                <HeartHandshake className="w-7 h-7 text-primary" /> Outsider Donations
              </h1>
              <p className="text-white/70">Record donations received from non-residents</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 py-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatsCard title="Total Outsider Collection" value={formatCurrency(stats?.totalCollection ?? 0)} icon={IndianRupee} color="text-emerald-600" />
          <StatsCard title="Total Donors" value={String(stats?.totalDonors ?? 0)} icon={Users} color="text-blue-600" />
          <StatsCard title="Today's Collection" value={formatCurrency(stats?.todayCollection ?? 0)} icon={TrendingUp} color="text-purple-600" />
          <StatsCard title="Pending Amount" value={formatCurrency(stats?.pendingAmount ?? 0)} icon={Clock} color="text-amber-600" />
        </div>

        {/* Donor Type Reports */}
        <div className="glass-card-glow rounded-2xl p-5 relative overflow-hidden mb-6">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 opacity-70" />
          <div className="flex items-center gap-2 mb-4">
            <Receipt className="w-4 h-4 text-accent" />
            <h3 className="font-serif font-bold text-foreground">Donation Reports (Donor Type)</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/30">
              <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider flex items-center gap-1"><Home className="w-3 h-3" /> Resident Collection</p>
              <p className="text-2xl font-bold text-blue-700 mt-1">{formatCurrency(reports?.residentCollection ?? 0)}</p>
            </div>
            <div className="p-4 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/50 dark:border-purple-900/30">
              <p className="text-[11px] font-semibold text-purple-600 uppercase tracking-wider flex items-center gap-1"><HeartHandshake className="w-3 h-3" /> Outsider Collection</p>
              <p className="text-2xl font-bold text-purple-700 mt-1">{formatCurrency(reports?.outsiderCollection ?? 0)}</p>
            </div>
            <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/30">
              <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider flex items-center gap-1"><IndianRupee className="w-3 h-3" /> Grand Total</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">{formatCurrency(reports?.grandTotal ?? 0)}</p>
            </div>
          </div>
        </div>

        {/* Donation Form */}
        <div className="glass-card-glow rounded-2xl p-6 relative overflow-hidden mb-6">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-purple-500 to-teal-400 opacity-70" />
          <h2 className="text-lg font-serif font-bold text-foreground mb-5 flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" /> Record Outsider Donation
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Details */}
            <div>
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <User className="w-4 h-4" /> Personal Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Full Name <span className="text-destructive">*</span></label>
                  <input type="text" value={fullName} onChange={e => { setFullName(e.target.value); setErrors(p => { const { fullName, ...r } = p; return r; }); }} placeholder="Enter donor's full name" className={cn("w-full px-3 py-2.5 text-sm rounded-lg border bg-background focus:ring-2 focus:ring-primary outline-none", errors.fullName ? 'border-destructive' : 'border-border')} />
                  {errors.fullName && <p className="text-xs text-destructive mt-1">{errors.fullName}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Mobile Number <span className="text-destructive">*</span></label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input type="tel" value={mobile} onChange={e => { setMobile(e.target.value); setErrors(p => { const { mobile, ...r } = p; return r; }); }} placeholder="10-digit mobile number" className={cn("w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border bg-background focus:ring-2 focus:ring-primary outline-none", errors.mobile ? 'border-destructive' : 'border-border')} />
                  </div>
                  {errors.mobile && <p className="text-xs text-destructive mt-1">{errors.mobile}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Email <span className="text-muted-foreground">(optional)</span></label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Address <span className="text-muted-foreground">(optional)</span></label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Donor's address" className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* Festival */}
            <div>
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Festival
              </h3>
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

            {/* Donation Details */}
            <div>
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <IndianRupee className="w-4 h-4" /> Donation Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Donation Amount (₹) <span className="text-destructive">*</span></label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input type="number" value={amount} onChange={e => { setAmount(e.target.value); setErrors(p => { const { amount, ...r } = p; return r; }); }} min={1} step={0.01} placeholder="0.00" disabled={paymentStatus === 'pending'} className={cn("w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border bg-background focus:ring-2 focus:ring-primary outline-none", errors.amount ? 'border-destructive' : 'border-border', paymentStatus === 'pending' && 'opacity-50 cursor-not-allowed')} />
                  </div>
                  {errors.amount && <p className="text-xs text-destructive mt-1">{errors.amount}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Donation Date</label>
                  <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Payment Status <span className="text-destructive">*</span></label>
                  <div className="relative">
                    <select value={paymentStatus} onChange={e => { setPaymentStatus(e.target.value as 'paid' | 'pending'); if (e.target.value === 'pending') { setAmount(''); setPaymentMethod('pending'); } }} className={cn("w-full px-3 py-2.5 text-sm rounded-lg border bg-background focus:ring-2 focus:ring-primary outline-none appearance-none font-semibold", paymentStatus === 'paid' ? 'border-emerald-400 text-emerald-700 dark:text-emerald-400' : 'border-amber-400 text-amber-700 dark:text-amber-400')}>
                      <option value="paid" className="text-emerald-700 bg-background">✅ Paid</option>
                      <option value="pending" className="text-amber-700 bg-background">⏳ Pending</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-muted-foreground" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Payment Method {paymentStatus === 'paid' && <span className="text-destructive">*</span>}</label>
                  <div className="relative">
                    <select value={paymentMethod} onChange={e => { setPaymentMethod(e.target.value); setErrors(p => { const { paymentMethod, ...r } = p; return r; }); }} disabled={paymentStatus === 'pending'} className={cn("w-full px-3 py-2.5 text-sm rounded-lg border bg-background focus:ring-2 focus:ring-primary outline-none appearance-none", errors.paymentMethod ? 'border-destructive' : 'border-border', paymentStatus === 'pending' && 'opacity-50 cursor-not-allowed')}>
                      <option value="">Select method...</option>
                      <option value="cash">💵 Cash</option>
                      <option value="upi">📱 UPI</option>
                      <option value="cheque">📄 Cheque</option>
                      <option value="bank_transfer">🏦 Bank Transfer</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-muted-foreground" />
                  </div>
                  {errors.paymentMethod && <p className="text-xs text-destructive mt-1">{errors.paymentMethod}</p>}
                </div>
              </div>

              {paymentStatus === 'pending' && (
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

              <div className="mt-4">
                <label className="block text-xs font-semibold text-foreground mb-1.5">Notes <span className="text-muted-foreground">(optional)</span></label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Additional remarks..." className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none resize-none" />
              </div>
            </div>

            {/* Collected By */}
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
              <label className="block text-xs font-semibold text-foreground mb-1.5">Collected By</label>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <span className="font-semibold text-foreground">{collectedByName}</span>
                <span className="text-xs text-muted-foreground">(auto-filled from logged-in admin)</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button type="submit" disabled={isSaving} className="w-full sm:w-auto px-8 py-3 bg-primary text-white rounded-xl font-bold text-lg hover:bg-primary/90 transition-all shadow-lg disabled:opacity-60 flex items-center justify-center gap-2">
                {isSaving ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
                {paymentStatus === 'paid' ? 'Record Donation' : 'Mark as Pending'}
              </button>
              <button type="button" onClick={clearForm} disabled={isSaving} className="w-full sm:w-auto px-8 py-3 border border-border text-foreground rounded-xl font-bold text-lg hover:bg-muted/50 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                <X className="w-5 h-5" /> Clear Form
              </button>
            </div>
          </form>
        </div>

        {/* Donations Table */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-serif font-bold text-foreground">Outsider Donation Records</h2>
              <p className="text-xs text-muted-foreground">Manage all outsider donations</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowFilters(!showFilters)} className={cn("flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all", showFilters || hasActiveFilters ? 'bg-primary/10 border-primary/30 text-primary' : 'border-border text-muted-foreground hover:bg-muted/50')}>
                <ListFilter className="w-3.5 h-3.5" /> Filters {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-primary" />}
              </button>
              <button onClick={() => { fetchDonations(); fetchStats(); fetchReports(); }} disabled={isLoading} className="px-3 py-2 border border-border rounded-lg text-sm font-semibold hover:bg-muted/50 transition-all">
                <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              </button>
            </div>
          </div>

          <div className="p-4 border-b border-border bg-muted/10">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-semibold text-foreground mb-1"><Search className="w-3 h-3 inline mr-1" /> Search</label>
                <div className="flex gap-2">
                  <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} placeholder="Name, Mobile, Receipt..." className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none" />
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
              <div className="w-[120px]">
                <label className="block text-xs font-semibold text-foreground mb-1">Status</label>
                <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none">
                  <option value="">All</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              <div className="w-[140px]">
                <label className="block text-xs font-semibold text-foreground mb-1">Method</label>
                <select value={filterPaymentMethod} onChange={e => { setFilterPaymentMethod(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none">
                  <option value="">All</option>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
            </div>

            {showFilters && (
              <div className="mt-3 pt-3 border-t border-border">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="w-[140px]">
                    <label className="block text-xs font-semibold text-foreground mb-1">Date From</label>
                    <input type="date" value={filterDateFrom} onChange={e => { setFilterDateFrom(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none" />
                  </div>
                  <div className="w-[140px]">
                    <label className="block text-xs font-semibold text-foreground mb-1">Date To</label>
                    <input type="date" value={filterDateTo} onChange={e => { setFilterDateTo(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none" />
                  </div>
                  <button onClick={clearFilters} className="px-3 py-2 border border-border rounded-lg text-xs font-semibold hover:bg-muted/50 transition-all">Clear Filters</button>
                </div>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
          ) : donations.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <HeartHandshake className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
              <p className="font-semibold text-foreground">{hasActiveFilters ? 'No donations match your filters' : 'No outsider donations recorded yet'}</p>
              <p className="text-sm mt-1">{hasActiveFilters ? 'Try adjusting your filters.' : 'Use the form above to record the first donation.'}</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground w-[50px]">#</th>
                      <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Receipt No.</th>
                      <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Name</th>
                      <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Mobile</th>
                      <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Festival</th>
                      <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Amount</th>
                      <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                      <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Method</th>
                      <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Pending Reason</th>
                      <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Collected By</th>
                      <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Date</th>
                      <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground w-[120px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {donations.map((d, idx) => {
                      const PayIcon = paymentMethodIcons[d.paymentMethod] || Banknote;
                      return (
                        <tr key={d.id} className={cn("border-b border-border/50 transition-colors hover:bg-muted/20", idx % 2 === 0 ? "bg-background" : "bg-muted/10")}>
                          <td className="px-3 py-3 text-xs text-muted-foreground font-mono">{(pagination.page - 1) * pagination.limit + idx + 1}</td>
                          <td className="px-3 py-3">
                            {d.receiptNumber ? <span className="font-mono text-[11px] font-semibold text-primary">{d.receiptNumber}</span> : <span className="text-muted-foreground text-sm">—</span>}
                          </td>
                          <td className="px-3 py-3"><span className="font-semibold text-foreground text-sm">{d.fullName}</span></td>
                          <td className="px-3 py-3 text-sm text-muted-foreground whitespace-nowrap">{d.mobile}</td>
                          <td className="px-3 py-3 text-sm text-muted-foreground">{d.festivalName} {d.festivalYear || ''}</td>
                          <td className="px-3 py-3">
                            {isPaid(d) ? <span className="font-bold text-foreground">{formatCurrency(d.amount)}</span> : <span className="text-amber-600 font-semibold">—</span>}
                          </td>
                          <td className="px-3 py-3">
                            <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold", isPaid(d) ? 'text-emerald-700 bg-emerald-100' : 'text-amber-700 bg-amber-100')}>
                              {isPaid(d) ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                              {isPaid(d) ? 'Paid' : 'Pending'}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            {isPaid(d) && d.paymentMethod ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/5 text-primary">
                                <PayIcon className="w-3 h-3" />{paymentMethodLabels[d.paymentMethod] || d.paymentMethod}
                              </span>
                            ) : <span className="text-muted-foreground text-sm">—</span>}
                          </td>
                          <td className="px-3 py-3 text-sm text-muted-foreground">{d.pendingReason || '—'}</td>
                          <td className="px-3 py-3 text-sm text-muted-foreground">{d.collectedByAdminName}</td>
                          <td className="px-3 py-3 text-sm text-muted-foreground whitespace-nowrap">{isPaid(d) ? formatDate(d.paymentDate) : '—'}</td>
                          <td className="px-3 py-3">
                            <div className="flex items-center justify-end gap-0.5">
                              <button onClick={() => setViewDonation(d)} className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors text-primary" title="View"><Eye className="w-3.5 h-3.5" /></button>
                              <button onClick={() => setEditDonation(d)} className="p-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-950/30 transition-colors text-amber-600" title="Edit"><Edit3 className="w-3.5 h-3.5" /></button>
                              <button onClick={() => setDeleteDonation(d)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-destructive" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                              {isPaid(d) && d.receiptNumber && (
                                <button
                                  onClick={() => handleSendWhatsAppReceipt(d)}
                                  disabled={sendingWhatsAppDonationId === d.id}
                                  className="p-1.5 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-950/30 transition-colors text-emerald-600 disabled:opacity-50"
                                  title="Send WhatsApp Receipt"
                                >
                                  {sendingWhatsAppDonationId === d.id ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <MessageSquare className="w-3.5 h-3.5" />
                                  )}
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
      {viewDonation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setViewDonation(null)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-lg font-serif font-bold text-foreground flex items-center gap-2"><Receipt className="w-5 h-5 text-primary" /> Donation Details</h2>
              <button onClick={() => setViewDonation(null)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-[130px_1fr] gap-y-3 text-sm">
                <span className="text-muted-foreground font-medium">Status</span>
                <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold w-fit", isPaid(viewDonation) ? 'text-emerald-700 bg-emerald-100' : 'text-amber-700 bg-amber-100')}>
                  {isPaid(viewDonation) ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                  {isPaid(viewDonation) ? 'Paid' : 'Pending'}
                </span>
                <span className="text-muted-foreground font-medium">Donor</span>
                <span className="font-semibold text-foreground">{viewDonation.fullName}</span>
                <span className="text-muted-foreground font-medium">Mobile</span>
                <span>{viewDonation.mobile}</span>
                {viewDonation.email && (<><span className="text-muted-foreground font-medium">Email</span><span>{viewDonation.email}</span></>)}
                {viewDonation.address && (<><span className="text-muted-foreground font-medium">Address</span><span>{viewDonation.address}</span></>)}
                <span className="text-muted-foreground font-medium">Festival</span>
                <span>{viewDonation.festivalName} {viewDonation.festivalYear || ''}</span>
                {isPaid(viewDonation) && (
                  <>
                    <span className="text-muted-foreground font-medium">Amount</span>
                    <span className="font-bold text-lg text-primary">{formatCurrency(viewDonation.amount)}</span>
                    <span className="text-muted-foreground font-medium">Method</span>
                    <span className="flex items-center gap-1.5">{paymentMethodLabels[viewDonation.paymentMethod] || viewDonation.paymentMethod}</span>
                    <span className="text-muted-foreground font-medium">Date</span>
                    <span>{formatDate(viewDonation.paymentDate)}</span>
                    <span className="text-muted-foreground font-medium">Receipt No</span>
                    <span className="font-mono text-sm font-semibold text-primary">{viewDonation.receiptNumber || '—'}</span>
                  </>
                )}
                {viewDonation.pendingReason && (<><span className="text-muted-foreground font-medium">Pending Reason</span><span>{viewDonation.pendingReason}</span></>)}
                <span className="text-muted-foreground font-medium">Collected By</span>
                <span className="flex items-center gap-1.5"><User className="w-4 h-4 text-muted-foreground" />{viewDonation.collectedByAdminName}</span>
                {viewDonation.notes && (<><span className="text-muted-foreground font-medium">Notes</span><span>{viewDonation.notes}</span></>)}
              </div>
              {isPaid(viewDonation) && viewDonation.receiptNumber && (
                <>
                  <button
                    type="button"
                    onClick={() => handleGeneratePdf(viewDonation)}
                    disabled={isGeneratingPdf || sendingWhatsAppDonationId === viewDonation.id}
                    className="w-full py-2.5 mb-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    <Receipt className="w-4 h-4" />
                    {isGeneratingPdf ? 'Generating Receipt...' : 'Generate Vargani Slip'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendWhatsAppReceipt(viewDonation)}
                    disabled={isGeneratingPdf || sendingWhatsAppDonationId === viewDonation.id}
                    className="w-full py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    <MessageSquare className="w-4 h-4" />
                    {sendingWhatsAppDonationId === viewDonation.id ? 'Opening WhatsApp...' : 'Send WhatsApp Receipt'}
                  </button>
                </>
              )}
            </div>
            <div className="flex justify-end p-4 border-t border-border bg-muted/20">
              <button onClick={() => setViewDonation(null)} className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editDonation && (
        <EditDonationModal donation={editDonation} onClose={() => setEditDonation(null)} onSaved={() => { setEditDonation(null); fetchDonations(); fetchStats(); fetchReports(); }} />
      )}

      {/* Delete Confirm */}
      {deleteDonation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteDonation(null)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-7 h-7 text-destructive" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Delete Donation?</h3>
              <p className="text-sm text-muted-foreground mb-1">{isPaid(deleteDonation) ? `Remove ${formatCurrency(deleteDonation.amount)} donation` : 'Remove pending donation'} from</p>
              <p className="text-sm font-bold text-foreground">{deleteDonation.fullName}?</p>
              <p className="text-xs text-muted-foreground mt-2">This action cannot be undone.</p>
            </div>
            <div className="flex gap-3 p-4 pt-0">
              <button onClick={() => setDeleteDonation(null)} disabled={isDeleting} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold hover:bg-muted/50 transition-all">Cancel</button>
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

// ── Edit Donation Modal ─────────────────────────────────────────────────────

function EditDonationModal({ donation, onClose, onSaved }: {
  donation: OutsiderDonation;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [isPaidStatus, setIsPaidStatus] = useState(isPaid(donation));
  const [amount, setAmount] = useState(donation.amount ? String(donation.amount) : '');
  const [paymentDate, setPaymentDate] = useState(donation.paymentDate || new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState(isPaid(donation) ? donation.paymentMethod : 'cash');
  const [notes, setNotes] = useState(donation.notes || '');
  const [pendingReason, setPendingReason] = useState(donation.pendingReason || '');
  const [pendingCustomReason, setPendingCustomReason] = useState(
    donation.pendingReason && !PENDING_REASONS.some(r => r.value === donation.pendingReason) ? donation.pendingReason : ''
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPaidStatus && (!amount || parseFloat(amount) <= 0)) {
      toast.error('Valid donation amount is required');
      return;
    }
    setIsSaving(true);
    try {
      const body: any = { paymentStatus: isPaidStatus ? 'paid' : 'pending', notes: notes.trim() || null };
      if (isPaidStatus) {
        body.amount = parseFloat(amount);
        body.paymentDate = paymentDate;
        body.paymentMethod = paymentMethod;
        body.pendingReason = null;
      } else {
        const reasonValue = pendingReason === 'Other' ? pendingCustomReason : pendingReason;
        body.pendingReason = reasonValue.trim() || null;
      }
      const res = await fetch(`${getApiUrl()}/api/admin/outsider-donations/${donation.id}`, {
        method: 'PATCH', headers: authHeaders(), body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to update' }));
        toast.error(err.error);
        return;
      }
      toast.success('Donation updated successfully');
      onSaved();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update donation');
    } finally { setIsSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-serif font-bold text-foreground flex items-center gap-2"><Edit3 className="w-5 h-5 text-amber-500" /> Edit Donation</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="p-3 bg-muted/30 rounded-xl">
            <p className="text-xs text-muted-foreground mb-1">Donor</p>
            <p className="font-semibold text-foreground">{donation.fullName}</p>
            <p className="text-xs text-muted-foreground">{donation.mobile}</p>
            {donation.receiptNumber && <p className="text-xs text-primary mt-1">Receipt: {donation.receiptNumber}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Payment Status <span className="text-destructive">*</span></label>
            <select value={isPaidStatus ? 'paid' : 'pending'} onChange={e => { const val = e.target.value; if (val === 'pending') { setIsPaidStatus(false); setPaymentMethod('pending'); } else { setIsPaidStatus(true); setPaymentMethod('cash'); } }} className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none">
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          {isPaidStatus && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Amount (₹) <span className="text-destructive">*</span></label>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} min={1} step={0.01} className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Payment Date</label>
                <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-foreground mb-1.5">Payment Method</label>
                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none">
                  <option value="cash">Cash</option><option value="upi">UPI</option><option value="bank_transfer">Bank Transfer</option><option value="cheque">Cheque</option>
                </select>
              </div>
            </div>
          )}

          <div><label className="block text-xs font-semibold text-foreground mb-1.5">Notes</label><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none resize-none" /></div>

          {!isPaidStatus && (
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Pending Reason</label>
              <select value={pendingReason === 'Other' && pendingCustomReason ? 'Other' : pendingReason} onChange={e => { setPendingReason(e.target.value); setPendingCustomReason(''); }} className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none">
                <option value="">Select a reason...</option>
                {PENDING_REASONS.map(r => (<option key={r.value} value={r.value}>{r.label}</option>))}
              </select>
              {pendingReason === 'Other' && (<div className="mt-2"><label className="block text-xs font-semibold text-foreground mb-1.5">Custom Reason</label><input type="text" value={pendingCustomReason} onChange={e => setPendingCustomReason(e.target.value)} placeholder="Enter custom reason..." className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none" autoFocus /></div>)}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={isSaving} className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
              {isSaving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Edit3 className="w-4 h-4" />} Update Donation
            </button>
            <button type="button" onClick={onClose} className="px-5 py-2.5 border border-border rounded-xl text-sm font-semibold hover:bg-muted/50 transition-all">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
