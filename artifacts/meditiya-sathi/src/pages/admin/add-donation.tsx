import {
  useState,
  useEffect,
  useRef,
  type KeyboardEvent,
  type FormEvent,
} from 'react';
import { Link } from 'wouter';
import {
  ArrowLeft,
  MapPin,
  Search,
  Plus,
  X,
  CheckCircle2,
  Building2,
  Phone,
  User,
  IndianRupee,
  Save,
  ChevronDown,
  AlertTriangle,
  Clock3,
  WalletCards,
  Banknote,
  Smartphone,
  Landmark,
  FileText,
  History,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

import { cn, getApiUrl } from '@/lib/utils';
import { PENDING_REASONS } from '@/lib/pending-reasons';

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

interface FestivalOption {
  id: number;
  name: string;
  year: number;
  status: string;
}

interface SearchResident {
  id: number;
  fullName: string;
  mobile: string;
  flatNo: string;
  buildingId: number;
  wingId: number | null;
  buildingName: string;
  wingName: string;
  address?: string | null;
}

interface FestivalHistory {
  festivalName: string;
  year: number;
  festivalId: number;
  status: string;
  amount: number | null;
  receiptNumber: string | null;
  paymentDate: string | null;
  paymentMethod: string | null;
  collectedBy: string;
  notes: string | null;
}

/* -------------------------------------------------------------------------- */
/* Auth helpers                                                               */
/* -------------------------------------------------------------------------- */

function getAdminToken(): string | null {
  try {
    const stored = localStorage.getItem('admin_auth');

    if (!stored) {
      return null;
    }

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
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

function formatCurrency(amount: number | null): string {
  if (amount == null) {
    return '—';
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/* -------------------------------------------------------------------------- */
/* Reusable UI                                                                */
/* -------------------------------------------------------------------------- */

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof User;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-3 mb-6">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>

      <div>
        <h2 className="text-lg font-bold tracking-tight text-foreground">
          {title}
        </h2>

        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

function FieldLabel({
  children,
  required = false,
  optional = false,
}: {
  children: React.ReactNode;
  required?: boolean;
  optional?: boolean;
}) {
  return (
    <label className="mb-2 block text-sm font-semibold text-foreground">
      {children}

      {required && (
        <span className="ml-1 text-destructive">*</span>
      )}

      {optional && (
        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
          (optional)
        </span>
      )}
    </label>
  );
}

function ErrorMessage({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-destructive">
      <AlertTriangle className="h-3.5 w-3.5" />
      {message}
    </p>
  );
}

/* -------------------------------------------------------------------------- */
/* Festival Dropdown                                                          */
/* -------------------------------------------------------------------------- */

function FestivalDropdown({
  selectedId,
  onSelect,
}: {
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
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadFestivals() {
      try {
        const response = await fetch(
          `${getApiUrl()}/api/admin/festivals`,
          {
            headers: authHeaders(),
          },
        );

        if (!response.ok) {
          throw new Error('Failed to load festivals');
        }

        const data: FestivalOption[] = await response.json();

        if (!mounted) {
          return;
        }

        setFestivals(data);

        const activeFestivals = data.filter(
          (festival) => festival.status === 'active',
        );

        if (activeFestivals.length === 1 && !selectedId) {
          onSelect(activeFestivals[0]);
        }
      } catch {
        toast.error('Failed to load festivals');
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadFestivals();

    return () => {
      mounted = false;
    };
  }, []);

  const selectedFestival = festivals.find(
    (festival) => festival.id === selectedId,
  );

  const filteredFestivals = festivals.filter((festival) => {
    const query = search.toLowerCase().trim();

    return (
      festival.name.toLowerCase().includes(query) ||
      String(festival.year).includes(query)
    );
  });

  const openDropdown = () => {
    setIsOpen((previous) => !previous);

    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <FieldLabel required>Festival</FieldLabel>

      <button
        type="button"
        onClick={openDropdown}
        className={cn(
          'flex w-full items-center justify-between gap-3 rounded-xl border bg-background px-4 py-3.5 text-left transition-all',
          'hover:border-primary/40',
          'focus:outline-none focus:ring-2 focus:ring-primary/20',
          isOpen
            ? 'border-primary ring-2 ring-primary/10'
            : 'border-border',
        )}
      >
        {selectedFestival ? (
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MapPin className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate text-sm font-bold text-foreground">
                  {selectedFestival.name}
                </span>

                <span className="text-xs text-muted-foreground">
                  {selectedFestival.year}
                </span>

                {selectedFestival.status === 'active' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                    <CheckCircle2 className="h-3 w-3" />
                    Active
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
              <MapPin className="h-4 w-4" />
            </div>

            <span>
              {isLoading
                ? 'Loading festivals...'
                : 'Select a festival'}
            </span>
          </div>
        )}

        <ChevronDown
          className={cn(
            'h-5 w-5 shrink-0 text-muted-foreground transition-transform',
            isOpen && 'rotate-180',
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          <div className="border-b border-border bg-muted/20 p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search festival or year..."
                className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto p-2">
            {filteredFestivals.length === 0 ? (
              <div className="py-8 text-center">
                <MapPin className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" />
                <p className="text-sm font-medium text-muted-foreground">
                  No festivals found
                </p>
              </div>
            ) : (
              filteredFestivals.map((festival) => (
                <button
                  key={festival.id}
                  type="button"
                  onClick={() => {
                    onSelect(festival);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition-colors',
                    'hover:bg-muted/70',
                    selectedId === festival.id &&
                      'bg-primary/10',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <MapPin className="h-4 w-4" />
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {festival.name}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        {festival.year}
                      </p>
                    </div>
                  </div>

                  {festival.status === 'active' && (
                    <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-600">
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

/* -------------------------------------------------------------------------- */
/* Resident Search                                                            */
/* -------------------------------------------------------------------------- */

function ResidentSearchDropdown({
  onSelect,
  selectedResident,
  onClear,
}: {
  onSelect: (resident: SearchResident) => void;
  selectedResident: SearchResident | null;
  onClear: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResident[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (selectedResident) {
      return;
    }

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (query.trim().length < 1) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);

      try {
        const response = await fetch(
          `${getApiUrl()}/api/admin/residents/search?q=${encodeURIComponent(
            query.trim(),
          )}`,
          {
            headers: authHeaders(),
          },
        );

        if (!response.ok) {
          throw new Error('Search failed');
        }

        const data = await response.json();

        setResults(data.residents || []);
        setSelectedIndex(-1);
        setIsOpen(true);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [query, selectedResident]);

  const handleSelect = (resident: SearchResident) => {
    onSelect(resident);
    setQuery(resident.fullName);
    setIsOpen(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();

      setSelectedIndex((index) =>
        Math.min(index + 1, results.length - 1),
      );
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();

      setSelectedIndex((index) => Math.max(index - 1, 0));
    }

    if (event.key === 'Enter' && selectedIndex >= 0) {
      event.preventDefault();

      handleSelect(results[selectedIndex]);
    }

    if (event.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const clearResident = () => {
    onClear();
    setQuery('');
    setResults([]);
    setIsOpen(false);

    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <FieldLabel required>Search Resident</FieldLabel>

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(event) => {
            const value = event.target.value;

            if (selectedResident) {
              onClear();
            }

            setQuery(value);
          }}
          onFocus={() => {
            if (results.length > 0) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder="Name, mobile, building, wing or flat number..."
          className={cn(
            'w-full rounded-xl border bg-background py-3.5 pl-11 pr-11 text-sm outline-none transition-all',
            'focus:border-primary focus:ring-2 focus:ring-primary/20',
            selectedResident
              ? 'border-emerald-300 dark:border-emerald-800'
              : 'border-border',
          )}
        />

        {isSearching && (
          <span className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
        )}

        {!isSearching && selectedResident && (
          <button
            type="button"
            onClick={clearResident}
            className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && !selectedResident && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          <div className="max-h-80 overflow-y-auto p-2">
            {results.map((resident, index) => (
              <button
                key={resident.id}
                type="button"
                onClick={() => handleSelect(resident)}
                className={cn(
                  'flex w-full items-start gap-3 rounded-xl p-3 text-left transition',
                  'hover:bg-muted/70',
                  index === selectedIndex && 'bg-muted',
                )}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <User className="h-4 w-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">
                    {resident.fullName}
                  </p>

                  <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5 shrink-0" />

                    <span className="truncate">
                      {resident.buildingName}
                      {resident.wingName
                        ? ` • ${resident.wingName}`
                        : ''}
                      {' • Flat '}
                      {resident.flatNo}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    {resident.mobile}
                  </div>
                </div>

                <ChevronDown className="mt-2 h-4 w-4 shrink-0 -rotate-90 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      )}

      {isOpen &&
        results.length === 0 &&
        query.trim().length >= 2 &&
        !isSearching && (
          <div className="absolute z-50 mt-2 w-full rounded-2xl border border-border bg-card p-6 text-center shadow-2xl">
            <Search className="mx-auto mb-2 h-7 w-7 text-muted-foreground/50" />

            <p className="text-sm font-semibold text-foreground">
              No residents found
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              Try searching with a different name, mobile number or flat.
            </p>
          </div>
        )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Selected Resident Card                                                     */
/* -------------------------------------------------------------------------- */

function SelectedResidentCard({
  resident,
  festivalHistory,
}: {
  resident: SearchResident;
  festivalHistory: FestivalHistory[];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/10">
      <div className="flex items-center gap-2 border-b border-emerald-200/70 px-4 py-3 dark:border-emerald-900/40">
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />

        <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
          Resident Selected
        </span>
      </div>

      <div className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User className="h-6 w-6" />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-foreground">
              {resident.fullName}
            </h3>

            <div className="mt-2 grid gap-1.5 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 shrink-0" />

                <span>
                  {resident.buildingName}
                  {resident.wingName
                    ? ` • ${resident.wingName}`
                    : ''}
                  {' • Flat '}
                  {resident.flatNo}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0" />

                <span>{resident.mobile}</span>
              </div>
            </div>
          </div>
        </div>

        {festivalHistory.length > 0 && (
          <div className="mt-5 border-t border-emerald-200/70 pt-4 dark:border-emerald-900/40">
            <div className="mb-3 flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />

              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Previous Festival Donations
              </p>
            </div>

            <div className="space-y-2">
              {festivalHistory.map((history, index) => (
                <div
                  key={`${history.festivalId}-${index}`}
                  className="flex items-center justify-between gap-3 rounded-xl bg-background/70 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {history.festivalName}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {history.year}
                    </p>
                  </div>

                  <div
                    className={cn(
                      'shrink-0 text-right text-xs font-bold',
                      history.status === 'paid'
                        ? 'text-emerald-600'
                        : 'text-amber-600',
                    )}
                  >
                    {history.status === 'paid'
                      ? `Paid ${formatCurrency(history.amount)}`
                      : 'Pending'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Payment Method Card                                                        */
/* -------------------------------------------------------------------------- */

const paymentMethods = [
  {
    value: 'cash',
    label: 'Cash',
    icon: Banknote,
  },
  {
    value: 'upi',
    label: 'UPI',
    icon: Smartphone,
  },
  {
    value: 'bank_transfer',
    label: 'Bank Transfer',
    icon: Landmark,
  },
  {
    value: 'cheque',
    label: 'Cheque',
    icon: FileText,
  },
];

/* -------------------------------------------------------------------------- */
/* Main Page                                                                  */
/* -------------------------------------------------------------------------- */

export default function AdminAddDonation() {
  const [selectedFestival, setSelectedFestival] =
    useState<FestivalOption | null>(null);

  const [selectedResident, setSelectedResident] =
    useState<SearchResident | null>(null);

  const [festivalHistory, setFestivalHistory] = useState<
    FestivalHistory[]
  >([]);

  const [donationStatus, setDonationStatus] = useState<
    'paid' | 'pending'
  >('pending');

  const [pendingReason, setPendingReason] = useState('');
  const [pendingCustomReason, setPendingCustomReason] = useState('');

  const [paymentMethod, setPaymentMethod] = useState('cash');

  const [amount, setAmount] = useState('');

  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split('T')[0],
  );

  const [notes, setNotes] = useState('');

  const [isSaving, setIsSaving] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const [touched, setTouched] = useState<Record<string, boolean>>(
    {},
  );

  /* ---------------------------------------------------------------------- */
  /* Resident selection                                                     */
  /* ---------------------------------------------------------------------- */

  const handleResidentSelect = async (
    resident: SearchResident,
  ) => {
    setSelectedResident(resident);

    setErrors((previous) => {
      const next = { ...previous };
      delete next.resident;
      return next;
    });

    try {
      const response = await fetch(
        `${getApiUrl()}/api/admin/residents/${resident.id}/festival-history`,
        {
          headers: authHeaders(),
        },
      );

      if (!response.ok) {
        return;
      }

      const data: FestivalHistory[] = await response.json();

      setFestivalHistory(data || []);
    } catch {
      setFestivalHistory([]);
    }
  };

  /* ---------------------------------------------------------------------- */
  /* Clear form                                                             */
  /* ---------------------------------------------------------------------- */

  const clearForm = () => {
    setSelectedResident(null);
    setFestivalHistory([]);

    setDonationStatus('pending');

    setPendingReason('');
    setPendingCustomReason('');

    setPaymentMethod('cash');

    setAmount('');

    setPaymentDate(new Date().toISOString().split('T')[0]);

    setNotes('');

    setErrors({});
    setTouched({});
  };

  /* ---------------------------------------------------------------------- */
  /* Validation                                                             */
  /* ---------------------------------------------------------------------- */

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedFestival) {
      newErrors.festival = 'Please select a festival';
    }

    if (!selectedResident) {
      newErrors.resident = 'Please select a resident';
    }

    if (donationStatus === 'paid') {
      if (!amount || Number(amount) <= 0) {
        newErrors.amount =
          'Enter a valid donation amount';
      }

      if (!paymentMethod) {
        newErrors.paymentMethod =
          'Please select a payment method';
      }
    }

    if (donationStatus === 'pending') {
      const reason =
        pendingReason === 'Other'
          ? pendingCustomReason
          : pendingReason;

      if (!reason.trim()) {
        newErrors.pendingReason =
          'Please select a pending reason';
      }
    }

    setErrors(newErrors);

    setTouched({
      festival: true,
      resident: true,
      status: true,
      amount: true,
      paymentMethod: true,
      pendingReason: true,
    });

    return Object.keys(newErrors).length === 0;
  };

  /* ---------------------------------------------------------------------- */
  /* Submit                                                                 */
  /* ---------------------------------------------------------------------- */

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    if (!selectedFestival || !selectedResident) {
      return;
    }

    setIsSaving(true);

    try {
      const body: Record<string, unknown> = {
        residentId: selectedResident.id,
        paymentMethod:
          donationStatus === 'paid'
            ? paymentMethod
            : 'pending',
        notes: notes.trim() || null,
      };

      if (donationStatus === 'paid') {
        body.amount = Number(amount);
        body.paymentDate = paymentDate;
      } else {
        const reason =
          pendingReason === 'Other'
            ? pendingCustomReason
            : pendingReason;

        body.pendingReason = reason.trim() || null;
      }

      const response = await fetch(
        `${getApiUrl()}/api/admin/festivals/${selectedFestival.id}/donations`,
        {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(body),
        },
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({
            error: 'Failed to save donation',
          }));

        if (response.status === 409) {
          toast.error(errorData.error, {
            duration: 5000,
          });
        } else {
          toast.error(
            errorData.error ||
              'Failed to save donation',
          );
        }

        return;
      }

      toast.success(
        donationStatus === 'paid'
          ? 'Donation recorded successfully'
          : 'Pending donation recorded successfully',
      );

      clearForm();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to save donation';

      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  /* ---------------------------------------------------------------------- */
  /* Render                                                                 */
  /* ---------------------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 via-background to-background pb-32">
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                             */}
      {/* ------------------------------------------------------------------ */}

      <header className="relative overflow-hidden border-b border-border bg-secondary text-secondary-foreground">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />

        <div className="absolute -bottom-32 -left-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative mx-auto max-w-5xl px-4 py-7 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link
              href={
                selectedFestival
                  ? `/admin/festivals/${selectedFestival.id}`
                  : '/admin/festivals'
              }
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>

            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg sm:flex">
                <Plus className="h-5 w-5" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    Add Donation
                  </h1>

                  <Sparkles className="hidden h-5 w-5 text-primary sm:block" />
                </div>

                <p className="mt-1 text-sm text-white/60">
                  Record and manage festival contributions
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Main                                                               */}
      {/* ------------------------------------------------------------------ */}

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* -------------------------------------------------------------- */}
          {/* Festival                                                        */}
          {/* -------------------------------------------------------------- */}

          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <SectionHeader
              icon={MapPin}
              title="Festival"
              description="Choose the festival for this donation."
            />

            <FestivalDropdown
              selectedId={selectedFestival?.id || null}
              onSelect={(festival) => {
                setSelectedFestival(festival);

                setErrors((previous) => {
                  const next = { ...previous };
                  delete next.festival;
                  return next;
                });
              }}
            />

            {touched.festival && (
              <ErrorMessage message={errors.festival} />
            )}
          </section>

          {/* -------------------------------------------------------------- */}
          {/* Resident                                                        */}
          {/* -------------------------------------------------------------- */}

          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <SectionHeader
              icon={User}
              title="Resident"
              description="Search for the resident who made the contribution."
            />

            <ResidentSearchDropdown
              selectedResident={selectedResident}
              onSelect={handleResidentSelect}
              onClear={() => {
                setSelectedResident(null);
                setFestivalHistory([]);
              }}
            />

            {touched.resident && (
              <ErrorMessage message={errors.resident} />
            )}

            {selectedResident && (
              <div className="mt-5">
                <SelectedResidentCard
                  resident={selectedResident}
                  festivalHistory={festivalHistory}
                />
              </div>
            )}
          </section>

          {/* -------------------------------------------------------------- */}
          {/* Donation Details                                                */}
          {/* -------------------------------------------------------------- */}

          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <SectionHeader
              icon={WalletCards}
              title="Donation Details"
              description="Enter the payment and collection information."
            />

            {/* Status */}
            <div className="mb-6">
              <FieldLabel required>
                Donation Status
              </FieldLabel>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setDonationStatus('pending')
                  }
                  className={cn(
                    'group flex items-center gap-3 rounded-xl border p-4 text-left transition-all',
                    donationStatus === 'pending'
                      ? 'border-amber-400 bg-amber-50 shadow-sm dark:border-amber-700 dark:bg-amber-950/20'
                      : 'border-border hover:border-amber-300 hover:bg-muted/40',
                  )}
                >
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                      donationStatus === 'pending'
                        ? 'bg-amber-500 text-white'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    <Clock3 className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground">
                      Pending
                    </p>

                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Payment not received
                    </p>
                  </div>

                  {donationStatus === 'pending' && (
                    <CheckCircle2 className="ml-auto h-5 w-5 shrink-0 text-amber-600" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setDonationStatus('paid')
                  }
                  className={cn(
                    'group flex items-center gap-3 rounded-xl border p-4 text-left transition-all',
                    donationStatus === 'paid'
                      ? 'border-emerald-400 bg-emerald-50 shadow-sm dark:border-emerald-700 dark:bg-emerald-950/20'
                      : 'border-border hover:border-emerald-300 hover:bg-muted/40',
                  )}
                >
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                      donationStatus === 'paid'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    <CheckCircle2 className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground">
                      Paid
                    </p>

                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Payment received
                    </p>
                  </div>

                  {donationStatus === 'paid' && (
                    <CheckCircle2 className="ml-auto h-5 w-5 shrink-0 text-emerald-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Pending Reason */}
            {donationStatus === 'pending' && (
              <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/50 dark:bg-amber-950/10">
                <FieldLabel required>
                  Pending Reason
                </FieldLabel>

                <select
                  value={pendingReason}
                  onChange={(event) => {
                    const value = event.target.value;

                    setPendingReason(value);

                    if (value !== 'Other') {
                      setPendingCustomReason('');
                    }

                    setErrors((previous) => {
                      const next = { ...previous };
                      delete next.pendingReason;
                      return next;
                    });
                  }}
                  className="w-full rounded-xl border border-amber-200 bg-background px-4 py-3 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-amber-900/60"
                >
                  <option value="">
                    Select a reason...
                  </option>

                  {PENDING_REASONS.map((reason) => (
                    <option
                      key={reason.value}
                      value={reason.value}
                    >
                      {reason.label}
                    </option>
                  ))}
                </select>

                {pendingReason === 'Other' && (
                  <input
                    type="text"
                    value={pendingCustomReason}
                    onChange={(event) =>
                      setPendingCustomReason(
                        event.target.value,
                      )
                    }
                    placeholder="Enter the pending reason..."
                    className="mt-3 w-full rounded-xl border border-amber-200 bg-background px-4 py-3 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-amber-900/60"
                  />
                )}

                {touched.pendingReason && (
                  <ErrorMessage
                    message={errors.pendingReason}
                  />
                )}
              </div>
            )}

            {/* Paid fields */}
            {donationStatus === 'paid' && (
              <div className="space-y-6">
                {/* Amount */}
                <div>
                  <FieldLabel required>
                    Donation Amount
                  </FieldLabel>

                  <div className="relative">
                    <IndianRupee className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={amount}
                      onChange={(event) => {
                        setAmount(event.target.value);

                        setErrors((previous) => {
                          const next = { ...previous };
                          delete next.amount;
                          return next;
                        });
                      }}
                      placeholder="Enter donation amount"
                      className={cn(
                        'w-full rounded-xl border bg-background py-3.5 pl-11 pr-4 text-sm outline-none transition',
                        'focus:border-primary focus:ring-2 focus:ring-primary/20',
                        touched.amount &&
                          errors.amount
                          ? 'border-destructive'
                          : 'border-border',
                      )}
                    />
                  </div>

                  {touched.amount && (
                    <ErrorMessage message={errors.amount} />
                  )}
                </div>

                {/* Payment method */}
                <div>
                  <FieldLabel required>
                    Payment Method
                  </FieldLabel>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {paymentMethods.map((method) => {
                      const Icon = method.icon;

                      const isSelected =
                        paymentMethod === method.value;

                      return (
                        <button
                          key={method.value}
                          type="button"
                          onClick={() => {
                            setPaymentMethod(
                              method.value,
                            );

                            setErrors((previous) => {
                              const next = {
                                ...previous,
                              };

                              delete next.paymentMethod;

                              return next;
                            });
                          }}
                          className={cn(
                            'flex flex-col items-center justify-center gap-2 rounded-xl border px-3 py-4 transition-all',
                            isSelected
                              ? 'border-primary bg-primary/10 text-primary shadow-sm'
                              : 'border-border text-muted-foreground hover:border-primary/40 hover:bg-muted/40',
                          )}
                        >
                          <Icon className="h-5 w-5" />

                          <span className="text-xs font-bold">
                            {method.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {touched.paymentMethod && (
                    <ErrorMessage
                      message={errors.paymentMethod}
                    />
                  )}
                </div>

                {/* Date */}
                <div>
                  <FieldLabel>
                    Payment Date
                  </FieldLabel>

                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(event) =>
                      setPaymentDate(event.target.value)
                    }
                    className="w-full rounded-xl border border-border bg-background px-4 py-3.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="mt-6">
              <FieldLabel optional>
                Additional Notes
              </FieldLabel>

              <textarea
                value={notes}
                onChange={(event) =>
                  setNotes(event.target.value)
                }
                rows={4}
                placeholder={
                  donationStatus === 'pending'
                    ? 'Example: Will pay next Sunday...'
                    : 'Add any additional remarks...'
                }
                className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </section>

          {/* -------------------------------------------------------------- */}
          {/* Summary                                                         */}
          {/* -------------------------------------------------------------- */}

          {(selectedFestival || selectedResident) && (
            <section className="rounded-2xl border border-border bg-muted/30 p-5 sm:p-6">
              <div className="mb-4 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />

                <h3 className="text-sm font-bold text-foreground">
                  Donation Summary
                </h3>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-xs font-medium text-muted-foreground">
                    Festival
                  </p>

                  <p className="mt-1 truncate text-sm font-bold text-foreground">
                    {selectedFestival
                      ? `${selectedFestival.name} ${selectedFestival.year}`
                      : 'Not selected'}
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-xs font-medium text-muted-foreground">
                    Resident
                  </p>

                  <p className="mt-1 truncate text-sm font-bold text-foreground">
                    {selectedResident
                      ? selectedResident.fullName
                      : 'Not selected'}
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-xs font-medium text-muted-foreground">
                    Status
                  </p>

                  <div className="mt-1 flex items-center gap-2">
                    {donationStatus === 'paid' ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />

                        <span className="text-sm font-bold text-emerald-600">
                          Paid
                        </span>
                      </>
                    ) : (
                      <>
                        <Clock3 className="h-4 w-4 text-amber-600" />

                        <span className="text-sm font-bold text-amber-600">
                          Pending
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* -------------------------------------------------------------- */}
          {/* Actions                                                         */}
          {/* -------------------------------------------------------------- */}

          <div className="sticky bottom-3 z-40 rounded-2xl border border-border bg-card/95 p-3 shadow-2xl backdrop-blur-md sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-foreground">
                  {donationStatus === 'paid'
                    ? 'Ready to record donation'
                    : 'Ready to mark donation as pending'}
                </p>

                <p className="mt-0.5 text-xs text-muted-foreground">
                  Check the details before saving.
                </p>
              </div>

              <div className="flex w-full gap-2 sm:w-auto">
                <button
                  type="button"
                  onClick={clearForm}
                  disabled={isSaving}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border px-5 py-3 font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                >
                  <X className="h-4 w-4" />
                  Clear
                </button>

                <button
                  type="submit"
                  disabled={
                    isSaving ||
                    !selectedFestival ||
                    !selectedResident
                  }
                  className={cn(
                    'flex flex-[2] items-center justify-center gap-2 rounded-xl px-6 py-3 font-bold text-primary-foreground shadow-lg transition-all sm:flex-none',
                    donationStatus === 'paid'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-amber-600 hover:bg-amber-700',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                  )}
                >
                  {isSaving ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />

                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />

                      {donationStatus === 'paid'
                        ? 'Record Donation'
                        : 'Mark as Pending'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}