import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Building2, Save, RotateCcw, Shield, User, Phone, Hash, MapPin, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Building {
  id: number;
  buildingName: string;
  hasWings: boolean;
}

interface Wing {
  id: number;
  wingName: string;
}

// ── Helper: get admin auth token from localStorage ──────────────────────────

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

// ── Default export ──────────────────────────────────────────────────────────

export default function AdminAddResident() {
  // Form state
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [wings, setWings] = useState<Wing[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');
  const [selectedBuildingData, setSelectedBuildingData] = useState<Building | null>(null);
  const [selectedWingId, setSelectedWingId] = useState<string>('');
  const [flatNo, setFlatNo] = useState('');
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  // UI state
  const [isLoadingBuildings, setIsLoadingBuildings] = useState(true);
  const [isLoadingWings, setIsLoadingWings] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [mobileExists, setMobileExists] = useState<boolean | null>(null);
  const [isCheckingMobile, setIsCheckingMobile] = useState(false);
  const [flatExists, setFlatExists] = useState<boolean | null>(null);
  const [isCheckingFlat, setIsCheckingFlat] = useState(false);

  // Refs for auto-focus
  const buildingRef = useRef<HTMLButtonElement>(null);
  const wingRef = useRef<HTMLButtonElement>(null);
  const flatRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const mobileRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLTextAreaElement>(null);

  // ── Fetch buildings on mount ─────────────────────────────────────────────

  const fetchBuildings = useCallback(async () => {
    setIsLoadingBuildings(true);
    try {
      const res = await fetch('/api/admin/buildings', { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch buildings');
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

  // ── Fetch wings when building changes ────────────────────────────────────

  useEffect(() => {
    if (!selectedBuildingId) {
      setWings([]);
      setSelectedWingId('');
      setSelectedBuildingData(null);
      return;
    }

    const building = buildings.find(b => b.id === parseInt(selectedBuildingId, 10));
    setSelectedBuildingData(building || null);

    if (!building || !building.hasWings) {
      setWings([]);
      setSelectedWingId('');
      return;
    }

    setIsLoadingWings(true);
    fetch(`/api/admin/buildings/${selectedBuildingId}/wings`, { headers: authHeaders() })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch wings');
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
      .finally(() => setIsLoadingWings(false));
  }, [selectedBuildingId, buildings]);

  // ── Check mobile uniqueness on blur ──────────────────────────────────────

  const checkMobile = useCallback(async (val: string) => {
    const trimmed = val.trim();
    if (trimmed.length < 3) {
      setMobileExists(null);
      return;
    }
    setIsCheckingMobile(true);
    try {
      const res = await fetch(`/api/admin/residents/check-mobile/${encodeURIComponent(trimmed)}`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Check failed');
      const data = await res.json();
      setMobileExists(data.exists);
    } catch {
      setMobileExists(null);
    } finally {
      setIsCheckingMobile(false);
    }
  }, []);

  // ── Check flat uniqueness when building/wing/flat changes ────────────────

  useEffect(() => {
    if (!selectedBuildingId || !flatNo.trim()) {
      setFlatExists(null);
      return;
    }
    const buildingId = parseInt(selectedBuildingId, 10);
    if (isNaN(buildingId)) return;

    const params = new URLSearchParams({ buildingId: String(buildingId), flatNo: flatNo.trim() });
    if (selectedWingId) params.set('wingId', selectedWingId);

    setIsCheckingFlat(true);
    fetch(`/api/admin/residents/check-flat?${params.toString()}`, { headers: authHeaders() })
      .then(res => {
        if (!res.ok) throw new Error('Check failed');
        return res.json();
      })
      .then((data) => setFlatExists(data.exists))
      .catch(() => setFlatExists(null))
      .finally(() => setIsCheckingFlat(false));
  }, [selectedBuildingId, selectedWingId, flatNo]);

  // ── Reset form ───────────────────────────────────────────────────────────

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
    // Focus back on building dropdown
    setTimeout(() => buildingRef.current?.focus(), 100);
  }, []);

  // ── Handle form submit ───────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation
    if (!selectedBuildingId) {
      toast.error('Please select a building.');
      return;
    }

    const buildingId = parseInt(selectedBuildingId, 10);
    if (isNaN(buildingId)) {
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

    // Check duplicates
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
        wingId: selectedWingId ? parseInt(selectedWingId, 10) : null,
        flatNo: flatNo.trim(),
        address: address.trim() || null,
        status,
      };

      const res = await fetch('/api/admin/residents', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Failed to save' }));
        toast.error(errData.error || 'Failed to add resident');
        return;
      }

      toast.success('Resident added successfully.');
      resetForm();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to add resident');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Enter key navigation ─────────────────────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent, nextRef?: React.RefObject<HTMLInputElement | HTMLTextAreaElement | HTMLButtonElement | null>) => {
    if (e.key === 'Enter' && nextRef?.current) {
      e.preventDefault();
      nextRef.current.focus();
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="w-full min-h-screen bg-muted/10 pb-20">
      {/* Header */}
      <div className="bg-secondary text-secondary-foreground py-8 px-4 border-b border-border shadow-sm">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-serif font-bold text-white">Add Resident</h1>
              <p className="text-white/70">Register a new resident in the society directory</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="container mx-auto max-w-4xl px-4 py-10">
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl shadow-sm p-6 md:p-10">
          {/* Row 1: Building, Wing, Flat No */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Building */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Building <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <select
                  value={selectedBuildingId}
                  onChange={(e) => setSelectedBuildingId(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all appearance-none cursor-pointer"
                  disabled={isLoadingBuildings}
                  ref={buildingRef as any}
                  autoFocus
                >
                  <option value="">
                    {isLoadingBuildings ? 'Loading...' : 'Select Building'}
                  </option>
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.buildingName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Wing (conditional) */}
            {selectedBuildingData?.hasWings && (
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Wing <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedWingId}
                    onChange={(e) => setSelectedWingId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all appearance-none cursor-pointer"
                    disabled={isLoadingWings}
                    ref={wingRef as any}
                  >
                    <option value="">
                      {isLoadingWings ? 'Loading...' : 'Select Wing'}
                    </option>
                    {wings.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.wingName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Flat No */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Flat Number <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  ref={flatRef}
                  type="text"
                  value={flatNo}
                  onChange={(e) => setFlatNo(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, nameRef)}
                  placeholder="e.g. 101, A-203, G1"
                  className={cn(
                    "w-full pl-10 pr-4 py-3 rounded-xl border bg-background text-foreground focus:ring-2 focus:border-primary outline-none transition-all",
                    flatExists === true
                      ? "border-destructive focus:ring-destructive"
                      : flatExists === false && flatNo.trim().length > 0
                        ? "border-emerald-500 focus:ring-emerald-500"
                        : "border-border focus:ring-primary"
                  )}
                />
                {flatExists === true && (
                  <X className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive" />
                )}
                {flatExists === false && flatNo.trim().length > 0 && (
                  <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                )}
              </div>
              {flatExists === true && (
                <p className="text-xs text-destructive mt-1">Resident already exists for this flat.</p>
              )}
            </div>
          </div>

          {/* Row 2: Full Name, Mobile */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Resident Name <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  ref={nameRef}
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, mobileRef)}
                  placeholder="Full name of resident"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                />
              </div>
            </div>

            {/* Mobile */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Mobile Number <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  ref={mobileRef}
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  onBlur={() => checkMobile(mobile)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addressRef.current?.focus();
                    }
                  }}
                  placeholder="Mobile number"
                  className={cn(
                    "w-full pl-10 pr-4 py-3 rounded-xl border bg-background text-foreground focus:ring-2 focus:border-primary outline-none transition-all",
                    mobileExists === true
                      ? "border-destructive focus:ring-destructive"
                      : mobileExists === false && mobile.trim().length > 5
                        ? "border-emerald-500 focus:ring-emerald-500"
                        : "border-border focus:ring-primary"
                  )}
                />
                {isCheckingMobile && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                )}
                {!isCheckingMobile && mobileExists === true && (
                  <X className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive" />
                )}
                {!isCheckingMobile && mobileExists === false && mobile.trim().length > 5 && (
                  <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                )}
              </div>
              {mobileExists === true && (
                <p className="text-xs text-destructive mt-1">This mobile number is already registered.</p>
              )}
            </div>
          </div>

          {/* Row 3: Address */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-foreground mb-1.5">
              Address <span className="text-muted-foreground text-xs">(optional)</span>
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground pointer-events-none" />
              <textarea
                ref={addressRef}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                placeholder="Full address (optional)"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all resize-none"
              />
            </div>
          </div>

          {/* Row 3b: Status */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-foreground mb-1.5">Status</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStatus('active')}
                className={cn(
                  "px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border-2",
                  status === 'active'
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                    : "border-border bg-background text-muted-foreground hover:border-muted-foreground/30"
                )}
              >
                <Check className="w-3.5 h-3.5 inline mr-1.5" />
                Active
              </button>
              <button
                type="button"
                onClick={() => setStatus('inactive')}
                className={cn(
                  "px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border-2",
                  status === 'inactive'
                    ? "border-slate-400 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400"
                    : "border-border bg-background text-muted-foreground hover:border-muted-foreground/30"
                )}
              >
                <X className="w-3.5 h-3.5 inline mr-1.5" />
                Inactive
              </button>
            </div>
          </div>

          {/* Row 4: Save & Reset buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-border">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto px-8 py-3.5 bg-primary text-primary-foreground rounded-xl font-bold text-lg hover:bg-primary/90 transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" /> Save Resident
                </>
              )}
            </button>
            <button
              type="button"
              onClick={resetForm}
              disabled={isSaving}
              className="w-full sm:w-auto px-8 py-3.5 border border-border text-foreground rounded-xl font-bold text-lg hover:bg-muted/50 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" /> Reset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

