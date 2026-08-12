import { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'wouter';
import {
  ArrowLeft,
  Save,
  RotateCcw,
  CalendarDays,
  MapPin,
  IndianRupee,
  AlertTriangle,
  Sparkles,
  Clock3,
  CheckCircle2,
  CircleDashed,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn, getApiUrl } from '@/lib/utils';

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
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminFestivalCreate() {
  const params = useParams();
  const [, navigate] = useLocation();

  const isEditMode = !!(params as any)?.id;

  const festivalId = (params as any)?.id
    ? parseInt((params as any).id, 10)
    : null;

  // ───────────────────────────────────────────────────────────────────────────
  // Form state
  // ───────────────────────────────────────────────────────────────────────────

  const [festivalName, setFestivalName] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [expectedDonation, setExpectedDonation] = useState('');
  const [status, setStatus] = useState('upcoming');

  // ───────────────────────────────────────────────────────────────────────────
  // UI state
  // ───────────────────────────────────────────────────────────────────────────

  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ───────────────────────────────────────────────────────────────────────────
  // Fetch festival in edit mode
  // ───────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isEditMode || !festivalId) return;

    const fetchFestival = async () => {
      setIsLoading(true);

      try {
        const res = await fetch(
          `${getApiUrl()}/api/admin/festivals/${festivalId}`,
          {
            headers: authHeaders(),
          }
        );

        if (!res.ok) {
          throw new Error('Failed to fetch festival');
        }

        const data = await res.json();

        setFestivalName(data.name || '');
        setYear(String(data.year || new Date().getFullYear()));
        setStartDate(data.startDate || '');
        setEndDate(data.endDate || '');
        setDescription(data.description || '');

        setExpectedDonation(
          data.expectedDonation !== null &&
            data.expectedDonation !== undefined
            ? String(data.expectedDonation)
            : ''
        );

        setStatus(data.status || 'upcoming');
      } catch (err: any) {
        setError(err?.message || 'Failed to load festival');
        toast.error('Failed to load festival data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFestival();
  }, [isEditMode, festivalId]);

  // ───────────────────────────────────────────────────────────────────────────
  // Submit
  // ───────────────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!festivalName.trim()) {
      toast.error('Festival name is required');
      return;
    }

    if (!year.trim() || isNaN(parseInt(year, 10))) {
      toast.error('Valid year is required');
      return;
    }

    if (startDate && endDate && endDate < startDate) {
      toast.error('End date cannot be before start date');
      return;
    }

    if (
      expectedDonation &&
      (isNaN(parseFloat(expectedDonation)) ||
        parseFloat(expectedDonation) < 0)
    ) {
      toast.error('Please enter a valid donation amount');
      return;
    }

    setIsSaving(true);

    try {
      const body = {
        festivalName: festivalName.trim(),
        year: parseInt(year, 10),
        startDate: startDate || null,
        endDate: endDate || null,
        description: description.trim(),
        expectedDonation: expectedDonation
          ? parseFloat(expectedDonation)
          : null,
        status,
      };

      const url = isEditMode
        ? `${getApiUrl()}/api/admin/festivals/${festivalId}`
        : `${getApiUrl()}/api/admin/festivals`;

      const method = isEditMode ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res
          .json()
          .catch(() => ({ error: 'Failed to save festival' }));

        toast.error(errData.error || 'Failed to save festival');
        return;
      }

      toast.success(
        isEditMode
          ? 'Festival updated successfully'
          : 'Festival created successfully'
      );

      navigate('/admin/festivals');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save festival');
    } finally {
      setIsSaving(false);
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Reset
  // ───────────────────────────────────────────────────────────────────────────

  const resetForm = () => {
    if (isEditMode) return;

    setFestivalName('');
    setYear(new Date().getFullYear().toString());
    setStartDate('');
    setEndDate('');
    setDescription('');
    setExpectedDonation('');
    setStatus('upcoming');
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Loading state
  // ───────────────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-5">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-[#D4AF37] animate-pulse" />
            </div>

            <div className="absolute -inset-1 rounded-2xl border-2 border-[#D4AF37]/20 border-t-[#D4AF37] animate-spin" />
          </div>

          <p className="text-sm font-medium text-white/50">
            Loading festival...
          </p>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Error state
  // ───────────────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="rounded-3xl border border-[#D4AF37]/20 bg-[#0d0d0d] shadow-2xl p-8 text-center">
            <div className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-[#D4AF37]" />
            </div>

            <h2 className="text-xl font-bold text-white mb-2">
              Something went wrong
            </h2>

            <p className="text-sm text-white/50 mb-6">
              {error}
            </p>

            <Link
              href="/admin/festivals"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#D4AF37] text-black font-bold hover:bg-[#E5C158] transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Festivals
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Main UI
  // ───────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#050505] text-white pb-20 overflow-hidden">

      {/* ─────────────────────────────────────────────────────────────────────
          Decorative Background
      ───────────────────────────────────────────────────────────────────── */}

      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-[#D4AF37]/10 blur-[120px]" />

        <div className="absolute top-[40%] -left-52 w-[450px] h-[450px] rounded-full bg-[#D4AF37]/5 blur-[120px]" />

        <div className="absolute -bottom-40 right-[20%] w-[400px] h-[400px] rounded-full bg-[#B8860B]/5 blur-[120px]" />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.04),transparent_35%)]" />
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          Header
      ───────────────────────────────────────────────────────────────────── */}

      <header className="relative border-b border-white/[0.08] bg-[#080808]/90 backdrop-blur-2xl">
        <div className="container mx-auto max-w-5xl px-4 py-6 md:py-8">

          <div className="flex items-center justify-between gap-4">

            <div className="flex items-center gap-4">

              <Link
                href="/admin/festivals"
                className="group w-11 h-11 rounded-xl border border-white/10 bg-white/[0.03] flex items-center justify-center hover:bg-[#D4AF37] hover:text-black hover:border-[#D4AF37] transition-all shadow-lg"
              >
                <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" />
              </Link>

              <div>
                <div className="flex items-center gap-2 mb-1">

                  <div className="w-7 h-7 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                  </div>

                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#D4AF37]">
                    Festival Management
                  </span>

                </div>

                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                  {isEditMode ? 'Edit Festival' : 'Create Festival'}
                </h1>

                <p className="text-sm text-white/40 mt-1">
                  {isEditMode
                    ? 'Update the festival information below'
                    : 'Add a new festival to Meditiya Sathi'}
                </p>
              </div>
            </div>

            {/* Mode badge */}

            <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/5">
              <span className="w-2 h-2 rounded-full bg-[#D4AF37] shadow-[0_0_8px_rgba(212,175,55,0.8)]" />

              <span className="text-xs font-semibold text-[#D4AF37]">
                {isEditMode ? 'Editing' : 'New Festival'}
              </span>
            </div>

          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────────────
          Main
      ───────────────────────────────────────────────────────────────────── */}

      <main className="relative container mx-auto max-w-5xl px-4 py-8 md:py-10">

        <form onSubmit={handleSubmit}>

          {/* Main card */}

          <div className="rounded-3xl border border-[#D4AF37]/20 bg-[#0b0b0b]/90 backdrop-blur-2xl shadow-[0_25px_80px_rgba(0,0,0,0.6)] overflow-hidden">

            {/* Card heading */}

            <div className="px-6 md:px-8 py-6 border-b border-white/[0.07] bg-gradient-to-r from-[#D4AF37]/10 via-transparent to-transparent">

              <div className="flex items-center gap-3">

                <div className="w-11 h-11 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[#D4AF37]" />
                </div>

                <div>
                  <h2 className="font-bold text-white">
                    Festival Information
                  </h2>

                  <p className="text-xs text-white/40">
                    Enter the basic details of the festival
                  </p>
                </div>

              </div>
            </div>

            {/* Form body */}

            <div className="p-6 md:p-8 space-y-8">

              {/* ───────────────────────────────────────────────────────────
                  Festival Name + Year
              ─────────────────────────────────────────────────────────── */}

              <section>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-5">

                  {/* Festival Name */}

                  <div className="space-y-2">

                    <label className="text-sm font-semibold text-white">
                      Festival Name
                      <span className="text-[#D4AF37] ml-1">*</span>
                    </label>

                    <div className="relative group">

                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 group-focus-within:text-[#D4AF37] transition-colors pointer-events-none" />

                      <input
                        type="text"
                        value={festivalName}
                        onChange={(e) => setFestivalName(e.target.value)}
                        placeholder="e.g. Ganeshotsav"
                        autoFocus
                        className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-white/10 bg-white/[0.03] text-white placeholder:text-white/25 outline-none transition-all focus:ring-4 focus:ring-[#D4AF37]/10 focus:border-[#D4AF37] hover:border-[#D4AF37]/40"
                      />

                    </div>

                    <p className="text-xs text-white/30">
                      Enter the name residents will see throughout the portal.
                    </p>

                  </div>

                  {/* Year */}

                  <div className="space-y-2">

                    <label className="text-sm font-semibold text-white">
                      Year
                      <span className="text-[#D4AF37] ml-1">*</span>
                    </label>

                    <input
                      type="number"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      min={2020}
                      max={2100}
                      className="w-full px-4 py-3.5 rounded-xl border border-white/10 bg-white/[0.03] text-white outline-none transition-all focus:ring-4 focus:ring-[#D4AF37]/10 focus:border-[#D4AF37] hover:border-[#D4AF37]/40"
                    />

                    <p className="text-xs text-white/30">
                      Festival year
                    </p>

                  </div>

                </div>
              </section>

              {/* ───────────────────────────────────────────────────────────
                  Dates
              ─────────────────────────────────────────────────────────── */}

              <section className="pt-7 border-t border-white/[0.07]">

                <div className="flex items-center gap-3 mb-5">

                  <div className="w-9 h-9 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center">
                    <CalendarDays className="w-4 h-4 text-[#D4AF37]" />
                  </div>

                  <div>
                    <h3 className="font-semibold text-white">
                      Festival Dates
                    </h3>

                    <p className="text-xs text-white/40">
                      When will the festival take place?
                    </p>
                  </div>

                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                  {/* Start */}

                  <div className="space-y-2">

                    <label className="text-sm font-semibold text-white">
                      Start Date
                    </label>

                    <div className="relative group">

                      <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 group-focus-within:text-[#D4AF37] transition-colors pointer-events-none" />

                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-white/10 bg-white/[0.03] text-white outline-none transition-all focus:ring-4 focus:ring-[#D4AF37]/10 focus:border-[#D4AF37] hover:border-[#D4AF37]/40 [color-scheme:dark]"
                      />

                    </div>

                  </div>

                  {/* End */}

                  <div className="space-y-2">

                    <label className="text-sm font-semibold text-white">
                      End Date
                    </label>

                    <div className="relative group">

                      <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 group-focus-within:text-[#D4AF37] transition-colors pointer-events-none" />

                      <input
                        type="date"
                        value={endDate}
                        min={startDate || undefined}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-white/10 bg-white/[0.03] text-white outline-none transition-all focus:ring-4 focus:ring-[#D4AF37]/10 focus:border-[#D4AF37] hover:border-[#D4AF37]/40 [color-scheme:dark]"
                      />

                    </div>

                  </div>

                </div>
              </section>

              {/* ───────────────────────────────────────────────────────────
                  Description
              ─────────────────────────────────────────────────────────── */}

              <section className="pt-7 border-t border-white/[0.07]">

                <div className="flex items-center gap-3 mb-5">

                  <div className="w-9 h-9 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-[#D4AF37]" />
                  </div>

                  <div>
                    <h3 className="font-semibold text-white">
                      Description
                    </h3>

                    <p className="text-xs text-white/40">
                      Add some information about the festival
                    </p>
                  </div>

                </div>

                <div className="space-y-2">

                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    maxLength={1000}
                    placeholder="Briefly describe the festival, celebrations, activities, or any other important information..."
                    className="w-full px-4 py-3.5 rounded-xl border border-white/10 bg-white/[0.03] text-white placeholder:text-white/25 outline-none transition-all focus:ring-4 focus:ring-[#D4AF37]/10 focus:border-[#D4AF37] hover:border-[#D4AF37]/40 resize-none"
                  />

                  <div className="flex justify-end">
                    <span className="text-xs text-white/30">
                      {description.length}/1000
                    </span>
                  </div>

                </div>
              </section>

              {/* ───────────────────────────────────────────────────────────
                  Donation + Status
              ─────────────────────────────────────────────────────────── */}

              <section className="pt-7 border-t border-white/[0.07]">

                <div className="flex items-center gap-3 mb-5">

                  <div className="w-9 h-9 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center">
                    <IndianRupee className="w-4 h-4 text-[#D4AF37]" />
                  </div>

                  <div>
                    <h3 className="font-semibold text-white">
                      Donation & Status
                    </h3>

                    <p className="text-xs text-white/40">
                      Set the expected donation and festival status
                    </p>
                  </div>

                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                  {/* Donation */}

                  <div className="space-y-2">

                    <label className="text-sm font-semibold text-white">
                      Expected Donation Amount
                      <span className="ml-2 text-xs font-normal text-white/30">
                        Optional
                      </span>
                    </label>

                    <div className="relative group">

                      <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 group-focus-within:text-[#D4AF37] transition-colors pointer-events-none" />

                      <input
                        type="number"
                        value={expectedDonation}
                        onChange={(e) => setExpectedDonation(e.target.value)}
                        min={0}
                        step={0.01}
                        placeholder="e.g. 500000"
                        className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-white/10 bg-white/[0.03] text-white placeholder:text-white/25 outline-none transition-all focus:ring-4 focus:ring-[#D4AF37]/10 focus:border-[#D4AF37] hover:border-[#D4AF37]/40"
                      />

                    </div>

                    <p className="text-xs text-white/30">
                      Total target amount for this festival.
                    </p>

                  </div>

                  {/* Status */}

                  <div className="space-y-3">

                    <label className="text-sm font-semibold text-white">
                      Festival Status
                    </label>

                    <div className="grid grid-cols-3 gap-2">

                      {/* Upcoming */}

                      <button
                        type="button"
                        onClick={() => setStatus('upcoming')}
                        className={cn(
                          'relative flex flex-col items-center justify-center gap-2 px-3 py-3.5 rounded-xl border-2 transition-all',
                          status === 'upcoming'
                            ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.08)]'
                            : 'border-white/10 bg-white/[0.02] text-white/40 hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/5'
                        )}
                      >
                        <Clock3 className="w-5 h-5" />

                        <span className="text-xs font-bold">
                          Upcoming
                        </span>

                        {status === 'upcoming' && (
                          <span className="absolute top-1.5 right-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#D4AF37]" />
                          </span>
                        )}
                      </button>

                      {/* Active */}

                      <button
                        type="button"
                        onClick={() => setStatus('active')}
                        className={cn(
                          'relative flex flex-col items-center justify-center gap-2 px-3 py-3.5 rounded-xl border-2 transition-all',
                          status === 'active'
                            ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.08)]'
                            : 'border-white/10 bg-white/[0.02] text-white/40 hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/5'
                        )}
                      >
                        <CheckCircle2 className="w-5 h-5" />

                        <span className="text-xs font-bold">
                          Active
                        </span>

                        {status === 'active' && (
                          <span className="absolute top-1.5 right-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#D4AF37]" />
                          </span>
                        )}
                      </button>

                      {/* Completed */}

                      <button
                        type="button"
                        onClick={() => setStatus('completed')}
                        className={cn(
                          'relative flex flex-col items-center justify-center gap-2 px-3 py-3.5 rounded-xl border-2 transition-all',
                          status === 'completed'
                            ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.08)]'
                            : 'border-white/10 bg-white/[0.02] text-white/40 hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/5'
                        )}
                      >
                        <CircleDashed className="w-5 h-5" />

                        <span className="text-xs font-bold">
                          Completed
                        </span>

                        {status === 'completed' && (
                          <span className="absolute top-1.5 right-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#D4AF37]" />
                          </span>
                        )}
                      </button>

                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* ─────────────────────────────────────────────────────────────
                Footer
            ───────────────────────────────────────────────────────────── */}

            <div className="px-6 md:px-8 py-5 border-t border-white/[0.07] bg-white/[0.015]">

              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">

                <Link
                  href="/admin/festivals"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-white/10 bg-white/[0.03] text-white/80 font-semibold hover:bg-white/[0.07] hover:border-[#D4AF37]/30 hover:text-white transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Cancel
                </Link>

                <div className="flex flex-col sm:flex-row gap-3">

                  {!isEditMode && (
                    <button
                      type="button"
                      onClick={resetForm}
                      disabled={isSaving}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-white/10 bg-white/[0.03] text-white/80 font-semibold hover:bg-white/[0.07] hover:border-[#D4AF37]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Reset
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl bg-[#D4AF37] text-black font-extrabold shadow-[0_8px_30px_rgba(212,175,55,0.18)] hover:bg-[#E5C158] hover:shadow-[0_10px_35px_rgba(212,175,55,0.25)] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSaving ? (
                      <>
                        <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        {isEditMode
                          ? 'Update Festival'
                          : 'Create Festival'}
                      </>
                    )}
                  </button>

                </div>
              </div>
            </div>
          </div>

          {/* Bottom hint */}

          <div className="flex items-center justify-center gap-2 mt-5 text-xs text-white/30">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] shadow-[0_0_6px_rgba(212,175,55,0.8)]" />
            Your festival information is securely saved to the database.
          </div>

        </form>
      </main>
    </div>
  );
}