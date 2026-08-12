import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'wouter';
import { ArrowLeft, MapPin, CalendarDays, IndianRupee, Users, Search, Plus, Eye, Edit3, Trash2, Building2, Home, Phone, User, X, CheckCircle, XCircle, Clock, Filter, RefreshCw, AlertTriangle, Wallet, Banknote, CreditCard, Receipt, ChevronLeft, ChevronRight, Check, Send, ChevronDown, MessageSquare, ListFilter, Save, TrendingUp, Globe, Trophy, ArrowDown, Shirt } from 'lucide-react';
import { motion } from 'framer-motion';
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
  totalCollection: number; residentCollection: number; outsiderCollection: number;
  outsiderDonations: number;
  expectedCollection: number;
  pendingCollection: number; totalEntries: number;
  totalResidents: number; residentsPaid: number;
  residentsPending: number; averageDonation: number;
  paymentMethodDistribution: { method: string; total: number; count: number }[];
  collectionByDay: { date: string; total: number; count: number }[];
}

interface CollectionSummary {
  date: string;
  totalCollection: number;
  totalDonations: number;
  paidCount: number;
  pendingCount: number;
  averageDonation: number;
  paymentMethods: { method: string; amount: number; count: number }[];
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
  upcoming: 'text-amber-600 bg-amber-100/40',
  active: 'text-amber-500 bg-amber-100/30',
  completed: 'text-white/70 bg-white/[0.03]',
};

const statusIcons: Record<string, any> = { upcoming: Clock, active: CheckCircle, completed: XCircle };

const paymentMethodLabels: Record<string, string> = {
  cash: 'Cash', upi: 'UPI', bank_transfer: 'Bank Transfer', cheque: 'Cheque',
};

const paymentMethodIcons: Record<string, any> = { cash: Banknote, upi: CreditCard, bank_transfer: Wallet, cheque: Receipt };

// Config for the date-wise payment method summary (amber-centric colors only)
const collectionMethodConfig: Record<string, { label: string; icon: any; color: string; bar: string }> = {
  cash: { label: 'Cash', icon: Banknote, color: 'text-amber-400', bar: 'from-amber-500 to-amber-400' },
  upi: { label: 'UPI', icon: CreditCard, color: 'text-amber-400', bar: 'from-amber-500 to-amber-400' },
  bank: { label: 'Bank Transfer', icon: Wallet, color: 'text-amber-400', bar: 'from-amber-500 to-amber-400' },
  cheque: { label: 'Cheque', icon: Receipt, color: 'text-amber-400', bar: 'from-amber-500 to-amber-400' },
  pending: { label: 'Pending', icon: Clock, color: 'text-white/70', bar: 'from-white/40 to-white/10' },
};

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
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); if (selectedResident) handleClear(); }}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results.length > 0) setIsOpen(true); }}
          placeholder="Type name, mobile, building, wing, or flat..."
          className="w-full pl-10 pr-10 py-2.5 text-sm rounded-lg border border-white/10 bg-white/[0.05] text-white placeholder:text-white/35 backdrop-blur-xl focus:ring-2 focus:ring-amber-300/10 outline-none"
        />
        {isSearching && <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />}
        {!isSearching && selectedResident && (
          <button type="button" onClick={handleClear} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-destructive">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

        {isOpen && results.length > 0 && !selectedResident && (
        <div className="absolute z-50 mt-1 w-full rounded-xl bg-white/[0.03] border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.6)] max-h-80 overflow-y-auto backdrop-blur-2xl">
          {results.map((r, idx) => (
            <button
              key={r.id}
              type="button"
              onClick={() => handleSelect(r)}
              className={cn(
                "w-full px-3 py-3 text-left transition-colors border-b border-white/6 last:border-0",
                idx === selectedIdx ? "bg-white/[0.04]" : "hover:bg-white/[0.025]"
              )}
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-amber-300/10 flex items-center justify-center shrink-0 mt-0.5 border border-amber-300/10">
                  <User className="w-4 h-4 text-amber-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-white text-sm block truncate">{r.fullName}</span>
                  <span className="text-xs text-white/60 block">
                    <Building2 className="w-3 h-3 inline mr-0.5 text-amber-300" />
                    {r.buildingName}{r.wingName ? ` - ${r.wingName}` : ''} - {r.flatNo}
                  </span>
                  <span className="text-xs text-white/60">
                    <Phone className="w-3 h-3 inline mr-0.5 text-amber-300" />{r.mobile}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-white/60 shrink-0 mt-1" />
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && results.length === 0 && query.length >= 2 && !isSearching && (
        <div className="absolute z-50 mt-1 w-full rounded-xl bg-white/[0.03] border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.6)] p-4 text-center text-sm text-white/60">
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

      {festivalHistory.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/8">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Previous Festival Donations</p>
          <div className="space-y-1.5">
            {festivalHistory.map((h, hi) => (
              <div key={hi} className="flex items-center justify-between text-sm">
                <span className="text-foreground">
                  {h.festivalName} {h.year}
                </span>
                    <span className={cn(
                      "font-semibold",
                      h.status === 'paid' ? 'text-white' : 'text-amber-600'
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
      clearForm();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save donation');
    } finally { setIsSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto" onClick={onClose}>
      <div className="bg-white/[0.045] border border-white/10 backdrop-blur-2xl rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] max-w-lg w-full my-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-white/8">
          <h2 className="text-lg font-serif font-bold text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-amber-300" /> Add Donation
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/[0.04] transition-colors text-white/70">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <div className="p-3 rounded-xl flex items-center gap-3 bg-white/[0.03] border border-white/8">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Collecting for</p>
              <p className="font-bold text-foreground text-sm">{festivalName}</p>
            </div>
          </div>

          <div className="space-y-3">
            <ResidentSearchDropdown
              selectedResident={selectedResident}
              onSelect={handleResidentSelect}
              onClear={() => { setSelectedResident(null); setFestivalHistory([]); setErrors(prev => { const { resident, ...rest } = prev; return rest; }); }}
            />
            {errors.resident && <p className="text-xs text-destructive">{errors.resident}</p>}
            {selectedResident && (
              <SelectedResidentCard resident={selectedResident} festivalHistory={festivalHistory} />
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Donation Status <span className="text-destructive">*</span></label>
            <div className="relative">
              <select
                value={donationStatus}
                onChange={e => {
                  setDonationStatus(e.target.value as 'paid' | 'pending');
                  if (e.target.value === 'pending') { setAmount(''); setPaymentMethod('cash'); }
                  setErrors(prev => { const { amount, paymentMethod, ...rest } = prev; return rest; });
                }}
                className={cn(
                  "w-full px-4 py-2.5 text-sm rounded-xl border border-white/10 bg-white/[0.05] text-white placeholder:text-white/35 backdrop-blur-xl focus:ring-2 focus:ring-amber-300/10 outline-none appearance-none cursor-pointer transition-all",
                  donationStatus === 'paid' ? 'font-semibold' : 'font-semibold'
                )}
              >
                <option value="pending" className="text-amber-400 bg-transparent">⏳ Pending</option>
                <option value="paid" className="text-white bg-transparent">✅ Paid</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-white/60" />
            </div>
          </div>

          {donationStatus === 'paid' && (
            <div className="p-4 bg-white/[0.03] border border-white/8 rounded-xl space-y-4">
              <p className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-amber-300" /> Payment Details
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Amount (₹) <span className="text-destructive">*</span></label>
                      <div className="relative">
                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60 pointer-events-none" />
                        <input
                          type="number"
                          value={amount}
                          onChange={e => { setAmount(e.target.value); setErrors(prev => { const { amount, ...rest } = prev; return rest; }); }}
                          min={1} step={0.01}
                          placeholder="0.00"
                          className={cn("w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-white/10 bg-white/[0.05] text-white placeholder:text-white/35 backdrop-blur-xl focus:ring-2 focus:ring-amber-300/10 outline-none", errors.amount ? 'border-rose-400' : '')}
                        />
                      </div>
                  {errors.amount && <p className="text-xs text-destructive mt-1">{errors.amount}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Payment Method <span className="text-destructive">*</span></label>
                  <select value={paymentMethod} onChange={e => { setPaymentMethod(e.target.value); setErrors(prev => { const { paymentMethod, ...rest } = prev; return rest; }); }} className={cn("w-full px-3 py-2.5 text-sm rounded-lg border border-white/10 bg-white/[0.05] text-white placeholder:text-white/35 backdrop-blur-xl focus:ring-2 focus:ring-amber-300/10 outline-none", errors.paymentMethod ? 'border-rose-400' : '')}>
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
                <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="w-full px-3 py-2.5 text-sm rounded-lg border border-white/10 bg-white/[0.05] text-white placeholder:text-white/35 backdrop-blur-xl focus:ring-2 focus:ring-amber-300/10 outline-none" />
              </div>
            </div>
          )}

          {donationStatus === 'pending' && (
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Payment Method</label>
              <select disabled value="pending" className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-muted/50 text-muted-foreground outline-none cursor-not-allowed">
                <option value="pending">⏳ Will be collected later</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">Set status to Paid to enable payment method selection</p>
            </div>
          )}

          {donationStatus === 'pending' && (
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Pending Reason</label>
              <select value={pendingReason} onChange={e => { setPendingReason(e.target.value); setPendingCustomReason(''); }} className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none">
                <option value="">Select a reason...</option>
                {PENDING_REASONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              {pendingReason === 'Other' && (
                <div className="mt-2">
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Custom Reason</label>
                  <input type="text" value={pendingCustomReason} onChange={e => setPendingCustomReason(e.target.value)} placeholder="Enter custom reason..." className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none" autoFocus />
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Notes <span className="text-muted-foreground">(optional)</span></label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder={donationStatus === 'pending' ? 'e.g. Will pay next week, Paid through committee member...' : 'e.g. Paid via UPI, Receipt requested later...'} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none resize-none" />
          </div>

          <div className="flex gap-3 pt-2 border-t border-border">
            <button type="submit" disabled={isSaving || !selectedResident} className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg">
              {isSaving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
              {donationStatus === 'paid' ? 'Save Donation' : 'Mark as Pending'}
            </button>
            <button type="button" onClick={onClose} className="px-5 py-2.5 border border-border rounded-xl text-sm font-semibold hover:bg-muted/50 transition-all">Cancel</button>
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
        body.pendingReason = null;
      } else {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white/[0.045] border border-white/10 backdrop-blur-2xl rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-white/8">
          <h2 className="text-lg font-serif font-bold text-white flex items-center gap-2"><Edit3 className="w-5 h-5 text-amber-300" /> Edit Donation</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/[0.04] transition-colors text-white/70"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/8">
            <p className="text-xs text-white/70 mb-1">Resident</p>
            <p className="font-semibold text-white">{donation.residentName}</p>
            <p className="text-xs text-white/60">{donation.buildingName}{donation.wingName ? ` - ${donation.wingName}` : ''}, Flat {donation.flatNo}</p>
            {donation.receiptNumber && <p className="text-xs text-amber-300 mt-1">Receipt: {donation.receiptNumber}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Payment Method <span className="text-destructive">*</span></label>
            <select value={isPaidStatus ? paymentMethod : 'pending'} onChange={e => { const val = e.target.value; if (val === 'pending') { setIsPaidStatus(false); setPaymentMethod('pending'); } else { setIsPaidStatus(true); setPaymentMethod(val); } }} className="w-full px-3 py-2.5 text-sm rounded-lg border border-white/10 bg-white/[0.05] text-white placeholder:text-white/35 backdrop-blur-xl focus:ring-2 focus:ring-amber-300/10 outline-none">
              <option value="pending">Pending</option>
              <option value="cash">Cash</option><option value="upi">UPI</option><option value="bank_transfer">Bank Transfer</option><option value="cheque">Cheque</option>
            </select>
          </div>

          {isPaidStatus && (
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-semibold text-foreground mb-1.5">Amount (₹) <span className="text-destructive">*</span></label><input type="number" value={amount} onChange={e => setAmount(e.target.value)} min={1} step={0.01} className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none" /></div>
              <div><label className="block text-xs font-semibold text-foreground mb-1.5">Payment Date</label><input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none" /></div>
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
              {donation.pendingReason && !PENDING_REASONS.some(r => r.value === donation.pendingReason) && !pendingReason && (
                <p className="text-xs text-muted-foreground mt-1">Previous reason: "{donation.pendingReason}"</p>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={isSaving} className="flex-1 py-2.5 bg-white text-black rounded-full text-sm font-semibold hover:scale-[0.995] transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-[0_0_35px_rgba(255,255,255,0.12)]">
              {isSaving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Edit3 className="w-4 h-4 text-amber-600" />}
              Update Donation
            </button>
            <button type="button" onClick={onClose} className="px-5 py-2.5 border border-white/10 rounded-full text-sm font-semibold hover:bg-white/[0.03] transition-all text-white">Cancel</button>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onCancel}>
      <div className="bg-white/[0.045] border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <div className="p-6 text-center text-white">
          <div className="w-14 h-14 rounded-full bg-white/[0.03] flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-amber-300" />
          </div>
          <h3 className="text-lg font-bold mb-2">Delete Donation?</h3>
          <p className="text-sm text-white/70 mb-1">{isPaid(donation) ? `Remove ${formatCurrency(donation.amount)} donation` : 'Remove pending donation'} from</p>
          <p className="text-sm font-bold">{donation.residentName}?</p>
          <p className="text-xs text-white/60 mt-2">This action cannot be undone.</p>
        </div>
        <div className="flex gap-3 p-4 pt-0">
          <button onClick={onCancel} disabled={isLoading} className="flex-1 py-2.5 border border-white/10 rounded-full text-sm font-semibold hover:bg-white/[0.03] transition-all text-white">Cancel</button>
          <button onClick={onConfirm} disabled={isLoading} className="flex-1 py-2.5 bg-amber-600 text-white rounded-full text-sm font-semibold hover:bg-amber-700 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white/[0.045] border border-white/10 rounded-2xl backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-white/8">
          <h2 className="text-lg font-serif font-bold text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-amber-300" /> Donation Details
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/[0.04] transition-colors text-white/70">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4 text-white">
          <div className="grid grid-cols-[130px_1fr] gap-y-3 text-sm">
            <span className="text-muted-foreground font-medium">Status</span>
            <span>
              <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold", isPaid(donation) ? 'text-white bg-white/[0.04]' : 'text-amber-700 bg-amber-100/30')}>
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

          {isPaid(donation) && donation.receiptNumber && (
            <button
              type="button"
              onClick={handleWhatsApp}
              className="w-full py-2.5 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 transition-all flex items-center justify-center gap-2"
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
    <div className={cn("rounded-2xl p-4 bg-white/[0.045] border border-white/10 backdrop-blur-2xl shadow-[0_12px_40px_rgba(252,211,77,0.06)]", onClick && "cursor-pointer hover:border-amber-300/20 transition-all")} onClick={onClick}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-white/70">{title}</p>
          <p className={cn("text-2xl font-bold mt-1 text-white", color)}>{value}</p>
          {subtitle && <p className="text-xs text-white/60 mt-0.5">{subtitle}</p>}
        </div>
        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-300/10 border border-amber-300/20">
          <Icon className={cn("w-5 h-5 text-amber-300", color)} />
        </div>
      </div>
    </div>
  );
}

// ── Payment Summary Card ─────────────────────────────────────────────────────

function PaymentSummaryCard({ stats }: { stats: Stats }) {
  const [expanded, setExpanded] = useState(false);

  const methods = [
    { key: 'cash', emoji: '💵', label: 'Cash', icon: Banknote, color: 'text-amber-400', bar: 'from-amber-500 to-amber-400' },
    { key: 'upi', emoji: '📱', label: 'UPI', icon: CreditCard, color: 'text-amber-400', bar: 'from-amber-500 to-amber-400' },
    { key: 'bank_transfer', emoji: '🏦', label: 'Bank Transfer', icon: Wallet, color: 'text-amber-400', bar: 'from-amber-500 to-amber-400' },
    { key: 'cheque', emoji: '📄', label: 'Cheque', icon: Receipt, color: 'text-amber-400', bar: 'from-amber-500 to-amber-400' },
  ];

  const dist = stats.paymentMethodDistribution || [];
  const byMethod = new Map<string, { total: number; count: number }>();
  dist.forEach(d => {
    byMethod.set(d.method, { total: d.total || 0, count: d.count || 0 });
  });

  const totalCollection = stats.totalCollection || 0;
  const totalTransactions = dist.reduce((sum, d) => sum + (d.count || 0), 0);

  return (
    <div
      className="rounded-2xl p-4 bg-white/[0.045] border border-white/10 backdrop-blur-2xl shadow-[0_12px_40px_rgba(252,211,77,0.06)] cursor-pointer hover:border-amber-300/20 transition-all"
      onClick={() => setExpanded(e => !e)}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs font-medium text-white/70 flex items-center gap-1">
            <CreditCard className="w-3.5 h-3.5 text-amber-300" /> Payment Summary
          </p>
          <p className="text-2xl font-bold mt-1 text-white">{formatCurrency(totalCollection)}</p>
          <p className="text-xs text-white/60 mt-0.5">Overall Collection</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-300/10 border border-amber-300/20">
            <Wallet className="w-5 h-5 text-amber-300" />
          </div>
          <span className="text-white/60"><ChevronDown className={cn("w-4 h-4 transition-transform duration-300", expanded && "rotate-180")} /></span>
        </div>
      </div>

      {!expanded && (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <ChevronDown className="w-3 h-3" /> Click to view breakdown
        </p>
      )}

      <div className={cn("grid transition-all duration-300 ease-in-out", expanded ? "grid-rows-[1fr] opacity-100 mt-3" : "grid-rows-[0fr] opacity-0")}>
        <div className="overflow-hidden">
          <div className="space-y-3 pt-2 border-t border-border">
            {methods.map(m => {
              const data = byMethod.get(m.key);
              const amount = data?.total || 0;
              const count = data?.count || 0;
              const Icon = m.icon;
              const pct = totalCollection > 0 ? Math.round((amount / totalCollection) * 100) : 0;
              return (
                <div key={m.key} className="flex items-center gap-3">
                  <Icon className={cn("w-4 h-4 shrink-0", m.color)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-foreground truncate">{m.label}</span>
                      <span className="text-xs font-bold text-foreground flex items-center gap-2">
                        {formatCurrency(amount)}
                        <span className="text-[10px] font-semibold text-muted-foreground">{pct}%</span>
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-500", m.bar)}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{count} {count === 1 ? 'donation' : 'donations'}</p>
                  </div>
                </div>
              );
            })}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-semibold text-muted-foreground">Total Transactions</span>
              <span className="text-sm font-bold text-foreground">{totalTransactions}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Outsider Collection Card ─────────────────────────────────────────────────

interface OutsiderAnalytics {
  totalCollection: number;
  totalDonations: number;
  averageDonation: number;
  highestDonation: number;
  lowestDonation: number;
  recentDonations: { name: string; amount: number }[];
}

function OutsiderCollectionCard({ festivalId, stats }: {
  festivalId: number;
  stats: Stats | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const [data, setData] = useState<OutsiderAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetch(`${getApiUrl()}/api/admin/outsider-donations/analytics?festivalId=${festivalId}`, { headers: authHeaders() })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (mounted) setData(d); })
      .catch(() => { if (mounted) setData(null); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [festivalId]);

  // Use per-festival collection from stats (single source of truth) for the headline
  const totalCollection = stats?.outsiderCollection ?? data?.totalCollection ?? 0;
  const outsiderDonations = stats?.outsiderDonations ?? data?.totalDonations ?? 0;
  const recent = data?.recentDonations || [];

  return (
    <div
      className="bg-card border border-border rounded-xl p-4 shadow-sm cursor-pointer hover:border-primary/50 transition-all"
      onClick={() => setExpanded(e => !e)}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
<p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            🌍 Outsider Collection
          </p>
          <p className="text-2xl font-bold mt-1 text-white">{loading ? '—' : formatCurrency(totalCollection)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Outsider Collection for this Festival</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-muted">
            <Globe className="w-5 h-5 text-amber-300" />
          </div>
          <span className="text-muted-foreground"><ChevronDown className={cn("w-4 h-4 transition-transform duration-300", expanded && "rotate-180")} /></span>
        </div>
      </div>

      {!expanded && (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          👆 Click to view details
        </p>
      )}

      <div className={cn("grid transition-all duration-300 ease-in-out", expanded ? "grid-rows-[1fr] opacity-100 mt-3" : "grid-rows-[0fr] opacity-0")}>
        <div className="overflow-hidden">
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/10">
                  <p className="text-[10px] font-semibold text-white/70 uppercase tracking-wider flex items-center gap-1"><IndianRupee className="w-3 h-3 text-amber-300" /> Total Collection</p>
                    <p className="text-base font-bold text-white mt-0.5">{formatCurrency(data?.totalCollection ?? 0)}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/10">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Receipt className="w-3 h-3" /> Total Donations</p>
                <p className="text-base font-bold text-foreground mt-0.5">{data?.totalDonations ?? 0}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/10">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Average Donation</p>
                <p className="text-base font-bold text-white mt-0.5">{formatCurrency(data?.averageDonation ?? 0)}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/10">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Trophy className="w-3 h-3" /> Highest Donation</p>
                <p className="text-base font-bold text-amber-600 mt-0.5">{formatCurrency(data?.highestDonation ?? 0)}</p>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/10">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><ArrowDown className="w-3 h-3" /> Lowest Donation</p>
              <p className="text-base font-bold text-foreground mt-0.5">{formatCurrency(data?.lowestDonation ?? 0)}</p>
            </div>

            {recent.length > 0 && (
              <div className="pt-1">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Recent Donations</p>
                <div className="space-y-1.5">
                  {recent.map((r, ri) => (
                    <div key={ri} className="flex items-center justify-between text-sm">
                      <span className="text-foreground truncate">• {r.name}</span>
                      <span className="font-semibold text-foreground">{formatCurrency(r.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {recent.length === 0 && !loading && (
              <p className="text-xs text-muted-foreground">No outsider donations yet.</p>
            )}
          </div>
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

// ── Main Component ──────────────────────────────────────────────────────────

export default function AdminFestivalDetail() {
  const params = useParams();
  const festivalId = (params as any)?.id ? parseInt((params as any).id, 10) : null;

  const [festival, setFestival] = useState<Festival | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoadingFestival, setIsLoadingFestival] = useState(true);
  const [festivalError, setFestivalError] = useState<string | null>(null);

  const [donations, setDonations] = useState<Donation[]>([]);
  const [donationPagination, setDonationPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [isLoadingDonations, setIsLoadingDonations] = useState(true);
  const [donationSearch, setDonationSearch] = useState('');
  const [donationSearchInput, setDonationSearchInput] = useState('');
  const [donationSortBy, setDonationSortBy] = useState('createdAt');
  const [donationSortOrder, setDonationSortOrder] = useState('desc');

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

  const [buildings, setBuildings] = useState<Building[]>([]);
  const [filterWings, setFilterWings] = useState<Wing[]>([]);
  const [admins, setAdmins] = useState<{ id: string; name: string }[]>([]);

// Collection summary (date-wise analytics)
  const [collectionDate, setCollectionDate] = useState(new Date().toISOString().split('T')[0]);
  const [collectionSummary, setCollectionSummary] = useState<CollectionSummary | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [showAddDonation, setShowAddDonation] = useState(false);
  const [showPending, setShowPending] = useState(false);
  const [viewDonation, setViewDonation] = useState<Donation | null>(null);
  const [editDonation, setEditDonation] = useState<Donation | null>(null);
  const [deleteDonation, setDeleteDonation] = useState<Donation | null>(null);
  const [isDeletingDonation, setIsDeletingDonation] = useState(false);

  useEffect(() => {
    fetch(`${getApiUrl()}/api/admin/buildings/manage`, { headers: authHeaders() })
      .then(r => r.json())
      .then((data: Building[]) => setBuildings(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!filterBuildingId) { setFilterWings([]); return; }
    fetch(`${getApiUrl()}/api/admin/buildings/${filterBuildingId}/wings/manage`, { headers: authHeaders() })
      .then(r => r.json())
      .then((data: Wing[]) => setFilterWings(data))
      .catch(() => setFilterWings([]));
  }, [filterBuildingId]);

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

const fetchStats = useCallback(async () => {
    if (!festivalId) return;
    try {
      const res = await fetch(`${getApiUrl()}/api/admin/festivals/${festivalId}/stats`, { headers: authHeaders() });
      if (res.ok) setStats(await res.json());
    } catch { /* silent */ }
  }, [festivalId]);

  // Fetch date-wise collection summary
  const fetchCollectionSummary = useCallback(async (date: string) => {
    if (!festivalId) return;
    setIsLoadingSummary(true);
    setSummaryError(null);
    try {
      const res = await fetch(`${getApiUrl()}/api/admin/festivals/${festivalId}/collection-summary?date=${encodeURIComponent(date)}`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch collection summary');
      const data = await res.json();
      setCollectionSummary(data);
    } catch (err: any) {
      setSummaryError(err?.message || 'Failed to load collection summary');
      setCollectionSummary(null);
    } finally { setIsLoadingSummary(false); }
  }, [festivalId]);

  const fetchDonations = useCallback(async (pageNum?: number) => {
    if (!festivalId) return;
    setIsLoadingDonations(true);
    try {
      const sp = new URLSearchParams();
      sp.set('page', String(pageNum ?? donationPagination.page));
      sp.set('limit', '20');
      if (donationSearch) sp.set('search', donationSearch);
      sp.set('sortBy', donationSortBy);
      sp.set('sortOrder', donationSortOrder);
      if (filterDonationStatus) sp.set('donationStatus', filterDonationStatus);
      if (filterBuildingId) sp.set('buildingId', filterBuildingId);
      if (filterWingId) sp.set('wingId', filterWingId);
      if (filterPaymentMethod) sp.set('paymentMethod', filterPaymentMethod);
      if (filterPendingReason) sp.set('pendingReason', filterPendingReason);
      if (filterDateFrom) sp.set('dateFrom', filterDateFrom);
      if (filterDateTo) sp.set('dateTo', filterDateTo);
      if (filterAmountMin) sp.set('amountMin', filterAmountMin);
      if (filterAmountMax) sp.set('amountMax', filterAmountMax);
      if (filterAdminId) sp.set('adminId', filterAdminId);

      const res = await fetch(`${getApiUrl()}/api/admin/festivals/${festivalId}/donations?${sp.toString()}`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setDonations(data.donations);
      setDonationPagination(data.pagination);
    } catch { /* silent */ }
    finally { setIsLoadingDonations(false); }
  }, [festivalId, donationPagination.page, donationSearch, donationSortBy, donationSortOrder, filterDonationStatus, filterBuildingId, filterWingId, filterPaymentMethod, filterPendingReason, filterDateFrom, filterDateTo, filterAmountMin, filterAmountMax, filterAdminId]);

  useEffect(() => { if (festivalId) { fetchFestival(); fetchStats(); } }, [festivalId, fetchFestival, fetchStats]);
  useEffect(() => { fetchDonations(); }, [fetchDonations]);

  // Fetch date-wise collection summary whenever festival or selected date changes
  useEffect(() => {
    if (festivalId && collectionDate) { fetchCollectionSummary(collectionDate); }
  }, [festivalId, collectionDate, fetchCollectionSummary]);

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
      fetchCollectionSummary(collectionDate);
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
    <div className="relative min-h-screen bg-[#080808] overflow-hidden pb-20">
      {/* Cinematic overlays */}
      <div className="absolute inset-0 z-0 bg-black/45" />
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,170,70,0.12),transparent_40%)]" />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/30 via-transparent to-black/90" />

      <motion.div
        className="absolute z-0 left-1/2 top-[18%] h-[380px] w-[380px] -translate-x-1/2 rounded-full bg-amber-400/10 blur-[120px]"
        animate={{ scale: [1, 1.12, 1], opacity: [0.35, 0.55, 0.35] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="container relative z-10 mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-center gap-4">
          <Link href="/admin/festivals" className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors rounded-full bg-white/[0.04] border border-white/10 px-3 py-2 backdrop-blur-xl">
            <ArrowLeft className="w-5 h-5 text-amber-300" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-serif font-semibold tracking-[-0.03em] text-white">{festival.name}</h1>
              <span className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold tracking-wider bg-white/[0.04] border border-white/10 text-white/80", statusColors[festival.status] || '')}>
                <StatusIcon className="w-4 h-4 text-amber-300" /> {festival.status}
              </span>
              <span className="text-white/60 font-mono text-lg font-semibold">{festival.year}</span>
            </div>
            <p className="text-white/70 flex items-center gap-2 mt-1"><CalendarDays className="w-4 h-4 text-amber-300" />{festival.startDate ? formatDate(festival.startDate) : 'N/A'} – {festival.endDate ? formatDate(festival.endDate) : 'N/A'}</p>
          </div>
          {/* <Link href={`/admin/festivals/${festival.id}/edit`} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-semibold text-black shadow-[0_0_35px_rgba(255,255,255,0.12)]">
            <Edit3 className="w-4 h-4" /> Edit
          </Link> */}
        </div>
        {festival.description && <p className="mt-4 text-white/65 max-w-3xl">{festival.description}</p>}
      </div>

      <div className="container relative z-10 mx-auto max-w-6xl px-4 py-6">
        {stats && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <StatsCard title="Total Collection" value={formatCurrency(stats.totalCollection)} icon={IndianRupee} color="text-white" />
<StatsCard title="Residents Paid" value={String(stats.residentsPaid)} icon={Users} color="text-white" subtitle={`of ${stats.totalResidents || 0} total`} />
<PaymentSummaryCard stats={stats} />
              <OutsiderCollectionCard festivalId={festival.id} stats={stats} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <StatsCard title="Pending Collection" value={formatCurrency(stats.pendingCollection)} icon={IndianRupee} color="text-amber-600" />
              <StatsCard title="Total Entries" value={String(stats.totalEntries)} icon={Receipt} color="text-primary" />
              <StatsCard title="Total Residents" value={String(stats.totalResidents || stats.residentsPaid + stats.residentsPending)} icon={Users} color="text-white" />
            </div>
          </>
        )}

        {/* ── Date-wise Collection Analytics ─────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Collection by Date */}
          <div className="glass-card-glow rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-300 via-orange-300 to-amber-500 opacity-70" />
            <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" />
                <h3 className="font-serif font-bold text-foreground">Collection by Date</h3>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={collectionDate}
                  onChange={e => setCollectionDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="px-3 py-1.5 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none"
                />
                <button onClick={() => fetchCollectionSummary(collectionDate)} disabled={isLoadingSummary} className="p-2 border border-border rounded-lg hover:bg-muted/50 transition-all" title="Refresh">
                  <RefreshCw className={cn("w-3.5 h-3.5", isLoadingSummary && "animate-spin")} />
                </button>
              </div>
            </div>

            {isLoadingSummary ? (
              <div className="flex items-center justify-center py-10"><div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
            ) : summaryError ? (
              <div className="text-center py-10 text-destructive text-sm">{summaryError}</div>
            ) : !collectionSummary ? (
              <div className="text-center py-10 text-muted-foreground">No collections found for this date.</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><IndianRupee className="w-3 h-3" /> Total Collection</p>
                  <p className="text-lg font-bold text-white mt-1">{formatCurrency(collectionSummary.totalCollection)}</p>
                </div>
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Receipt className="w-3 h-3" /> Total Donations</p>
                  <p className="text-lg font-bold text-foreground mt-1">{collectionSummary.totalDonations}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/8">
                  <p className="text-[11px] font-semibold text-white uppercase tracking-wider flex items-center gap-1"><CheckCircle className="w-3 h-3 text-amber-300" /> Paid</p>
                  <p className="text-lg font-bold text-white mt-1">{collectionSummary.paidCount}</p>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30">
                  <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</p>
                  <p className="text-lg font-bold text-amber-600 mt-1">{collectionSummary.pendingCount}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/8 md:col-span-1 col-span-2">
                  <p className="text-[11px] font-semibold text-white/70 uppercase tracking-wider flex items-center gap-1"><TrendingUp className="w-3 h-3 text-amber-300" /> Average</p>
                  <p className="text-lg font-bold text-white mt-1">{formatCurrency(collectionSummary.averageDonation)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Payment Method Summary */}
          <div className="glass-card-glow rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 opacity-70" />
            <div className="flex items-center gap-2 mb-4">
              <Wallet className="w-4 h-4 text-accent" />
              <h3 className="font-serif font-bold text-foreground">Payment Method Summary</h3>
            </div>

            {isLoadingSummary ? (
              <div className="flex items-center justify-center py-10"><div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
            ) : summaryError ? (
              <div className="text-center py-10 text-destructive text-sm">{summaryError}</div>
            ) : !collectionSummary || collectionSummary.paymentMethods.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">No collections found for this date.</div>
            ) : (
              <div className="space-y-3">
                {collectionSummary.paymentMethods.map(m => {
                  const cfg = collectionMethodConfig[m.method] || { label: m.method, icon: Wallet, color: 'text-foreground', bar: 'from-slate-500 to-slate-400' };
                  const Icon = cfg.icon;
                  const pct = collectionSummary.totalCollection > 0 ? Math.round((m.amount / collectionSummary.totalCollection) * 100) : 0;
                  return (
                    <div key={m.method} className="p-3 rounded-xl bg-card/60 dark:bg-card/40 border border-border/60">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="flex items-center gap-2 text-sm font-semibold text-foreground"><Icon className={cn("w-4 h-4", cfg.color)} />{cfg.label}</span>
                        <span className="text-sm font-bold text-foreground">{formatCurrency(m.amount)}</span>
                      </div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">{m.count} {m.count === 1 ? 'entry' : 'entries'}</span>
                        <span className="text-xs font-semibold text-muted-foreground">{pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className={cn("h-full rounded-full bg-gradient-to-r transition-all", cfg.bar)} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

<div className="flex gap-2 mb-6 flex-wrap">
          <button onClick={() => setShowAddDonation(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all shadow-lg">
            <Plus className="w-4 h-4" /> Add Donation
          </button>
          <button onClick={() => setShowPending(true)} className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl font-semibold text-sm hover:bg-amber-600 transition-all shadow-lg">
            <Clock className="w-4 h-4" /> View Pending Residents
          </button>
          <Link href={`/admin/tshirt-registrations?festivalId=${festival.id}`} className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/10 text-white font-semibold text-sm hover:bg-white/[0.06] transition-all shadow-sm">
            <Shirt className="w-4 h-4 text-amber-300" /> T-Shirt Registrations
          </Link>
        </div>

        {festival.description && (
          <div className="bg-card border border-border rounded-xl p-4 mb-6">
            <p className="text-sm text-muted-foreground">{festival.description}</p>
          </div>
        )}

        <div className="rounded-2xl overflow-hidden mb-6 bg-white/[0.03] border border-white/8 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
          <div className="p-4 border-b border-white/8 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-serif font-bold text-foreground">Donation Records</h2>
              <p className="text-xs text-muted-foreground">Manage festival donations</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowFilters(!showFilters)} className={cn("flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold border transition-all", showFilters || hasActiveFilters ? 'bg-white/[0.04] border-amber-300/20 text-white' : 'border-white/10 text-white/70 hover:bg-white/[0.02]')}>
                <ListFilter className="w-3.5 h-3.5 text-amber-300" /> Filters {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-amber-300" />}
              </button>
              <button onClick={() => { fetchDonations(); fetchStats(); fetchCollectionSummary(collectionDate); }} disabled={isLoadingDonations} className="px-3 py-2 border border-white/10 rounded-full text-sm font-semibold hover:bg-white/[0.02] transition-all text-white/70">
                <RefreshCw className={cn("w-4 h-4", isLoadingDonations && "animate-spin")} />
              </button>
            </div>
          </div>

          <div className="p-4 border-b border-border bg-muted/10">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-semibold text-foreground mb-1"><Search className="w-3 h-3 inline mr-1" /> Search</label>
                <div className="flex gap-2">
                  <input type="text" value={donationSearchInput} onChange={e => setDonationSearchInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleDonationSearch()} placeholder="Name, Mobile, Flat, Receipt..." className="flex-1 px-3 py-2 text-sm rounded-full border border-white/10 bg-white/[0.05] text-white placeholder:text-white/35 backdrop-blur-xl focus:ring-2 focus:ring-amber-300/10 outline-none" />
                  <button onClick={handleDonationSearch} className="px-4 py-2 bg-white text-black rounded-full text-sm font-semibold hover:scale-[0.995] transition-all shadow-[0_0_35px_rgba(255,255,255,0.12)]"><Search className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="w-[130px]">
                <label className="block text-xs font-semibold text-white/80 mb-1">Status</label>
                <select value={filterDonationStatus} onChange={e => { setFilterDonationStatus(e.target.value); setDonationPagination(p => ({ ...p, page: 1 })); }} className="w-full px-3 py-2 text-sm rounded-full border border-white/10 bg-white/[0.04] text-white backdrop-blur-xl focus:ring-2 focus:ring-amber-300/10 outline-none">
                  <option value="">All</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              <div className="w-[140px]">
                <label className="block text-xs font-semibold text-white/80 mb-1">Method</label>
                <select value={filterPaymentMethod} onChange={e => { setFilterPaymentMethod(e.target.value); setDonationPagination(p => ({ ...p, page: 1 })); }} className="w-full px-3 py-2 text-sm rounded-full border border-white/10 bg-white/[0.04] text-white backdrop-blur-xl focus:ring-2 focus:ring-amber-300/10 outline-none">
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

            {isLoadingDonations ? (
            <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-2 border-white/20 border-t-amber-300 rounded-full animate-spin" /></div>
          ) : donations.length === 0 ? (
            <div className="text-center py-16 text-white/60">
              <IndianRupee className="w-12 h-12 mx-auto mb-3 text-white/20" />
              <p className="font-semibold text-white">{hasActiveFilters ? 'No donations match your filters' : 'No donations recorded yet'}</p>
              <p className="text-sm mt-1 text-white/60">{hasActiveFilters ? 'Try adjusting your filters.' : 'Click "Add Donation" to record the first donation.'}</p>
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
                            <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold", isPaid(d) ? 'text-white bg-white/[0.04]' : 'text-amber-700 bg-amber-100/30')}>
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
                                <button onClick={() => { const msg = buildWhatsAppReceipt(d, festival.name); openWhatsApp(d.residentMobile, msg); }} className="p-1.5 rounded-lg hover:bg-white/[0.04] transition-colors text-amber-300" title="Send WhatsApp Receipt">
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

      {showAddDonation && (
        <AddDonationModal festivalId={festival.id} festivalName={festival.name} onClose={() => setShowAddDonation(false)} onSaved={() => { fetchDonations(); fetchStats(); fetchCollectionSummary(collectionDate); }} />
      )}
      {viewDonation && <ViewDonationModal donation={viewDonation} festivalName={festival.name} onClose={() => setViewDonation(null)} />}
      {editDonation && (
        <EditDonationModal donation={editDonation} festivalName={festival.name} onClose={() => setEditDonation(null)} onSaved={() => { fetchDonations(); fetchStats(); fetchCollectionSummary(collectionDate); }} />
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

