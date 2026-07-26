import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, MapPin, Search, Plus, X, CheckCircle, Clock, Building2, Home, Phone, User, IndianRupee, Save, ChevronDown, AlertTriangle, MessageCircleMore } from 'lucide-react';
import { toast } from 'sonner';
import { cn, getApiUrl } from '@/lib/utils';
import { PENDING_REASONS } from '@/lib/pending-reasons';
import { generatePendingNoticePDF, downloadPDF } from '@/lib/pdf-generator';
import { sendPendingReminderViaWhatsApp } from '@/lib/whatsapp-service';

// ── Types ────────────────────────────────────────────────────────────────────

interface FestivalOption {
  id: number;
  name: string;
  year: number;
  status: string;
}

interface SearchResident {
  id: number; fullName: string; mobile: string;
  flatNo: string; buildingId: number; wingId: number | null;
  buildingName: string; wingName: string;
  address?: string | null;
}

interface FestivalHistory {
  festivalName: string; year: number; festivalId: number;
  status: string; amount: number | null;
  receiptNumber: string | null; paymentDate: string | null;
  paymentMethod: string | null; collectedBy: string; notes: string | null;
}

// ── Auth helpers ─────────────────────────────────────────────────────────────

function getAdminToken(): string | null {
  try {
    const stored = localStorage.getItem('admin_auth');
    if (!stored) return null;
    return JSON.parse(stored)?.token || null;
  } catch { return null; }
}

function authHeaders(): Record<string, string> {
  const token = getAdminToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

function formatCurrency(amount: number | null): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

// ── Festival Searchable Dropdown ─────────────────────────────────────────────

function FestivalDropdown({ selectedId, onSelect }: {
  selectedId: number | null;
  onSelect: (festival: FestivalOption) => void;
}) {
  const [festivals, setFestivals] = useState<FestivalOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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
    fetch(`${getApiUrl()}/api/admin/festivals`, { headers: authHeaders() })
      .then(r => r.json())
      .then((data: FestivalOption[]) => {
        setFestivals(data);
        const active = data.filter(f => f.status === 'active');
        if (active.length === 1 && !selectedId) {
          onSelect(active[0]);
        }
      })
      .catch(() => toast.error('Failed to load festivals'))
      .finally(() => setIsLoading(false));
  }, []);

  const selected = festivals.find(f => f.id === selectedId);
  const filtered = festivals.filter(f => {
    const q = search.toLowerCase();
    return f.name.toLowerCase().includes(q) || String(f.year).includes(q);
  });

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-xs font-semibold text-foreground mb-1.5">Festival <span className="text-destructive">*</span></label>
      <button
        type="button"
        onClick={() => { setIsOpen(!isOpen); setTimeout(() => searchInputRef.current?.focus(), 100); }}
        className="w-full px-4 py-3 text-sm rounded-xl border border-border bg-background text-left flex items-center justify-between gap-2 hover:border-primary/50 transition-all focus:ring-2 focus:ring-primary outline-none"
      >
        {selected ? (
          <span className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary shrink-0" />
            <span className="font-semibold text-foreground">{selected.name}</span>
            <span className="text-xs text-muted-foreground">({selected.year})</span>
            {selected.status === 'active' && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400">
                <CheckCircle className="w-2.5 h-2.5" /> Active
              </span>
            )}
          </span>
        ) : (
          <span className="text-muted-foreground flex items-center gap-2">
            <MapPin className="w-4 h-4 shrink-0" />
            {isLoading ? 'Loading festivals...' : 'Select a festival'}
          </span>
        )}
        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full border border-border rounded-xl bg-card shadow-xl max-h-72 overflow-hidden">
          <div className="p-2 border-b border-border">
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search festivals..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
          <div className="overflow-y-auto max-h-52">
            {filtered.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">No festivals found</div>
            ) : (
              filtered.map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => { onSelect(f); setIsOpen(false); setSearch(''); }}
                  className={cn(
                    "w-full px-3 py-3 text-left hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0 flex items-center justify-between",
                    selectedId === f.id && "bg-primary/5"
                  )}
                >
                  <div>
                    <span className="font-semibold text-foreground text-sm">{f.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">{f.year}</span>
                  </div>
                  {f.status === 'active' && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400">
                      Active
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Resident Search Dropdown ─────────────────────────────────────────────────

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
        }
      } catch { /* ignore */ }
      finally { setIsSearching(false); }
    }, 300);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [query, selectedResident]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && selectedIdx >= 0) { e.preventDefault(); handleSelect(results[selectedIdx]); }
    else if (e.key === 'Escape') { setIsOpen(false); }
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

      {festivalHistory.length > 0 && (
        <div className="mt-3 pt-3 border-t border-primary/10">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Previous Festival Donations</p>
          <div className="space-y-1.5">
            {festivalHistory.map((h, hi) => (
              <div key={hi} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{h.festivalName} {h.year}</span>
                <span className={cn("font-semibold", h.status === 'paid' ? 'text-emerald-600' : 'text-amber-600')}>
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

// ── Main Page ────────────────────────────────────────────────────────────────

export default function AdminAddDonation() {
  const [selectedFestival, setSelectedFestival] = useState<FestivalOption | null>(null);
  const [selectedResident, setSelectedResident] = useState<SearchResident | null>(null);
  const [festivalHistory, setFestivalHistory] = useState<FestivalHistory[]>([]);
const [donationStatus, setDonationStatus] = useState<'paid' | 'pending'>('pending');
  const [pendingReason, setPendingReason] = useState('');
  const [pendingCustomReason, setPendingCustomReason] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Track touched fields for validation display
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const handleResidentSelect = async (resident: SearchResident) => {
    setSelectedResident(resident);
    setErrors(prev => { const { ...rest } = prev; delete rest.resident; return rest; });
    try {
      const res = await fetch(`${getApiUrl()}/api/admin/residents/${resident.id}/festival-history`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setFestivalHistory(data || []);
      }
    } catch { /* ignore */ }
  };

  const clearForm = () => {
    setSelectedResident(null);
    setFestivalHistory([]);
    setDonationStatus('pending');
    setPaymentMethod('cash');
    setAmount('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setErrors({});
    setTouched({});
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!selectedFestival) newErrors.festival = 'Please select a festival';
    if (!selectedResident) newErrors.resident = 'Please select a resident';
    if (donationStatus === 'paid') {
      if (!amount || parseFloat(amount) <= 0) newErrors.amount = 'Valid donation amount is required';
      if (!paymentMethod) newErrors.paymentMethod = 'Payment method is required';
    }
    setErrors(newErrors);
    setTouched({ festival: true, resident: true, status: true, amount: true, paymentMethod: true });
    return Object.keys(newErrors).length === 0;
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
      const res = await fetch(`${getApiUrl()}/api/admin/festivals/${selectedFestival!.id}/donations`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to save' }));
        if (res.status === 409) {
          toast.error(err.error, { duration: 5000 });
        } else {
          toast.error(err.error || 'Failed to save donation');
        }
        return;
      }
      toast.success(donationStatus === 'paid' ? 'Donation recorded successfully' : 'Pending donation recorded');
      clearForm();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save donation');
    } finally { setIsSaving(false); }
  };

  return (
    <div className="w-full min-h-screen bg-muted/10 pb-20">
      {/* Header */}
      <div className="bg-secondary text-secondary-foreground py-8 px-4 border-b border-border shadow-sm">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center gap-4">
            <Link
              href={selectedFestival ? `/admin/festivals/${selectedFestival.id}` : '/admin/festivals'}
              className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex-1">
              <h1 className="text-3xl font-serif font-bold text-white flex items-center gap-3">
                <Plus className="w-7 h-7 text-primary" /> Add Donation
              </h1>
              <p className="text-white/70">Record a festival donation for a resident</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-4 py-8">
        <form onSubmit={handleSubmit}>
          {/* Card: Festival Selection */}
          <div className="bg-card border border-border rounded-2xl shadow-sm p-6 mb-6">
            <FestivalDropdown
              selectedId={selectedFestival?.id || null}
              onSelect={(f) => { setSelectedFestival(f); setErrors(prev => { const { ...rest } = prev; delete rest.festival; return rest; }); }}
            />
            {touched.festival && errors.festival && (
              <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {errors.festival}
              </p>
            )}
          </div>

          {/* Card: Resident Search */}
          <div className="bg-card border border-border rounded-2xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-serif font-bold text-foreground mb-4">Resident Details</h2>
            <div className="space-y-4">
<ResidentSearchDropdown
                selectedResident={selectedResident}
                onSelect={handleResidentSelect}
                onClear={() => { setSelectedResident(null); setFestivalHistory([]); }}
              />
              {touched.resident && errors.resident && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {errors.resident}
                </p>
              )}

              {selectedResident && (
                <SelectedResidentCard resident={selectedResident} festivalHistory={festivalHistory} />
              )}
            </div>
          </div>

          {/* Card: Donation Details */}
          <div className="bg-card border border-border rounded-2xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-serif font-bold text-foreground mb-4">Donation Details</h2>
            <div className="space-y-5">
              {/* Donation Status Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Donation Status <span className="text-destructive">*</span></label>
                <select
                  value={donationStatus}
                  onChange={e => { setDonationStatus(e.target.value as 'paid' | 'pending'); setTouched(prev => ({ ...prev, status: true })); }}
                  className={cn(
                    "w-full px-3 py-2.5 text-sm rounded-lg border bg-background focus:ring-2 focus:ring-primary outline-none",
                    donationStatus === 'paid' ? 'border-emerald-300 focus:border-emerald-500' : 'border-amber-300 focus:border-amber-500'
                  )}
                >
                  <option value="pending">⏳ Pending</option>
                  <option value="paid">✅ Paid</option>
                </select>
              </div>

{/* Pending Reason (only when Pending) */}
              {donationStatus === 'pending' && (
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Pending Reason <span className="text-destructive">*</span></label>
                  <select
                    value={pendingReason}
                    onChange={e => {
                      setPendingReason(e.target.value);
                      if (e.target.value !== 'Other') setPendingCustomReason('');
                    }}
                    className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none"
                  >
                    <option value="">Select a reason...</option>
                    {PENDING_REASONS.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  {pendingReason === 'Other' && (
                    <input
                      type="text"
                      value={pendingCustomReason}
                      onChange={e => setPendingCustomReason(e.target.value)}
                      placeholder="Please specify the reason..."
                      className="w-full mt-2 px-3 py-2.5 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none"
                    />
                  )}
                </div>
              )}

              {/* Payment Method (disabled when Pending) */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Payment Method {donationStatus === 'paid' && <span className="text-destructive">*</span>}
                  {donationStatus === 'pending' && <span className="text-muted-foreground text-[10px]">(select when status is Paid)</span>}
                </label>
                <select
                  value={donationStatus === 'paid' ? paymentMethod : ''}
                  onChange={e => { setPaymentMethod(e.target.value); setTouched(prev => ({ ...prev, paymentMethod: true })); }}
                  disabled={donationStatus === 'pending'}
                  className={cn(
                    "w-full px-3 py-2.5 text-sm rounded-lg border bg-background focus:ring-2 focus:ring-primary outline-none",
                    donationStatus === 'pending' && "opacity-50 cursor-not-allowed",
                    donationStatus === 'paid' ? 'border-border' : 'border-border/50'
                  )}
                >
                  <option value="">Select payment method</option>
                  <option value="cash">💵 Cash</option>
                  <option value="upi">📱 UPI</option>
                  <option value="bank_transfer">🏦 Bank Transfer</option>
                  <option value="cheque">📄 Cheque</option>
                </select>
                {touched.paymentMethod && errors.paymentMethod && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {errors.paymentMethod}
                  </p>
                )}
              </div>

              {/* Donation Amount */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Donation Amount (₹) {donationStatus === 'paid' && <span className="text-destructive">*</span>}
                  {donationStatus === 'pending' && <span className="text-muted-foreground text-[10px]">(optional when Pending)</span>}
                </label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input
                    type="number"
                    value={amount}
                    onChange={e => { setAmount(e.target.value); setTouched(prev => ({ ...prev, amount: true })); }}
                    min={0}
                    step={1}
                    placeholder={donationStatus === 'pending' ? 'Leave empty or enter 0' : 'Enter amount'}
                    className={cn(
                      "w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border bg-background focus:ring-2 focus:ring-primary outline-none",
                      donationStatus === 'paid' && !amount && touched.amount ? 'border-destructive' : 'border-border'
                    )}
                  />
                </div>
                {touched.amount && errors.amount && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {errors.amount}
                  </p>
                )}
              </div>

              {/* Payment Date (only when Paid) */}
              {donationStatus === 'paid' && (
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Payment Date</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={e => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Additional Notes <span className="text-muted-foreground text-[10px]">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  placeholder={donationStatus === 'pending' ? 'Will pay next week, Paid through committee member, Requested receipt later...' : 'Any additional remarks...'}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none resize-none"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              type="submit"
              disabled={isSaving || !selectedFestival || !selectedResident}
              className="w-full sm:w-auto px-8 py-3.5 bg-primary text-primary-foreground rounded-xl font-bold text-lg hover:bg-primary/90 transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  {donationStatus === 'paid' ? 'Record Donation' : 'Mark as Pending'}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={clearForm}
              disabled={isSaving}
              className="w-full sm:w-auto px-8 py-3.5 border border-border text-foreground rounded-xl font-bold text-lg hover:bg-muted/50 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <X className="w-5 h-5" /> Clear Form
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
