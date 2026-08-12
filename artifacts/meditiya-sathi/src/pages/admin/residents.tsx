import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'wouter';
import {
  ArrowLeft,
  Building2,
  Save,
  RotateCcw,
  User,
  Phone,
  Hash,
  MapPin,
  Check,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn, getApiUrl } from '@/lib/utils';

interface Building {
  id: number;
  buildingName: string;
  hasWings: boolean;
}

interface Wing {
  id: number;
  wingName: string;
}

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
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

export default function AdminAddResident() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [wings, setWings] = useState<Wing[]>([]);

  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  const [selectedBuildingData, setSelectedBuildingData] =
    useState<Building | null>(null);

  const [selectedWingId, setSelectedWingId] = useState('');
  const [flatNo, setFlatNo] = useState('');
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const [isLoadingBuildings, setIsLoadingBuildings] = useState(true);
  const [isLoadingWings, setIsLoadingWings] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [mobileExists, setMobileExists] = useState<boolean | null>(null);
  const [isCheckingMobile, setIsCheckingMobile] = useState(false);

  const [flatExists, setFlatExists] = useState<boolean | null>(null);
  const [isCheckingFlat, setIsCheckingFlat] = useState(false);

  const buildingRef = useRef<HTMLSelectElement>(null);
  const wingRef = useRef<HTMLSelectElement>(null);
  const flatRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const mobileRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLTextAreaElement>(null);

  const fetchBuildings = useCallback(async () => {
    setIsLoadingBuildings(true);

    try {
      const res = await fetch(`${getApiUrl()}/api/admin/buildings`, {
        headers: authHeaders(),
      });

      if (!res.ok) {
        throw new Error('Failed to fetch buildings');
      }

      const data: Building[] = await res.json();
      setBuildings(data);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load buildings');
    } finally {
      setIsLoadingBuildings(false);
    }
  }, []);

  useEffect(() => {
    fetchBuildings();
  }, [fetchBuildings]);

  useEffect(() => {
    if (!selectedBuildingId) {
      setWings([]);
      setSelectedWingId('');
      setSelectedBuildingData(null);
      return;
    }

    const building = buildings.find(
      (b) => b.id === parseInt(selectedBuildingId, 10)
    );

    setSelectedBuildingData(building || null);

    if (!building || !building.hasWings) {
      setWings([]);
      setSelectedWingId('');
      return;
    }

    setIsLoadingWings(true);

    fetch(
      `${getApiUrl()}/api/admin/buildings/${selectedBuildingId}/wings`,
      {
        headers: authHeaders(),
      }
    )
      .then((res) => {
        if (!res.ok) {
          throw new Error('Failed to fetch wings');
        }

        return res.json();
      })
      .then((data: Wing[]) => {
        setWings(data);
        setSelectedWingId('');
      })
      .catch((err: any) => {
        toast.error(err?.message || 'Failed to load wings');
        setWings([]);
      })
      .finally(() => {
        setIsLoadingWings(false);
      });
  }, [selectedBuildingId, buildings]);

  const checkMobile = useCallback(async (value: string) => {
    const trimmed = value.trim();

    if (trimmed.length < 3) {
      setMobileExists(null);
      return;
    }

    setIsCheckingMobile(true);

    try {
      const res = await fetch(
        `${getApiUrl()}/api/admin/residents/check-mobile/${encodeURIComponent(
          trimmed
        )}`,
        {
          headers: authHeaders(),
        }
      );

      if (!res.ok) {
        throw new Error('Check failed');
      }

      const data = await res.json();
      setMobileExists(data.exists);
    } catch {
      setMobileExists(null);
    } finally {
      setIsCheckingMobile(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedBuildingId || !flatNo.trim()) {
      setFlatExists(null);
      return;
    }

    const buildingId = parseInt(selectedBuildingId, 10);

    if (Number.isNaN(buildingId)) {
      return;
    }

    const params = new URLSearchParams({
      buildingId: String(buildingId),
      flatNo: flatNo.trim(),
    });

    if (selectedWingId) {
      params.set('wingId', selectedWingId);
    }

    setIsCheckingFlat(true);

    fetch(
      `${getApiUrl()}/api/admin/residents/check-flat?${params.toString()}`,
      {
        headers: authHeaders(),
      }
    )
      .then((res) => {
        if (!res.ok) {
          throw new Error('Check failed');
        }

        return res.json();
      })
      .then((data) => {
        setFlatExists(data.exists);
      })
      .catch(() => {
        setFlatExists(null);
      })
      .finally(() => {
        setIsCheckingFlat(false);
      });
  }, [selectedBuildingId, selectedWingId, flatNo]);

  const resetForm = useCallback(() => {
    setSelectedBuildingId('');
    setSelectedWingId('');
    setFlatNo('');
    setFullName('');
    setMobile('');
    setAddress('');
    setStatus('active');
    setMobileExists(null);
    setFlatExists(null);

    setTimeout(() => {
      buildingRef.current?.focus();
    }, 100);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBuildingId) {
      toast.error('Please select a building.');
      return;
    }

    const buildingId = parseInt(selectedBuildingId, 10);

    if (Number.isNaN(buildingId)) {
      toast.error('Invalid building selection.');
      return;
    }

    if (selectedBuildingData?.hasWings && !selectedWingId) {
      toast.error('Please select a wing.');
      return;
    }

    if (!flatNo.trim()) {
      toast.error('Flat number is required.');
      flatRef.current?.focus();
      return;
    }

    if (!fullName.trim()) {
      toast.error('Resident name is required.');
      nameRef.current?.focus();
      return;
    }

    if (!mobile.trim()) {
      toast.error('Mobile number is required.');
      mobileRef.current?.focus();
      return;
    }

    if (mobileExists === true) {
      toast.error('This mobile number is already registered.');
      return;
    }

    if (flatExists === true) {
      toast.error('Resident already exists for this flat.');
      return;
    }

    setIsSaving(true);

    try {
      const body = {
        fullName: fullName.trim(),
        mobile: mobile.trim(),
        buildingId,
        wingId: selectedWingId
          ? parseInt(selectedWingId, 10)
          : null,
        flatNo: flatNo.trim(),
        address: address.trim() || null,
        status,
      };

      const res = await fetch(
        `${getApiUrl()}/api/admin/residents`,
        {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) {
        const errData = await res
          .json()
          .catch(() => ({ error: 'Failed to save' }));

        toast.error(
          errData.error || 'Failed to add resident'
        );

        return;
      }

      toast.success('Resident added successfully.');
      resetForm();
    } catch (err: any) {
      toast.error(
        err?.message || 'Failed to add resident'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent,
    nextRef?: React.RefObject<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null
    >
  ) => {
    if (e.key === 'Enter' && nextRef?.current) {
      e.preventDefault();
      nextRef.current.focus();
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#080808] text-white pb-20">

      {/* Ambient Hero Glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-amber-500/10 blur-[140px]" />
        <div className="absolute top-[300px] -left-40 h-[400px] w-[400px] rounded-full bg-orange-500/5 blur-[120px]" />
        <div className="absolute top-[500px] -right-40 h-[400px] w-[400px] rounded-full bg-amber-400/5 blur-[120px]" />
      </div>

      {/* Hero Header */}
      <header className="relative border-b border-white/10 bg-black/40 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">

            <Link
              href="/admin"
              className="group flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/60 transition-all hover:border-amber-400/30 hover:bg-amber-400/10 hover:text-amber-300"
            >
              <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-0.5" />
            </Link>

            <div>
              <div className="mb-1 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.9)]" />
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300/80">
                  Resident Management
                </span>
              </div>

              <h1 className="bg-gradient-to-r from-amber-100 via-orange-200 to-amber-400 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
                Add Resident
              </h1>

              <p className="mt-1 text-sm text-white/45">
                Register a new resident in the society directory
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Form Card */}
        <form
          onSubmit={handleSubmit}
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8"
        >
          {/* Card top glow */}
          <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-amber-400/10 blur-[90px]" />

          <div className="relative">

            {/* Section Heading */}
            <div className="mb-7 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10">
                <User className="h-5 w-5 text-amber-300" />
              </div>

              <div>
                <h2 className="font-semibold text-white">
                  Resident Details
                </h2>
                <p className="text-xs text-white/40">
                  Enter the resident's information below
                </p>
              </div>
            </div>

            {/* Building / Wing / Flat */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">

              {/* Building */}
              <div>
                <label className="mb-2 block text-sm font-medium text-white/75">
                  Building <span className="text-amber-400">*</span>
                </label>

                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-amber-400/70" />

                  <select
                    ref={buildingRef}
                    value={selectedBuildingId}
                    onChange={(e) =>
                      setSelectedBuildingId(e.target.value)
                    }
                    disabled={isLoadingBuildings}
                    autoFocus
                    className="w-full appearance-none rounded-xl border border-white/10 bg-black/30 py-3 pl-10 pr-4 text-sm text-white outline-none transition-all focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="" className="bg-[#111]">
                      {isLoadingBuildings
                        ? 'Loading...'
                        : 'Select Building'}
                    </option>

                    {buildings.map((building) => (
                      <option
                        key={building.id}
                        value={building.id}
                        className="bg-[#111]"
                      >
                        {building.buildingName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Wing */}
              {selectedBuildingData?.hasWings && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/75">
                    Wing <span className="text-amber-400">*</span>
                  </label>

                  <select
                    ref={wingRef}
                    value={selectedWingId}
                    onChange={(e) =>
                      setSelectedWingId(e.target.value)
                    }
                    disabled={isLoadingWings}
                    className="w-full appearance-none rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition-all focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="" className="bg-[#111]">
                      {isLoadingWings
                        ? 'Loading...'
                        : 'Select Wing'}
                    </option>

                    {wings.map((wing) => (
                      <option
                        key={wing.id}
                        value={wing.id}
                        className="bg-[#111]"
                      >
                        {wing.wingName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Flat */}
              <div>
                <label className="mb-2 block text-sm font-medium text-white/75">
                  Flat Number <span className="text-amber-400">*</span>
                </label>

                <div className="relative">
                  <Hash className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-400/70" />

                  <input
                    ref={flatRef}
                    type="text"
                    value={flatNo}
                    onChange={(e) => setFlatNo(e.target.value)}
                    onKeyDown={(e) =>
                      handleKeyDown(e, nameRef)
                    }
                    placeholder="e.g. 101, A-203, G1"
                    className={cn(
                      'w-full rounded-xl border bg-black/30 py-3 pl-10 pr-10 text-sm text-white outline-none placeholder:text-white/25 transition-all',
                      flatExists === true
                        ? 'border-red-500/60 focus:ring-2 focus:ring-red-500/10'
                        : flatExists === false &&
                            flatNo.trim().length > 0
                          ? 'border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10'
                          : 'border-white/10 focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/10'
                    )}
                  />

                  {isCheckingFlat && (
                    <span className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-amber-400/20 border-t-amber-400" />
                  )}

                  {!isCheckingFlat && flatExists === true && (
                    <X className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-red-400" />
                  )}

                  {!isCheckingFlat &&
                    flatExists === false &&
                    flatNo.trim().length > 0 && (
                      <Check className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
                    )}
                </div>

                {flatExists === true && (
                  <p className="mt-1.5 text-xs text-red-400">
                    Resident already exists for this flat.
                  </p>
                )}
              </div>
            </div>

            {/* Name / Mobile */}
            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">

              {/* Name */}
              <div>
                <label className="mb-2 block text-sm font-medium text-white/75">
                  Resident Name{' '}
                  <span className="text-amber-400">*</span>
                </label>

                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-400/70" />

                  <input
                    ref={nameRef}
                    type="text"
                    value={fullName}
                    onChange={(e) =>
                      setFullName(e.target.value)
                    }
                    onKeyDown={(e) =>
                      handleKeyDown(e, mobileRef)
                    }
                    placeholder="Full name of resident"
                    className="w-full rounded-xl border border-white/10 bg-black/30 py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-white/25 transition-all focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/10"
                  />
                </div>
              </div>

              {/* Mobile */}
              <div>
                <label className="mb-2 block text-sm font-medium text-white/75">
                  Mobile Number{' '}
                  <span className="text-amber-400">*</span>
                </label>

                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-400/70" />

                  <input
                    ref={mobileRef}
                    type="tel"
                    value={mobile}
                    onChange={(e) => {
                      setMobile(e.target.value);
                      setMobileExists(null);
                    }}
                    onBlur={() => checkMobile(mobile)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addressRef.current?.focus();
                      }
                    }}
                    placeholder="Mobile number"
                    className={cn(
                      'w-full rounded-xl border bg-black/30 py-3 pl-10 pr-10 text-sm text-white outline-none placeholder:text-white/25 transition-all',
                      mobileExists === true
                        ? 'border-red-500/60 focus:ring-2 focus:ring-red-500/10'
                        : mobileExists === false &&
                            mobile.trim().length > 5
                          ? 'border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10'
                          : 'border-white/10 focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/10'
                    )}
                  />

                  {isCheckingMobile && (
                    <span className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-amber-400/20 border-t-amber-400" />
                  )}

                  {!isCheckingMobile &&
                    mobileExists === true && (
                      <X className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-red-400" />
                    )}

                  {!isCheckingMobile &&
                    mobileExists === false &&
                    mobile.trim().length > 5 && (
                      <Check className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
                    )}
                </div>

                {mobileExists === true && (
                  <p className="mt-1.5 text-xs text-red-400">
                    This mobile number is already registered.
                  </p>
                )}
              </div>
            </div>

            {/* Address */}
            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-white/75">
                Address{' '}
                <span className="text-xs text-white/35">
                  (optional)
                </span>
              </label>

              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-amber-400/70" />

                <textarea
                  ref={addressRef}
                  value={address}
                  onChange={(e) =>
                    setAddress(e.target.value)
                  }
                  rows={3}
                  placeholder="Full address (optional)"
                  className="w-full resize-none rounded-xl border border-white/10 bg-black/30 py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-white/25 transition-all focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/10"
                />
              </div>
            </div>

            {/* Status */}
            <div className="mt-6">
              <label className="mb-3 block text-sm font-medium text-white/75">
                Status
              </label>

              <div className="flex flex-wrap gap-3">

                <button
                  type="button"
                  onClick={() => setStatus('active')}
                  className={cn(
                    'flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-semibold transition-all',
                    status === 'active'
                      ? 'border-amber-400/50 bg-amber-400/10 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.08)]'
                      : 'border-white/10 bg-white/[0.03] text-white/45 hover:border-amber-400/20 hover:text-white/70'
                  )}
                >
                  <Check className="h-4 w-4" />
                  Active
                </button>

                <button
                  type="button"
                  onClick={() => setStatus('inactive')}
                  className={cn(
                    'flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-semibold transition-all',
                    status === 'inactive'
                      ? 'border-white/20 bg-white/[0.08] text-white/70'
                      : 'border-white/10 bg-white/[0.03] text-white/45 hover:border-white/20 hover:text-white/70'
                  )}
                >
                  <X className="h-4 w-4" />
                  Inactive
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="my-8 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            {/* Buttons */}
            <div className="flex flex-col gap-3 sm:flex-row">

              <button
                type="submit"
                disabled={isSaving}
                className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 px-7 py-3.5 text-sm font-bold text-black shadow-lg shadow-amber-500/10 transition-all hover:scale-[1.01] hover:shadow-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                <span className="absolute inset-0 bg-white/20 opacity-0 transition-opacity group-hover:opacity-100" />

                {isSaving ? (
                  <>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    Save Resident
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={resetForm}
                disabled={isSaving}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-7 py-3.5 text-sm font-bold text-white/70 transition-all hover:border-amber-400/20 hover:bg-amber-400/5 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
              >
                <RotateCcw className="h-5 w-5" />
                Reset
              </button>
            </div>
          </div>
        </form>

        {/* Bottom hint */}
        <div className="mt-5 flex items-center justify-center gap-2 text-center text-xs text-white/25">
          <span className="h-1 w-1 rounded-full bg-amber-400/50" />
          Fields marked with * are required
          <span className="h-1 w-1 rounded-full bg-amber-400/50" />
        </div>
      </main>
    </div>
  );
}