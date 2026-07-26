import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'wouter';
import { ArrowLeft, MapPin, CalendarDays, IndianRupee, Users, Search, Plus, Eye, Edit3, Trash2, Building2, Home, Phone, User, X, CheckCircle, XCircle, Clock, Filter, RefreshCw, AlertTriangle, Wallet, Banknote, CreditCard, Receipt, ChevronLeft, ChevronRight, Check, Send, ChevronDown, MessageSquare, ListFilter, Save } from 'lucide-react';
import { toast } from 'sonner';
import { cn, getApiUrl } from '@/lib/utils';
import { PENDING_REASONS } from '@/lib/pending-reasons';

// ── Types ────────────────────────────────────────────────────────────────────

interface Festival {
  id: number; name: string; year: number;
  startDate: string; endDate: string;
  description: string; expectedDonation: string | null;
  status: string;
  totalCollection: number; totalEntries: number;
  residentsPaid: number; residentsPending: number;
}

interface Donation {
  id: number; festivalId: number; residentId: number;
  paymentMethod: string;
  amount: number | null; paymentDate: string | null; receiptNumber: string | null;
  receiptGeneratedAt: string | null;
  pendingReason: string | null;
  notes: string | null;
  collectedByAdminId: string; collectedByAdminName: string;
  createdAt: string; updatedAt: string;
  residentName: string; residentMobile: string;
  flatNo: string; buildingName: string; wingName: string;
}

function isPaid(donation: Donation): boolean {
  return donation.paymentMethod !== 'pending';
}

interface SearchResident {
  id: number; fullName: string; mobile: string;
  flatNo: string; buildingId: number; wingId: number | null;
  buildingName: string; wingName: string;
}

interface FestivalHistory {
  festivalName: string; year: number; festivalId: number;
  status: string; amount: number | null;
  receiptNumber: string | null; paymentDate: string | null;
  paymentMethod: string | null; collectedBy: string; notes: string | null;
}

interface Pagination { page: number; limit: number; total: number; totalPages: number; }

interface Stats {
  totalCollection: number; expectedCollection: number;
  pendingCollection: number; totalEntries: number;
  totalResidents: number; residentsPaid: number;
  residentsPending: number; averageDonation: number;
  paymentMethodDistribution: { method: string; total: number; count: number }[];
  collectionByDay: { date: string; total: number; count: number }[];
}

interface Building { id: number; buildingName: string; hasWings: boolean; }
interface Wing { id: number; wingName: string; }

// ── Auth helpers ─────────────────────────────────────────────────────────────

function getAdminToken(): string | null {
  try {
    const stored = localStorage.getItem('admin_auth');
    if (!stored) return null;
    return JSON.parse(stored)?.token || null;
  } catch { return null; }
}

function getAdminUser(): { username: string; role: string } | null {
  try {
    const stored = localStorage.getItem('admin_auth');
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return { username: parsed.username, role: parsed.role };
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

const statusColors: Record<string, string> = {
  upcoming: 'text-blue-700 bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400',
  active: 'text-emerald-700 bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400',
  completed: 'text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400',
};

const statusIcons: Record<string, any> = { upcoming: Clock, active: CheckCircle, completed: XCircle };

const paymentMethodLabels: Record<string, string> = {
  cash: 'Cash', upi: 'UPI', bank_transfer: 'Bank Transfer', cheque: 'Cheque',
};

const paymentMethodIcons: Record<string, any> = { cash: Banknote, upi: CreditCard, bank_transfer: Wallet, cheque: Receipt };

// ── WhatsApp Receipt Generator ───────────────────────────────────────────────

function buildWhatsAppReceipt(donation: Donation, festivalName: string): string {
  const msg = [
    '🏡 *Meditiya Sathi*',
    '',
    '*Donation Receipt*',
    '',
    `Festival: ${festivalName}`,
    `Resident: ${donation.residentName}`,
    `Building: ${donation.buildingName || '—'}`,
    `Wing: ${donation.wingName || 'NA'}`,
    `Flat: ${donation.flatNo}`,
    `Amount Received: ₹${donation.amount?.toLocaleString('en-IN') || '0'}`,
    `Payment Method: ${paymentMethodLabels[donation.paymentMethod || ''] || donation.paymentMethod || '—'}`,
    `Date: ${formatDate(donation.paymentDate)}`,
    `Collected By: ${donation.collectedByAdminName}`,
    `Receipt No: ${donation.receiptNumber || '—'}`,
    '',
    'Thank you for supporting our community. 🙏',
  ].join('\n');
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

// ── Searchable Resident Dropdown ─────────────────────────────────────────────
// Queries residents table only. Festival history is fetched after selection.

function ResidentSearchDropdown({ onSelect, selectedResident, onClear }: {
  onSelect: (resident: SearchResident) => void;
  selectedResident: SearchResident | null;
  onClear: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResident[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeout = useRef<NodeJS.Timeout | undefined>(undefined);

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
    // Don't search while a resident is selected — the query shows their name
    if (selectedResident) return;
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (query.length < 1) { setResults([]); setIsOpen(false); return; }
    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`${getApiUrl()}/api/admin/residents/search?q=${encodeURIComponent(query)}`, { headers: authHeaders() });
        if (res.ok) {
          const data = await res.json();
          setResults(data.residents || []);
          setIsOpen(true);
          setSelectedIdx(-1);
        } else {
          const err = await res.json().catch(() => ({ error: 'Search failed' }));
          toast.error(err.error || 'Failed to search residents');
        }
      } catch (err: any) {
        toast.error(err?.message || 'Network error while searching residents');
      }
      finally { setIsSearching(false); }
    }, 300);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [query, selectedResident]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && selectedIdx >= 0) {
      e.preventDefault();
      handleSelect(results[selectedIdx]);
    } else if (e.key === 'Escape') { setIsOpen(false); }
  };

  const handleSelect = (r: SearchResident) => {
    onSelect(r);
    setQuery(r.fullName);
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
      <label className="block text-xs font-semibold text-foreground mb-1.5">Search Resident <span className="text-destructive">*</span></label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); if (selectedResident) handleClear(); }}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results.length > 0) setIsOpen(true); }}
          placeholder="Type name, mobile, building, wing, or flat..."
          className="w-full pl-10 pr-10 py-2.5 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none"
        />
        {isSearching && <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />}
        {!isSearching && selectedResident && (
          <button type="button" onClick={handleClear} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-destructive">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && results.length > 0 && !selectedResident && (
        <div className="absolute z-50 mt-1 w-full border border-border rounded-xl bg-card shadow-xl max-h-80 overflow-y-auto">
          {results.map((r, idx) => (
            <button
              key={r.id}
              type="button"
              onClick={() => handleSelect(r)}
              className={cn(
                "w-full px-3 py-3 text-left hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0",
                idx === selectedIdx && "bg-muted/30"
              )}
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-foreground text-sm block truncate">{r.fullName}</span>
                  <span className="text-xs text-muted-foreground block">
                    <Building2 className="w-3 h-3 inline mr-0.5" />
                    {r.buildingName}{r.wingName ? ` - ${r.wingName}` : ''} - {r.flatNo}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    <Phone className="w-3 h-3 inline mr-0.5" />{r.mobile}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
              </div>

              {/* Festival History is shown in SelectedResidentCard after selection */}
            </button>
          ))}
        </div>
      )}

      {isOpen && results.length === 0 && query.length >= 2 && !isSearching && (
        <div className="absolute z-50 mt-1 w-full border border-border rounded-xl bg-card shadow-xl p-4 text-center text-sm text-muted-foreground">
          No residents found matching "{query}"
        </div>
      )}
    </div>
  );
}

// ── Selected Resident Card ───────────────────────────────────────────────────

function SelectedResidentCard({ resident, festivalHistory }: {
  resident: SearchResident;
  festivalHistory: FestivalHistory[];
}) {
  return (
    <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-primary uppercase tracking-wider">Selected Resident</span>
      </div>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <User className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-foreground">{resident.fullName}</p>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5" />
            {resident.buildingName}{resident.wingName ? ` - ${resident.wingName}` : ''}, Flat {resident.flatNo}
          </p>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Phone className="w-3.5 h-3.5" />
            {resident.mobile}
          </p>
        </div>
      </div>

      {/* Festival History */}
      {festivalHistory.length > 0 && (
        <div className="mt-3 pt-3 border-t border-primary/10">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Previous Festival Donations</p>
          <div className="space-y-1.5">
            {festivalHistory.map((h, hi) => (
              <div key={hi} className="flex items-center justify-between text-sm">
                <span className="text-foreground">
                  {h.festivalName} {h.year}
                </span>
                <span className={cn(
                  "font-semibold",
                  h.status === 'paid' ? 'text-emerald-600' : 'text-amber-600'
                )}>
                  {h.status === 'paid' ? `Paid ${formatCurrency(h.amount)}` : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Add Donation Modal ───────────────────────────────────────────────────────

function AddDonationModal({ festivalId, festivalName, onClose, onSaved }: {
  festivalId: number; festivalName: string;
  onClose: () => void; onSaved: () => void;
}) {
  const [selectedResident, setSelectedResident] = useState<SearchResident | null>(null);
  const [festivalHistory, setFestivalHistory] = useState<FestivalHistory[]>([]);
  const [donationStatus, setDonationStatus] = useState<'paid' | 'pending'>('pending');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [pendingReason, setPendingReason] = useState('');
  const [pendingCustomReason, setPendingCustomReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Validation error states
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearForm = () => {
    setSelectedResident(null);
    setFestivalHistory([]);
    setDonationStatus('pending');
    setAmount('');
    setPaymentMethod('cash');
    setNotes('');
    setPendingReason('');
    setPendingCustomReason('');
    setErrors({});
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!selectedResident) newErrors.resident = 'Please select a resident';
    if (donationStatus === 'paid') {
      if (!amount || parseFloat(amount) <= 0) newErrors.amount = 'Valid amount is required';
      if (!paymentMethod || paymentMethod === 'pending') newErrors.paymentMethod = 'Payment method is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleResidentSelect = async (resident: SearchResident) => {
    setSelectedResident(resident);
    setErrors(prev => { const { resident, ...rest } = prev; return rest; });
    // Fetch festival history
    try {
      const res = await fetch(`${getApiUrl()}/api/admin/residents/${resident.id}/festival-history`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setFestivalHistory(data || []);
      }
    } catch { /* ignore */ }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSaving(true);
    try {
      const body: any = {
        residentId: selectedResident!.id,
        paymentMethod: donationStatus === 'paid' ? paymentMethod : 'pending',
        notes: notes.trim() || null,
      };
      if (donationStatus === 'paid') {
        body.amount = parseFloat(amount);
        body.paymentDate = paymentDate;
      } else {
        // Include pending reason for pending donations
        const reasonValue = pendingReason === 'Other' ? pendingCustomReason : pendingReason;
        body.pendingReason = reasonValue.trim() || null;
      }
      const res = await fetch(`${getApiUrl()}/api/admin/festivals/${festivalId}/donations`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to save' }));
        if (res.status === 409) {
          toast.error(err.error, { duration: 5000 });
        } else {
          toast.error(err.error);
        }
        return;
      }
      toast.success(donationStatus === 'paid' ? '🎉 Donation recorded successfully!' : '✅ Pending donation recorded');
      onSaved();
      // Clear editable fields but keep festival selected for quick next entry
      clearForm();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save donation');
    } finally { setIsSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-lg w-full my-8" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-serif font-bold text-foreground flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" /> Add Donation
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Festival Banner */}
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Collecting for</p>
              <p className="font-bold text-foreground text-sm">{festivalName}</p>
            </div>
          </div>

          {/* Resident Search */}
          <div className="space-y-3">
            <ResidentSearchDropdown
              selectedResident={selectedResident}
              onSelect={handleResidentSelect}
              onClear={() => { setSelectedResident(null); setFestivalHistory([]); setErrors(prev => { const { resident, ...rest } = prev; return rest; }); }}
            />
            {errors.resident && <p className="text-xs text-destructive">{errors.resident}</p>}

            {/* Selected Resident Info */}
            {selectedResident && (
              <SelectedResidentCard resident={selectedResident} festivalHistory={festivalHistory} />
            )}
          </div>

          {/* Donation Status Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Donation Status <span className="text-destructive">*</span></label>
            <div className="relative">
              <select
                value={donationStatus}
                onChange={e => {
                  setDonationStatus(e.target.value as 'paid' | 'pending');
                  if (e.target.value === 'pending') {
                    setAmount('');
                    setPaymentMethod('cash');
                  }
                  setErrors(prev => { const { amount, paymentMethod, ...rest } = prev; return rest; });
                }}
                className={cn(
                  "w-full px-4 py-2.5 text-sm rounded-xl border bg-background focus:ring-2 focus:ring-primary outline-none appearance-none cursor-pointer transition-all",
                  donationStatus === 'paid'
                    ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 font-semibold'
                    : 'border-amber-400 bg-amber-50/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 font-semibold'
                )}
              >
                <option value="pending" className="text-amber-700 bg-background">⏳ Pending</option>
                <option value="paid" className="text-emerald-700 bg-background">✅ Paid</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-muted-foreground" />
            </div>
          </div>

          {/* Payment Card (shown when Paid) */}
          {donationStatus === 'paid' && (
            <div className="p-4 bg-emerald-50/30 dark:bg-emerald-950/10 border border-emerald-200/50 dark:border-emerald-900/30 rounded-xl space-y-4">
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" /> Payment Details
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Amount (₹) <span className="text-destructive">*</span></label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                      type="number"
                      value={amount}
                      onChange={e => { setAmount(e.target.value); setErrors(prev => { const { amount, ...rest } = prev; return rest; }); }}
                      min={1} step={0.01}
                      placeholder="0.00"
                      className={cn(
                        "w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border bg-background focus:ring-2 focus:ring-primary outline-none",
                        errors.amount ? 'border-destructive' : 'border-border'
                      )}
                    />
                  </div>
                  {errors.amount && <p className="text-xs text-destructive mt-1">{errors.amount}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Payment Method <span className="text-destructive">*</span></label>
                  <select
                    value={paymentMethod}
                    onChange={e => { setPaymentMethod(e.target.value); setErrors(prev => { const { paymentMethod, ...rest } = prev; return rest; }); }}
                    className={cn(
                      "w-full px-3 py-2.5 text-sm rounded-lg border bg-background focus:ring-2 focus:ring-primary outline-none",
                      errors.paymentMethod ? 'border-destructive' : 'border-border'
                    )}
                  >
                    <option value="cash">💵 Cash</option>
                    <option value="upi">📱 UPI</option>
                    <option value="bank_transfer">🏦 Bank Transfer</option>
                    <option value="cheque">📄 Cheque</option>
                  </select>
                  {errors.paymentMethod && <p className="text-xs text-destructive mt-1">{errors.paymentMethod}</p>}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Payment Date</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={e => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
            </div>
          )}

          {/* Payment Method (disabled, shown when Pending) */}
          {donationStatus === 'pending' && (
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Payment Method</label>
              <select
                disabled
                value="pending"
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-muted/50 text-muted-foreground outline-none cursor-not-allowed"
              >
                <option value="pending">⏳ Will be collected later</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">Set status to Paid to enable payment method selection</p>
            </div>
          )}

          {/* Pending Reason Dropdown (shown when Pending) */}
          {donationStatus === 'pending' && (
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Pending Reason</label>
              <select
                value={pendingReason}
                onChange={e => { setPendingReason(e.target.value); setPendingCustomReason(''); }}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none"
              >
                <option value="">Select a reason...</option>
                {PENDING_REASONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              {pendingReason === 'Other' && (
                <div className="mt-2">
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Custom Reason</label>
                  <input
                    type="text"
                    value={pendingCustomReason}
                    onChange={e => setPendingCustomReason(e.target.value)}
                    placeholder="Enter custom reason..."
                    className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none"
                    autoFocus
                  />
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Notes <span className="text-muted-foreground">(optional)</span></label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder={donationStatus === 'pending' ? 'e.g. Will pay next week, Paid through committee member...' : 'e.g. Paid via UPI, Receipt requested later...'}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2 border-t border-border">
            <button
              type="submit"
              disabled={isSaving || !selectedResident}
              className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg"
            >
              {isSaving ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {donationStatus === 'paid' ? 'Save Donation' : 'Mark as Pending'}
            </button>
            <button
              type="button"
              onClick={onClose}
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

// ── Edit Donation Modal ──────────────────────────────────────────────────────

function EditDonationModal({ donation, festivalName, onClose, onSaved }: {
  donation: Donation; festivalName: string;
  onClose: () => void; onSaved: () => void;
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
      const body: any = {
        paymentMethod: isPaidStatus ? paymentMethod : 'pending',
        notes: notes.trim() || null,
      };
      if (isPaidStatus) {
        body.amount = parseFloat(amount);
        body.paymentDate = paymentDate;
        // Clear pending reason when changing to paid
        body.pendingReason = null;
      } else {
        // Include pending reason for pending donations
        const reasonValue = pendingReason === 'Other' ? pendingCustomReason : pendingReason;
        body.pendingReason = reasonValue.trim() || null;
      }
      const res = await fetch(`${getApiUrl()}/api/admin/festivals/${donation.festivalId}/donations/${donation.id}`, {
        method: 'PATCH', headers: authHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to update' }));
        toast.error(err.error);
        return;
      }
      toast.success('Donation updated successfully');
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update donation');
    } finally { setIsSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-serif font-bold text-foreground flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-amber-500" /> Edit Donation
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Resident Info */}
          <div className="p-3 bg-muted/30 rounded-xl">
            <p className="text-xs text-muted-foreground mb-1">Resident</p>
            <p className="font-semibold text-foreground">{donation.residentName}</p>
            <p className="text-xs text-muted-foreground">{donation.buildingName}{donation.wingName ? ` - ${donation.wingName}` : ''}, Flat {donation.flatNo}</p>
            {donation.receiptNumber && <p className="text-xs text-primary mt-1">Receipt: {donation.receiptNumber}</p>}
          </div>

          {/* Payment Method / Status */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Payment Method <span className="text-destructive">*</span></label>
            <select
              value={isPaidStatus ? paymentMethod : 'pending'}
              onChange={e => {
                const val = e.target.value;
                if (val === 'pending') { setIsPaidStatus(false); setPaymentMethod('pending'); }
                else { setIsPaidStatus(true); setPaymentMethod(val); }
              }}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="pending">Pending</option>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>

          {isPaidStatus && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Amount (₹) <span className="text-destructive">*</span></label>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)} min={1} step={0.01} className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Payment Date</label>
                  <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none" />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none resize-none" />
          </div>

          {/* Pending Reason - shown when status is pending */}
          {!isPaidStatus && (
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Pending Reason</label>
              <select
                value={pendingReason === 'Other' && pendingCustomReason ? 'Other' : pendingReason}
                onChange={e => { setPendingReason(e.target.value); setPendingCustomReason(''); }}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none"
              >
                <option value="">Select a reason...</option>
                {PENDING_REASONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              {pendingReason === 'Other' && (
                <div className="mt-2">
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Custom Reason</label>
                  <input
                    type="text"
                    value={pendingCustomReason}
                    onChange={e => setPendingCustomReason(e.target.value)}
                    placeholder="Enter custom reason..."
                    className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none"
                    autoFocus
                  />
                </div>
              )}
              {donation.pendingReason && !PENDING_REASONS.some(r => r.value === donation.pendingReason) && !pendingReason && (
                <p className="text-xs text-muted-foreground mt-1">Previous reason: "{donation.pendingReason}"</p>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={isSaving} className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
              {isSaving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Edit3 className="w-4 h-4" />}
              Update Donation
            </button>
            <button type="button" onClick={onClose} className="px-5 py-2.5 border border-border rounded-xl text-sm font-semibold hover:bg-muted/50 transition-all">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete Donation Confirm ──────────────────────────────────────────────────

function DeleteDonationDialog({ donation, onConfirm, onCancel, isLoading }: {
  donation: Donation; onConfirm: () => void; onCancel: () => void; isLoading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <div className="p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-destructive" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">Delete Donation?</h3>
          <p className="text-sm text-muted-foreground mb-1">{isPaid(donation) ? `Remove ${formatCurrency(donation.amount)} donation` : 'Remove pending donation'} from</p>
          <p className="text-sm font-bold text-foreground">{donation.residentName}?</p>
          <p className="text-xs text-muted-foreground mt-2">This action cannot be undone.</p>
        </div>
        <div className="flex gap-3 p-4 pt-0">
          <button onClick={onCancel} disabled={isLoading} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold hover:bg-muted/50 transition-all">Cancel</button>
          <button onClick={onConfirm} disabled={isLoading} className="flex-1 py-2.5 bg-destructive text-destructive-foreground rounded-xl text-sm font-semibold hover:bg-destructive/90 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
            {isLoading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── View Donation Modal ──────────────────────────────────────────────────────

function ViewDonationModal({ donation, festivalName, onClose }: { donation: Donation; festivalName: string; onClose: () => void }) {
  const PayIcon = paymentMethodIcons[donation.paymentMethod || ''] || Banknote;
  const handleWhatsApp = () => {
    const msg = buildWhatsAppReceipt(donation, festivalName);
    openWhatsApp(donation.residentMobile, msg);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-serif font-bold text-foreground flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" /> Donation Details
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-[130px_1fr] gap-y-3 text-sm">
            <span className="text-muted-foreground font-medium">Status</span>
            <span>
              <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold", isPaid(donation) ? 'text-emerald-700 bg-emerald-100' : 'text-amber-700 bg-amber-100')}>
                {isPaid(donation) ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                {isPaid(donation) ? 'Paid' : 'Pending'}
              </span>
            </span>
            <span className="text-muted-foreground font-medium">Resident</span>
            <span className="font-semibold text-foreground">{donation.residentName}</span>
            <span className="text-muted-foreground font-medium">Building</span>
            <span>{donation.buildingName || '—'}</span>
            <span className="text-muted-foreground font-medium">Wing</span>
            <span>{donation.wingName || '—'}</span>
            <span className="text-muted-foreground font-medium">Flat</span>
            <span><span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-amber-700 font-mono font-bold text-xs border border-amber-200"><Home className="w-3 h-3" /> {donation.flatNo}</span></span>

              {isPaid(donation) && (
              <>
                <span className="text-muted-foreground font-medium">Amount</span>
                <span className="font-bold text-lg text-primary">{formatCurrency(donation.amount)}</span>
                <span className="text-muted-foreground font-medium">Method</span>
                <span className="flex items-center gap-1.5"><PayIcon className="w-4 h-4 text-muted-foreground" />{paymentMethodLabels[donation.paymentMethod || ''] || donation.paymentMethod}</span>
                <span className="text-muted-foreground font-medium">Date</span>
                <span>{formatDate(donation.paymentDate)}</span>
                <span className="text-muted-foreground font-medium">Receipt No</span>
                <span className="font-mono text-sm font-semibold text-primary">{donation.receiptNumber || '—'}</span>
              </>
            )}

            <span className="text-muted-foreground font-medium">Collected By</span>
            <span className="flex items-center gap-1.5"><User className="w-4 h-4 text-muted-foreground" />{donation.collectedByAdminName}</span>
            {donation.notes && (<><span className="text-muted-foreground font-medium">Notes</span><span>{donation.notes}</span></>)}
          </div>

          {/* WhatsApp Receipt Button */}
          {isPaid(donation) && donation.receiptNumber && (
            <button
              type="button"
              onClick={handleWhatsApp}
              className="w-full py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              Send WhatsApp Receipt
            </button>
          )}
        </div>
        <div className="flex justify-end p-4 border-t border-border bg-muted/20">
          <button onClick={onClose} className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all">Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Sort Header ──────────────────────────────────────────────────────────────

function SortHeader({ label, field, currentSort, currentOrder, onSort }: {
  label: string; field: string; currentSort: string; currentOrder: string; onSort: (field: string) => void;
}) {
  const isActive = currentSort === field;
  return (
    <button onClick={() => onSort(field)} className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
      {label}
      {isActive ? <span className="text-primary">{currentOrder === 'asc' ? ' ▲' : ' ▼'}</span> : <span className="opacity-30"> ⇅</span>}
    </button>
  );
}

// ── Stats Card ───────────────────────────────────────────────────────────────

function StatsCard({ title, value, icon: Icon, color, subtitle, onClick }: {
  title: string; value: string; icon: any; color: string; subtitle?: string; onClick?: () => void;
}) {
  return (
    <div className={cn("bg-card border border-border rounded-xl p-4 shadow-sm", onClick && "cursor-pointer hover:border-primary/50 transition-all")} onClick={onClick}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className={cn("text-2xl font-bold mt-1", color)}>{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-muted">
          <Icon className={cn("w-5 h-5", color)} />
        </div>
      </div>
    </div>
  );
}

// ── Pending Residents Modal ──────────────────────────────────────────────────

function PendingResidentsModal({ festivalId, onClose }: { festivalId: number; onClose: () => void }) {
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${getApiUrl()}/api/admin/festivals/${festivalId}/pending-residents`, { headers: authHeaders() })
      .then(r => r.json())
      .then(data => setPending(data))
      .catch(() => toast.error('Failed to load pending residents'))
      .finally(() => setLoading(false));
  }, [festivalId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-serif font-bold text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" /> Pending Residents
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
          ) : pending.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">No pending donations</div>
          ) : (
            <div className="space-y-2">
              {pending.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-amber-50/50 dark:bg-amber-950/10 rounded-xl border border-amber-100 dark:border-amber-900/30">
                  <div>
                    <p className="font-semibold text-foreground">{p.fullName}</p>
                    <p className="text-xs text-muted-foreground">{p.buildingName}{p.wingName ? ` - ${p.wingName}` : ''}, Flat {p.flatNo} | 📱 {p.mobile}</p>
                    {p.notes && <p className="text-xs text-muted-foreground mt-1">Note: {p.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function AdminFestivalDetail() {
  const params = useParams();
  const festivalId = (params as any)?.id ? parseInt((params as any).id, 10) : null;

  const [festival, setFestival] = useState<Festival | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoadingFestival, setIsLoadingFestival] = useState(true);
  const [festivalError, setFestivalError] = useState<string | null>(null);

  // Donations
  const [donations, setDonations] = useState<Donation[]>([]);
  const [donationPagination, setDonationPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [isLoadingDonations, setIsLoadingDonations] = useState(true);
  const [donationSearch, setDonationSearch] = useState('');
  const [donationSearchInput, setDonationSearchInput] = useState('');
  const [donationSortBy, setDonationSortBy] = useState('createdAt');
  const [donationSortOrder, setDonationSortOrder] = useState('desc');

  // Filters
  const [filterDonationStatus, setFilterDonationStatus] = useState('');
  const [filterBuildingId, setFilterBuildingId] = useState<string>('');
  const [filterWingId, setFilterWingId] = useState<string>('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterAmountMin, setFilterAmountMin] = useState('');
  const [filterAmountMax, setFilterAmountMax] = useState('');
  const [filterAdminId, setFilterAdminId] = useState('');
  const [filterPendingReason, setFilterPendingReason] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Buildings & Wings for filters
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [filterWings, setFilterWings] = useState<Wing[]>([]);
  const [admins, setAdmins] = useState<{ id: string; name: string }[]>([]);

  // Modals
  const [showAddDonation, setShowAddDonation] = useState(false);
  const [showPending, setShowPending] = useState(false);
  const [viewDonation, setViewDonation] = useState<Donation | null>(null);
  const [editDonation, setEditDonation] = useState<Donation | null>(null);
  const [deleteDonation, setDeleteDonation] = useState<Donation | null>(null);
  const [isDeletingDonation, setIsDeletingDonation] = useState(false);

  // Fetch buildings for filters
  useEffect(() => {
    fetch(`${getApiUrl()}/api/admin/buildings/manage`, { headers: authHeaders() })
      .then(r => r.json())
      .then((data: Building[]) => setBuildings(data))
      .catch(() => {});
  }, []);

  // Fetch wings when filter building changes
  useEffect(() => {
    if (!filterBuildingId) { setFilterWings([]); return; }
    fetch(`${getApiUrl()}/api/admin/buildings/${filterBuildingId}/wings/manage`, { headers: authHeaders() })
      .then(r => r.json())
      .then((data: Wing[]) => setFilterWings(data))
      .catch(() => setFilterWings([]));
  }, [filterBuildingId]);

  // Fetch unique admins from donations
  useEffect(() => {
    if (!festivalId) return;
    fetch(`${getApiUrl()}/api/admin/festivals/${festivalId}/donations?limit=500`, { headers: authHeaders() })
      .then(r => r.json())
      .then(data => {
        const unique = new Map<string, string>();
        (data.donations || []).forEach((d: Donation) => {
          if (d.collectedByAdminId) unique.set(d.collectedByAdminId, d.collectedByAdminName);
        });
        setAdmins(Array.from(unique, ([id, name]) => ({ id, name })));
      })
      .catch(() => {});
  }, [festivalId]);

  // Fetch festival
  const fetchFestival = useCallback(async () => {
    if (!festivalId) return;
    setIsLoadingFestival(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/admin/festivals/${festivalId}`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch festival');
      setFestival(await res.json());
    } catch (err: any) {
      setFestivalError(err?.message || 'Failed to load festival');
    } finally { setIsLoadingFestival(false); }
  }, [festivalId]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    if (!festivalId) return;
    try {
      const res = await fetch(`${getApiUrl()}/api/admin/festivals/${festivalId}/stats`, { headers: authHeaders() });
      if (res.ok) setStats(await res.json());
    } catch { /* silent */ }
  }, [festivalId]);

  // Fetch donations
  const fetchDonations = useCallback(async (pageNum?: number) => {
    if (!festivalId) return;
    setIsLoadingDonations(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(pageNum ?? donationPagination.page));
      params.set('limit', '20');
      if (donationSearch) params.set('search', donationSearch);
params.set('sortBy', donationSortBy);
      params.set('sortOrder', donationSortOrder);
      if (filterDonationStatus) params.set('donationStatus', filterDonationStatus);
      if (filterBuildingId) params.set('buildingId', filterBuildingId);
      if (filterWingId) params.set('wingId', filterWingId);
      if (filterPaymentMethod) params.set('paymentMethod', filterPaymentMethod);
      if (filterPendingReason) params.set('pendingReason', filterPendingReason);
      if (filterDateFrom) params.set('dateFrom', filterDateFrom);
      if (filterDateTo) params.set('dateTo', filterDateTo);
      if (filterAmountMin) params.set('amountMin', filterAmountMin);
      if (filterAmountMax) params.set('amountMax', filterAmountMax);
      if (filterAdminId) params.set('adminId', filterAdminId);

      const res = await fetch(`${getApiUrl()}/api/admin/festivals/${festivalId}/donations?${params.toString()}`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setDonations(data.donations);
      setDonationPagination(data.pagination);
    } catch { /* silent */ }
    finally { setIsLoadingDonations(false); }
  }, [festivalId, donationPagination.page, donationSearch, donationSortBy, donationSortOrder, filterDonationStatus, filterBuildingId, filterWingId, filterPaymentMethod, filterPendingReason, filterDateFrom, filterDateTo, filterAmountMin, filterAmountMax, filterAdminId]);

  useEffect(() => { if (festivalId) { fetchFestival(); fetchStats(); } }, [festivalId, fetchFestival, fetchStats]);
  useEffect(() => { fetchDonations(); }, [fetchDonations]);

  const handleDonationSearch = () => {
    setDonationPagination(p => ({ ...p, page: 1 }));
    setDonationSearch(donationSearchInput);
  };

  const handleDonationSort = (field: string) => {
    if (donationSortBy === field) setDonationSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setDonationSortBy(field); setDonationSortOrder('asc'); }
  };

  const clearFilters = () => {
    setFilterDonationStatus(''); setFilterBuildingId(''); setFilterWingId('');
    setFilterPaymentMethod(''); setFilterDateFrom(''); setFilterDateTo('');
    setFilterAmountMin(''); setFilterAmountMax(''); setFilterAdminId('');
    setFilterPendingReason('');
    setDonationPagination(p => ({ ...p, page: 1 }));
  };

  const handleDeleteDonation = async () => {
    if (!deleteDonation) return;
    setIsDeletingDonation(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/admin/festivals/${deleteDonation.festivalId}/donations/${deleteDonation.id}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Donation deleted');
      setDeleteDonation(null);
      fetchDonations();
      fetchStats();
    } catch (err: any) { toast.error(err?.message || 'Failed to delete'); }
    finally { setIsDeletingDonation(false); }
  };

  const goToPage = (page: number) => {
    if (page < 1 || page > donationPagination.totalPages) return;
    setDonationPagination(p => ({ ...p, page }));
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const total = donationPagination.totalPages;
    const current = donationPagination.page;
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

  if (isLoadingFestival) {
    return <div className="w-full min-h-screen bg-muted/10 flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  }

  if (festivalError || !festival) {
    return (
      <div className="w-full min-h-screen bg-muted/10 flex flex-col items-center justify-center gap-4">
        <AlertTriangle className="w-10 h-10 text-destructive" />
        <p className="text-destructive font-semibold">{festivalError || 'Festival not found'}</p>
        <Link href="/admin/festivals" className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold">Back to Festivals</Link>
      </div>
    );
  }

  const StatusIcon = statusIcons[festival.status] || Clock;
  const hasActiveFilters = filterDonationStatus || filterBuildingId || filterWingId || filterPaymentMethod || filterDateFrom || filterDateTo || filterAmountMin || filterAmountMax || filterAdminId || filterPendingReason;

  return (
    <div className="w-full min-h-screen bg-muted/10 pb-20">
      {/* Header */}
      <div className="bg-secondary text-secondary-foreground py-8 px-4 border-b border-border shadow-sm">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-center gap-4">
            <Link href="/admin/festivals" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"><ArrowLeft className="w-5 h-5" /></Link>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-serif font-bold text-white">{festival.name}</h1>
                <span className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider", statusColors[festival.status] || statusColors.upcoming)}>
                  <StatusIcon className="w-3 h-3" />{festival.status}
                </span>
                <span className="text-white/60 font-mono text-lg font-bold">{festival.year}</span>
              </div>
              <p className="text-white/70 flex items-center gap-2 mt-1"><CalendarDays className="w-4 h-4" />{festival.startDate ? formatDate(festival.startDate) : 'N/A'} – {festival.endDate ? formatDate(festival.endDate) : 'N/A'}</p>
            </div>
            <Link href={`/admin/festivals/${festival.id}/edit`} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all shadow-lg">
              <Edit3 className="w-4 h-4" /> Edit
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 py-6">
        {/* Stats Cards with Pending Residents Summary */}
        {stats && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <StatsCard title="Total Collection" value={formatCurrency(stats.totalCollection)} icon={IndianRupee} color="text-emerald-600" />
              <StatsCard title="Residents Paid" value={String(stats.residentsPaid)} icon={Users} color="text-emerald-600" subtitle={`of ${stats.totalResidents || 0} total`} />
              <StatsCard title="Residents Pending" value={String(stats.residentsPending)} icon={Clock} color="text-amber-600" onClick={() => setShowPending(true)} subtitle="Click to view" />
              <StatsCard title="Expected Collection" value={formatCurrency(stats.expectedCollection)} icon={IndianRupee} color="text-blue-600" subtitle={`Avg: ${formatCurrency(stats.averageDonation)}`} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <StatsCard title="Pending Collection" value={formatCurrency(stats.pendingCollection)} icon={IndianRupee} color="text-amber-600" />
              <StatsCard title="Total Entries" value={String(stats.totalEntries)} icon={Receipt} color="text-primary" />
              <StatsCard title="Total Residents" value={String(stats.totalResidents || stats.residentsPaid + stats.residentsPending)} icon={Users} color="text-purple-600" />
            </div>
          </>
        )}

        {/* Action Buttons — always visible */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setShowAddDonation(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all shadow-lg"
          >
            <Plus className="w-4 h-4" /> Add Donation
          </button>
          <button
            onClick={() => setShowPending(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl font-semibold text-sm hover:bg-amber-600 transition-all shadow-lg"
          >
            <Clock className="w-4 h-4" /> View Pending Residents
          </button>
        </div>

        {/* Description */}
        {festival.description && (
          <div className="bg-card border border-border rounded-xl p-4 mb-6">
            <p className="text-sm text-muted-foreground">{festival.description}</p>
          </div>
        )}

        {/* Donation Management Section */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden mb-6">
          {/* Section Header */}
          <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-serif font-bold text-foreground">Donation Records</h2>
              <p className="text-xs text-muted-foreground">Manage festival donations</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn("flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all", showFilters || hasActiveFilters ? 'bg-primary/10 border-primary/30 text-primary' : 'border-border text-muted-foreground hover:bg-muted/50')}
              >
                <ListFilter className="w-3.5 h-3.5" /> Filters {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-primary" />}
              </button>
              <button
                onClick={() => { fetchDonations(); fetchStats(); }}
                disabled={isLoadingDonations}
                className="px-3 py-2 border border-border rounded-lg text-sm font-semibold hover:bg-muted/50 transition-all"
              >
                <RefreshCw className={cn("w-4 h-4", isLoadingDonations && "animate-spin")} />
              </button>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="p-4 border-b border-border bg-muted/10">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-semibold text-foreground mb-1"><Search className="w-3 h-3 inline mr-1" /> Search</label>
                <div className="flex gap-2">
                  <input type="text" value={donationSearchInput} onChange={e => setDonationSearchInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleDonationSearch()} placeholder="Name, Mobile, Flat, Receipt..." className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none" />
                  <button onClick={handleDonationSearch} className="px-3 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all"><Search className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="w-[130px]">
                <label className="block text-xs font-semibold text-foreground mb-1">Status</label>
                <select value={filterDonationStatus} onChange={e => { setFilterDonationStatus(e.target.value); setDonationPagination(p => ({ ...p, page: 1 })); }} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none">
                  <option value="">All</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              <div className="w-[140px]">
                <label className="block text-xs font-semibold text-foreground mb-1">Method</label>
                <select value={filterPaymentMethod} onChange={e => { setFilterPaymentMethod(e.target.value); setDonationPagination(p => ({ ...p, page: 1 })); }} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none">
                  <option value="">All</option>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              <div className="w-[150px]">
                <label className="block text-xs font-semibold text-foreground mb-1">Building</label>
                <select value={filterBuildingId} onChange={e => { setFilterBuildingId(e.target.value); setFilterWingId(''); setDonationPagination(p => ({ ...p, page: 1 })); }} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none">
                  <option value="">All</option>
                  {buildings.map(b => <option key={b.id} value={b.id}>{b.buildingName}</option>)}
                </select>
              </div>
            </div>

            {/* Extended Filters */}
            {showFilters && (
              <div className="mt-3 pt-3 border-t border-border">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="w-[130px]">
                    <label className="block text-xs font-semibold text-foreground mb-1">Wing</label>
                    <select value={filterWingId} onChange={e => { setFilterWingId(e.target.value); setDonationPagination(p => ({ ...p, page: 1 })); }} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none" disabled={!filterBuildingId}>
                      <option value="">All</option>
                      {filterWings.map(w => <option key={w.id} value={w.id}>{w.wingName}</option>)}
                    </select>
                  </div>
                  <div className="w-[140px]">
                    <label className="block text-xs font-semibold text-foreground mb-1">Admin</label>
                    <select value={filterAdminId} onChange={e => { setFilterAdminId(e.target.value); setDonationPagination(p => ({ ...p, page: 1 })); }} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none">
                      <option value="">All</option>
                      {admins.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                  <div className="w-[140px]">
                    <label className="block text-xs font-semibold text-foreground mb-1">Date From</label>
                    <input type="date" value={filterDateFrom} onChange={e => { setFilterDateFrom(e.target.value); setDonationPagination(p => ({ ...p, page: 1 })); }} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none" />
                  </div>
                  <div className="w-[140px]">
                    <label className="block text-xs font-semibold text-foreground mb-1">Date To</label>
                    <input type="date" value={filterDateTo} onChange={e => { setFilterDateTo(e.target.value); setDonationPagination(p => ({ ...p, page: 1 })); }} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none" />
                  </div>
                  <div className="w-[110px]">
                    <label className="block text-xs font-semibold text-foreground mb-1">Min Amount</label>
                    <input type="number" value={filterAmountMin} onChange={e => { setFilterAmountMin(e.target.value); setDonationPagination(p => ({ ...p, page: 1 })); }} min={0} placeholder="0" className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none" />
                  </div>
                  <div className="w-[110px]">
                    <label className="block text-xs font-semibold text-foreground mb-1">Max Amount</label>
                    <input type="number" value={filterAmountMax} onChange={e => { setFilterAmountMax(e.target.value); setDonationPagination(p => ({ ...p, page: 1 })); }} min={0} placeholder="99999" className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none" />
                  </div>
                  <button onClick={clearFilters} className="px-3 py-2 border border-border rounded-lg text-xs font-semibold hover:bg-muted/50 transition-all">
                    Clear Filters
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Donations Table */}
          {isLoadingDonations ? (
            <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
          ) : donations.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <IndianRupee className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
              <p className="font-semibold text-foreground">{hasActiveFilters ? 'No donations match your filters' : 'No donations recorded yet'}</p>
              <p className="text-sm mt-1">{hasActiveFilters ? 'Try adjusting your filters.' : 'Click "Add Donation" to record the first donation.'}</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground w-[50px]">#</th>
                      <th className="px-3 py-3 text-left"><SortHeader label="Status" field="status" currentSort={donationSortBy} currentOrder={donationSortOrder} onSort={handleDonationSort} /></th>
                      <th className="px-3 py-3 text-left"><SortHeader label="Resident" field="residentName" currentSort={donationSortBy} currentOrder={donationSortOrder} onSort={handleDonationSort} /></th>
                      <th className="px-3 py-3 text-left"><SortHeader label="Building" field="building" currentSort={donationSortBy} currentOrder={donationSortOrder} onSort={handleDonationSort} /></th>
                      <th className="px-3 py-3 text-left"><SortHeader label="Wing" field="wing" currentSort={donationSortBy} currentOrder={donationSortOrder} onSort={handleDonationSort} /></th>
                      <th className="px-3 py-3 text-left"><SortHeader label="Flat" field="flatNo" currentSort={donationSortBy} currentOrder={donationSortOrder} onSort={handleDonationSort} /></th>
                      <th className="px-3 py-3 text-left"><SortHeader label="Amount" field="amount" currentSort={donationSortBy} currentOrder={donationSortOrder} onSort={handleDonationSort} /></th>
                      <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Method</th>
                      <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Collected By</th>
                      <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Receipt</th>
                      <th className="px-3 py-3 text-left"><SortHeader label="Date" field="paymentDate" currentSort={donationSortBy} currentOrder={donationSortOrder} onSort={handleDonationSort} /></th>
                      <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground w-[120px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {donations.map((d, idx) => {
                      const PayIcon = paymentMethodIcons[d.paymentMethod || ''] || Banknote;
                      return (
                        <tr key={d.id} className={cn("border-b border-border/50 transition-colors hover:bg-muted/20", idx % 2 === 0 ? "bg-background" : "bg-muted/10")}>
                          <td className="px-3 py-3 text-xs text-muted-foreground font-mono">{(donationPagination.page - 1) * donationPagination.limit + idx + 1}</td>
                          <td className="px-3 py-3">
                            <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold", isPaid(d) ? 'text-emerald-700 bg-emerald-100' : 'text-amber-700 bg-amber-100')}>
                              {isPaid(d) ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                              {isPaid(d) ? 'Paid' : 'Pending'}
                            </span>
                          </td>
                          <td className="px-3 py-3"><span className="font-semibold text-foreground text-sm">{d.residentName}</span></td>
                          <td className="px-3 py-3 text-sm text-muted-foreground">{d.buildingName || '—'}</td>
                          <td className="px-3 py-3 text-sm text-muted-foreground">{d.wingName || '—'}</td>
                          <td className="px-3 py-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/20 text-amber-700 font-mono font-bold text-xs border border-amber-200">
                              <Home className="w-3 h-3" /> {d.flatNo}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            {isPaid(d) ? (
                              <span className="font-bold text-foreground">{formatCurrency(d.amount)}</span>
                            ) : (
                              <span className="text-amber-600 font-semibold">—</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            {isPaid(d) && d.paymentMethod ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/5 text-primary">
                                <PayIcon className="w-3 h-3" />{paymentMethodLabels[d.paymentMethod] || d.paymentMethod}
                              </span>
                            ) : <span className="text-muted-foreground text-sm">—</span>}
                          </td>
                          <td className="px-3 py-3 text-sm text-muted-foreground">{d.collectedByAdminName}</td>
                          <td className="px-3 py-3">
                            {d.receiptNumber ? (
                              <span className="font-mono text-[11px] font-semibold text-primary">{d.receiptNumber}</span>
                            ) : <span className="text-muted-foreground text-sm">—</span>}
                          </td>
                          <td className="px-3 py-3 text-sm text-muted-foreground whitespace-nowrap">{isPaid(d) ? formatDate(d.paymentDate) : '—'}</td>
                          <td className="px-3 py-3">
                            <div className="flex items-center justify-end gap-0.5">
                              <button onClick={() => setViewDonation(d)} className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors text-primary" title="View"><Eye className="w-3.5 h-3.5" /></button>
                              <button onClick={() => setEditDonation(d)} className="p-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-950/30 transition-colors text-amber-600" title="Edit"><Edit3 className="w-3.5 h-3.5" /></button>
                              <button onClick={() => setDeleteDonation(d)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-destructive" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                              {isPaid(d) && d.receiptNumber && (
                                <button
                                  onClick={() => {
                                    const msg = buildWhatsAppReceipt(d, festival.name);
                                    openWhatsApp(d.residentMobile, msg);
                                  }}
                                  className="p-1.5 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-950/30 transition-colors text-emerald-600"
                                  title="Send WhatsApp Receipt"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
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

              {/* Pagination */}
              {donationPagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
                  <span className="text-xs text-muted-foreground">Showing {(donationPagination.page - 1) * donationPagination.limit + 1}–{Math.min(donationPagination.page * donationPagination.limit, donationPagination.total)} of {donationPagination.total}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => goToPage(donationPagination.page - 1)} disabled={donationPagination.page <= 1} className="p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                    {getPageNumbers().map((p, i) =>
                      typeof p === 'string' ? <span key={`e-${i}`} className="px-2 text-xs text-muted-foreground">...</span>
                        : <button key={p} onClick={() => goToPage(p)} className={cn("min-w-[30px] h-7 rounded-lg text-xs font-semibold transition-all", p === donationPagination.page ? "bg-primary text-white shadow-sm" : "hover:bg-muted text-foreground")}>{p}</button>
                    )}
                    <button onClick={() => goToPage(donationPagination.page + 1)} disabled={donationPagination.page >= donationPagination.totalPages} className="p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAddDonation && (
        <AddDonationModal festivalId={festival.id} festivalName={festival.name} onClose={() => setShowAddDonation(false)} onSaved={() => { fetchDonations(); fetchStats(); }} />
      )}
      {viewDonation && <ViewDonationModal donation={viewDonation} festivalName={festival.name} onClose={() => setViewDonation(null)} />}
      {editDonation && (
        <EditDonationModal donation={editDonation} festivalName={festival.name} onClose={() => setEditDonation(null)} onSaved={() => { fetchDonations(); fetchStats(); }} />
      )}
      {deleteDonation && (
        <DeleteDonationDialog donation={deleteDonation} onConfirm={handleDeleteDonation} onCancel={() => setDeleteDonation(null)} isLoading={isDeletingDonation} />
      )}
      {showPending && (
        <PendingResidentsModal festivalId={festival.id} onClose={() => setShowPending(false)} />
      )}
    </div>
  );
}

