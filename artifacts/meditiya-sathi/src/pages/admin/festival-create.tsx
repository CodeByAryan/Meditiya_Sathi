import { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation, Link } from 'wouter';
import { ArrowLeft, Save, RotateCcw, CalendarDays, MapPin, IndianRupee, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ── Auth helpers ─────────────────────────────────────────────────────────────
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

// ── Component ────────────────────────────────────────────────────────────────
export default function AdminFestivalCreate() {
  const params = useParams();
  const [, navigate] = useLocation();
  const isEditMode = !!(params as any)?.id;
  const festivalId = (params as any)?.id ? parseInt((params as any).id, 10) : null;

  // Form state
  const [festivalName, setFestivalName] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [expectedDonation, setExpectedDonation] = useState('');
  const [status, setStatus] = useState('upcoming');

  // UI state
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch festival data for edit mode
  useEffect(() => {
    if (!isEditMode || !festivalId) return;

    const fetchFestival = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/admin/festivals/${festivalId}`, { headers: authHeaders() });
        if (!res.ok) throw new Error('Failed to fetch festival');
        const data = await res.json();
        setFestivalName(data.name);
        setYear(String(data.year));
        setStartDate(data.startDate || '');
        setEndDate(data.endDate || '');
        setDescription(data.description || '');
        setExpectedDonation(data.expectedDonation ? String(data.expectedDonation) : '');
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

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!festivalName.trim()) {
      toast.error('Festival name is required');
      return;
    }
    if (!year.trim() || isNaN(parseInt(year, 10))) {
      toast.error('Valid year is required');
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
        expectedDonation: expectedDonation ? parseFloat(expectedDonation) : null,
        status,
      };

      const url = isEditMode
        ? `/api/admin/festivals/${festivalId}`
        : '/api/admin/festivals';
      const method = isEditMode ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Failed to save' }));
        toast.error(errData.error || 'Failed to save festival');
        return;
      }

      toast.success(isEditMode ? 'Festival updated successfully' : 'Festival created successfully');
      navigate('/admin/festivals');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save festival');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset form
  const resetForm = () => {
    if (isEditMode) return; // Don't reset in edit mode
    setFestivalName('');
    setYear(new Date().getFullYear().toString());
    setStartDate('');
    setEndDate('');
    setDescription('');
    setExpectedDonation('');
    setStatus('upcoming');
  };

  if (isLoading) {
    return (
      <div className="w-full min-h-screen bg-muted/10 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full min-h-screen bg-muted/10 flex flex-col items-center justify-center gap-4">
        <AlertTriangle className="w-10 h-10 text-destructive" />
        <p className="text-destructive font-semibold">{error}</p>
        <Link href="/admin/festivals" className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold">
          Back to Festivals
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-muted/10 pb-20">
      {/* Header */}
      <div className="bg-secondary text-secondary-foreground py-8 px-4 border-b border-border shadow-sm">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center gap-4">
            <Link href="/admin/festivals" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-serif font-bold text-white">
                {isEditMode ? 'Edit Festival' : 'Create Festival'}
              </h1>
              <p className="text-white/70">
                {isEditMode ? 'Update festival details' : 'Add a new society festival'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="container mx-auto max-w-4xl px-4 py-10">
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl shadow-sm p-6 md:p-10">
          {/* Row 1: Festival Name & Year */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Festival Name <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={festivalName}
                  onChange={e => setFestivalName(e.target.value)}
                  placeholder="e.g. Navratri, Ganeshotsav, Diwali"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                  autoFocus
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Year <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                value={year}
                onChange={e => setYear(e.target.value)}
                min={2020}
                max={2100}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
              />
            </div>
          </div>

          {/* Row 2: Start & End Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Start Date</label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">End Date</label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Row 3: Description */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-foreground mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Brief description of the festival..."
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all resize-none"
            />
          </div>

          {/* Row 4: Expected Donation & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Expected Donation Amount <span className="text-muted-foreground text-xs">(optional)</span>
              </label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type="number"
                  value={expectedDonation}
                  onChange={e => setExpectedDonation(e.target.value)}
                  min={0}
                  step={0.01}
                  placeholder="e.g. 500000"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Status</label>
              <div className="flex items-center gap-2 pt-1">
                {['upcoming', 'active', 'completed'].map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={cn(
                      "px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border-2 capitalize",
                      status === s
                        ? s === 'upcoming'
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400"
                          : s === 'active'
                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                            : "border-slate-400 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400"
                        : "border-border bg-background text-muted-foreground hover:border-muted-foreground/30"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Row 5: Save & Reset */}
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
                  <Save className="w-5 h-5" /> {isEditMode ? 'Update Festival' : 'Create Festival'}
                </>
              )}
            </button>
            {!isEditMode && (
              <button
                type="button"
                onClick={resetForm}
                disabled={isSaving}
                className="w-full sm:w-auto px-8 py-3.5 border border-border text-foreground rounded-xl font-bold text-lg hover:bg-muted/50 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-5 h-5" /> Reset
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

