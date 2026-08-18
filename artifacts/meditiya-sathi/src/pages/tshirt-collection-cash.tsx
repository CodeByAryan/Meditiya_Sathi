import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Shirt,
  Search,
  CheckCircle,
  Clock,
  User,
  Phone,
  Building2,
  Ruler,
  AlertTriangle,
  QrCode,
  Check,
  Copy,
  RefreshCw,
  Sparkles,
  Camera,
  X,
  CreditCard,
  Banknote,
  Wallet,
  ShieldCheck,
  PackageCheck,
  IndianRupee,
} from "lucide-react";
import { toast } from "sonner";
import { Html5Qrcode } from "html5-qrcode";
import { cn, getApiUrl } from "@/lib/utils";
import { useAdminAuth } from "@/lib/AdminAuthContext";

// ── Types ────────────────────────────────────────────────────────────────────

interface CollectionRecord {
  id: number;
  collectionId: string | null;
  collectionStatus: string;
  collectedAt: string | null;
  collectedByAdminId: string | null;
  collectedByName: string | null;
  collectionNotes: string | null;
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
  createdAt: string;
  updatedAt: string;
}

// ── Auth helpers ─────────────────────────────────────────────────────────────

function getAdminToken(): string | null {
  try {
    const stored = localStorage.getItem("admin_auth");
    if (!stored) return null;
    return JSON.parse(stored)?.token || null;
  } catch {
    return null;
  }
}

function authHeaders(): Record<string, string> {
  const token = getAdminToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}

function formatCurrency(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function extractTshirtId(raw: string): string {
  const trimmed = raw.trim();
  const match = trimmed.match(/TSH-\d{4}-\d+/i);
  if (match) return match[0].toUpperCase();
  // Strip URL if full path was pasted
  if (trimmed.includes("/tshirt-collection-cash/")) {
    const parts = trimmed.split("/tshirt-collection-cash/");
    const last = parts[parts.length - 1].split("?")[0].split("#")[0].trim();
    if (last) return last.toUpperCase();
  }
  return trimmed;
}

export default function TshirtCollectionCash() {
  const [, setLocation] = useLocation();
  const [matchCash, paramsCash] = useRoute("/tshirt-collection-cash/:tshirtId");
  const [matchAdmin, paramsAdmin] = useRoute("/admin/tshirt-collection/:tshirtId");
  const [matchAdminCash, paramsAdminCash] = useRoute("/admin/tshirt-collection-cash/:tshirtId");

  const routeTshirtId = paramsCash?.tshirtId || paramsAdmin?.tshirtId || paramsAdminCash?.tshirtId || "";

  const [tshirtIdInput, setTshirtIdInput] = useState(routeTshirtId);
  const [activeTshirtId, setActiveTshirtId] = useState(routeTshirtId);

  const [registration, setRegistration] = useState<CollectionRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isCollecting, setIsCollecting] = useState(false);
  const [collectionNotes, setCollectionNotes] = useState("");
  const [markPaymentPaid, setMarkPaymentPaid] = useState(true);
  const [copied, setCopied] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [collectionSuccess, setCollectionSuccess] = useState(false);

  const { user } = useAdminAuth();

  // Sync route param with activeTshirtId
  useEffect(() => {
    if (routeTshirtId) {
      setTshirtIdInput(routeTshirtId);
      setActiveTshirtId(routeTshirtId);
    }
  }, [routeTshirtId]);

  // Fetch registration details
  const fetchRegistration = useCallback(async (idToFetch: string) => {
    const cleanId = extractTshirtId(idToFetch);
    if (!cleanId) return;

    setIsLoading(true);
    setError(null);
    setCollectionSuccess(false);

    try {
      const res = await fetch(
        `${getApiUrl()}/api/admin/tshirt-collection/${encodeURIComponent(cleanId)}`,
        { headers: authHeaders() }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 404) {
          setError(`No T-shirt registration found for "${cleanId}". Please check the ID or scan another QR code.`);
        } else {
          setError(data.error || "Failed to load T-shirt details");
        }
        setRegistration(null);
        return;
      }

      const data: CollectionRecord = await res.json();
      setRegistration(data);
      setMarkPaymentPaid(data.paymentMode === "pending");
    } catch (err: any) {
      setError(err?.message || "Failed to connect to server");
      setRegistration(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTshirtId) {
      fetchRegistration(activeTshirtId);
    }
  }, [activeTshirtId, fetchRegistration]);

  const handleLookup = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = extractTshirtId(tshirtIdInput);
    if (!clean) {
      toast.error("Please enter a valid T-shirt ID");
      return;
    }
    setLocation(`/tshirt-collection-cash/${clean}`);
  };

  const handleCopyId = () => {
    if (!registration?.collectionId) return;
    navigator.clipboard.writeText(registration.collectionId);
    setCopied(true);
    toast.success("T-Shirt ID copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmCollection = async () => {
    if (!registration || !registration.collectionId) return;

    setIsCollecting(true);
    try {
      const res = await fetch(
        `${getApiUrl()}/api/admin/tshirt-collection/${encodeURIComponent(registration.collectionId)}/collect`,
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            collectionNotes: collectionNotes.trim() || null,
            markPaymentPaid: registration.paymentMode === "pending" && markPaymentPaid,
            paymentMode: registration.paymentMode === "pending" && markPaymentPaid ? "cash" : undefined,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          toast.error("This T-Shirt has already been collected!");
          // Refresh details to show latest collection info
          fetchRegistration(registration.collectionId);
        } else {
          toast.error(data.error || "Failed to confirm collection");
        }
        return;
      }

      toast.success("🎉 T-Shirt distribution confirmed successfully!");
      setCollectionSuccess(true);
      // Refresh current registration
      await fetchRegistration(registration.collectionId);
    } catch (err: any) {
      toast.error(err?.message || "Error processing collection");
    } finally {
      setIsCollecting(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[var(--page-bg)] text-foreground pb-24">
      {/* Top Header */}
      <div className="bg-secondary text-secondary-foreground py-6 px-4 border-b border-border shadow-md">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                href="/admin/tshirt-registrations"
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Back to Registrations"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <p className="text-xs uppercase tracking-widest text-amber-300 font-semibold">
                    Distribution & Cash Collection
                  </p>
                </div>
                <h1 className="text-2xl font-serif font-bold text-white flex items-center gap-2 mt-0.5">
                  <Shirt className="w-6 h-6 text-primary" /> T-Shirt Cash Scanner
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setScannerOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs sm:text-sm hover:bg-primary/90 transition-all shadow-md"
              >
                <Camera className="w-4 h-4" />
                <span className="hidden sm:inline">Scan QR</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-4 py-6">
        {/* Search / Lookup Bar */}
        <div className="glass-card-glow rounded-2xl p-4 mb-6 border border-border">
          <form onSubmit={handleLookup} className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={tshirtIdInput}
                onChange={(e) => setTshirtIdInput(e.target.value)}
                placeholder="Enter T-Shirt ID (e.g. TSH-2026-0044) or scan QR"
                className="w-full pl-10 pr-10 py-3 text-sm font-mono rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary outline-none"
              />
              {tshirtIdInput && (
                <button
                  type="button"
                  onClick={() => {
                    setTshirtIdInput("");
                    setRegistration(null);
                    setError(null);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isLoading || !tshirtIdInput.trim()}
                className="flex-1 sm:flex-none px-6 py-3 bg-primary text-primary-foreground font-bold text-sm rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                <span>Verify ID</span>
              </button>
              <button
                type="button"
                onClick={() => setScannerOpen(true)}
                className="px-4 py-3 border border-border rounded-xl hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground flex items-center justify-center"
                title="Open Camera Scanner"
              >
                <QrCode className="w-5 h-5 text-primary" />
              </button>
            </div>
          </form>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4" />
            <p className="text-base font-semibold text-foreground">Loading T-Shirt Details...</p>
            <p className="text-xs text-muted-foreground mt-1 font-mono">{activeTshirtId}</p>
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center mb-6 shadow-sm"
          >
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-3 opacity-90" />
            <h2 className="text-lg font-bold text-foreground mb-1">Registration Not Found</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-5">{error}</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setScannerOpen(true)}
                className="px-5 py-2.5 bg-primary text-primary-foreground font-semibold text-sm rounded-xl hover:bg-primary/90 transition-all flex items-center gap-2"
              >
                <Camera className="w-4 h-4" /> Scan Another QR
              </button>
              <Link
                href="/admin/tshirt-registrations"
                className="px-5 py-2.5 border border-border text-foreground font-semibold text-sm rounded-xl hover:bg-muted/50 transition-all"
              >
                View All Registrations
              </Link>
            </div>
          </motion.div>
        )}

        {/* Empty Search State (No ID provided yet) */}
        {!isLoading && !error && !registration && (
          <div className="glass-card-glow rounded-2xl p-8 sm:p-12 text-center border border-dashed border-border mb-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
              <QrCode className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold font-serif text-foreground mb-2">
              Ready to Scan or Verify T-Shirts
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              Scan a resident's T-shirt collection QR code or type their T-shirt ID (e.g.{" "}
              <span className="font-mono text-primary font-semibold">TSH-2026-0044</span>) to verify details and collect cash.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setScannerOpen(true)}
                className="px-6 py-3 bg-primary text-primary-foreground font-bold text-sm rounded-xl hover:bg-primary/90 transition-all shadow-md flex items-center gap-2"
              >
                <Camera className="w-4 h-4" /> Open Camera Scanner
              </button>
            </div>
          </div>
        )}

        {/* Registration Details View */}
        {!isLoading && registration && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            {/* Status Header Banner */}
            <div
              className={cn(
                "rounded-2xl p-5 border shadow-sm transition-all relative overflow-hidden",
                registration.collectionStatus === "collected"
                  ? "bg-emerald-500/10 border-emerald-500/30 dark:bg-emerald-950/20"
                  : "bg-amber-500/10 border-amber-500/30 dark:bg-amber-950/20"
              )}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div
                    className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                      registration.collectionStatus === "collected"
                        ? "bg-emerald-500 text-white"
                        : "bg-amber-500 text-white"
                    )}
                  >
                    {registration.collectionStatus === "collected" ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      <PackageCheck className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {registration.festivalName} {registration.festivalYear}
                      </span>
                      <span
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider",
                          registration.collectionStatus === "collected"
                            ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                            : "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                        )}
                      >
                        {registration.collectionStatus === "collected"
                          ? "✓ T-Shirt Collected"
                          : "⏳ Ready for Distribution"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <h2 className="text-xl sm:text-2xl font-mono font-bold text-foreground">
                        {registration.collectionId || `TSH-#${registration.id}`}
                      </h2>
                      <button
                        type="button"
                        onClick={handleCopyId}
                        className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                        title="Copy ID"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {registration.collectionStatus === "collected" && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Handed over on{" "}
                        <span className="font-semibold text-foreground">
                          {formatDateTime(registration.collectedAt)}
                        </span>
                        {registration.collectedByName && (
                          <>
                            {" "}
                            by{" "}
                            <span className="font-semibold text-foreground">
                              {registration.collectedByName}
                            </span>
                          </>
                        )}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex sm:flex-col items-end justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 border-border/50">
                  <span className="text-xs text-muted-foreground font-medium">Total Amount</span>
                  <span className="text-2xl font-extrabold text-foreground font-serif">
                    {formatCurrency(registration.totalAmount)}
                  </span>
                </div>
              </div>

              {registration.collectionNotes && (
                <div className="mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Collection Note:</span>{" "}
                  {registration.collectionNotes}
                </div>
              )}
            </div>

            {/* Main Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Resident Details Card */}
              <div className="glass-card-glow rounded-2xl p-5 border border-border">
                <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-border">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground">Resident Details</h3>
                    <p className="text-[11px] text-muted-foreground">Identity & Wing Info</p>
                  </div>
                </div>

                <div className="space-y-3.5 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground block mb-0.5">Full Name</span>
                    <span className="font-bold text-base text-foreground">{registration.name}</span>
                  </div>

                  <div>
                    <span className="text-xs text-muted-foreground block mb-0.5">Mobile Number</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-foreground">
                        {registration.mobileNumber}
                      </span>
                      <a
                        href={`tel:${registration.mobileNumber}`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
                      >
                        <Phone className="w-3 h-3" /> Call
                      </a>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="p-2.5 rounded-xl bg-muted/30 border border-border/50">
                      <span className="text-[11px] text-muted-foreground block">Building</span>
                      <span className="font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                        <Building2 className="w-3.5 h-3.5 text-primary" />
                        {registration.buildingName || "—"}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-muted/30 border border-border/50">
                      <span className="text-[11px] text-muted-foreground block">Wing</span>
                      <span className="font-semibold text-foreground mt-0.5 block">
                        {registration.wingName || "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* T-Shirt Order Breakdown Card */}
              <div className="glass-card-glow rounded-2xl p-5 border border-border">
                <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-border">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                    <Shirt className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground">T-Shirt Specifications</h3>
                    <p className="text-[11px] text-muted-foreground">Sizes & Quantity to Handover</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Size Highlight Badge */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-primary/10 via-amber-500/5 to-transparent border border-primary/20">
                    <div>
                      <span className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground block">
                        T-Shirt Size
                      </span>
                      <span className="text-3xl font-extrabold text-primary font-serif">
                        {registration.tShirtSize}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground block">
                        Quantity
                      </span>
                      <span className="text-2xl font-bold text-foreground">
                        {registration.quantity} {registration.quantity === 1 ? "Piece" : "Pieces"}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                    {registration.tShirtSizeNumeric && (
                      <div className="p-2.5 rounded-xl bg-muted/30 border border-border/50">
                        <span className="text-muted-foreground block">Numeric Size</span>
                        <span className="font-semibold text-foreground text-sm">
                          {registration.tShirtSizeNumeric}
                        </span>
                      </div>
                    )}
                    {registration.chestSize && (
                      <div className="p-2.5 rounded-xl bg-muted/30 border border-border/50">
                        <span className="text-muted-foreground block">Chest Size</span>
                        <span className="font-semibold text-foreground text-sm">
                          {registration.chestSize}" inches
                        </span>
                      </div>
                    )}
                    <div className="p-2.5 rounded-xl bg-muted/30 border border-border/50">
                      <span className="text-muted-foreground block">Rate / Piece</span>
                      <span className="font-semibold text-foreground text-sm">
                        ₹{registration.tshirtPrice || 250}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment & Collection Action Card */}
            <div className="glass-card-glow rounded-2xl p-6 border border-border relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 via-primary to-teal-400 opacity-80" />

              <div className="flex items-center justify-between gap-4 mb-5 pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <IndianRupee className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">Payment & Verification</h3>
                    <p className="text-xs text-muted-foreground">Verify cash receipt & confirm handover</p>
                  </div>
                </div>

                {/* Payment Status Tag */}
                <div
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border",
                    registration.paymentMode === "pending"
                      ? "bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300"
                      : "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                  )}
                >
                  {registration.paymentMode === "pending" ? (
                    <>
                      <Clock className="w-3.5 h-3.5" />
                      <span>Payment Pending (₹{registration.totalAmount})</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Paid via {registration.paymentMode.toUpperCase()}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Pending Payment Notice & Cash Collection Checkbox */}
              {registration.paymentMode === "pending" && registration.collectionStatus === "pending" && (
                <div className="mb-5 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200">
                  <div className="flex items-start gap-3">
                    <Banknote className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex-1 text-sm">
                      <p className="font-bold">
                        Cash Collection Required: {formatCurrency(registration.totalAmount)}
                      </p>
                      {registration.pendingReason && (
                        <p className="text-xs opacity-80 mt-0.5">
                          Reason: {registration.pendingReason}
                        </p>
                      )}
                      <label className="mt-3 flex items-center gap-2 cursor-pointer font-semibold text-foreground">
                        <input
                          type="checkbox"
                          checked={markPaymentPaid}
                          onChange={(e) => setMarkPaymentPaid(e.target.checked)}
                          className="w-4 h-4 rounded text-primary focus:ring-primary border-border cursor-pointer"
                        />
                        <span>
                          Received ₹{registration.totalAmount} cash payment right now during collection
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Collector Notes Field */}
              {registration.collectionStatus === "pending" && (
                <div className="mb-5">
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Distribution / Collector Notes <span className="text-muted-foreground font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={collectionNotes}
                    onChange={(e) => setCollectionNotes(e.target.value)}
                    placeholder="e.g. Collected in-person with cash payment, handed over to resident..."
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                {registration.collectionStatus === "pending" ? (
                  <button
                    type="button"
                    onClick={handleConfirmCollection}
                    disabled={isCollecting}
                    className="w-full sm:flex-1 py-3.5 px-6 rounded-xl bg-gradient-to-r from-primary via-amber-500 to-primary bg-[length:200%_auto] hover:bg-right text-primary-foreground font-bold text-base shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isCollecting ? (
                      <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck className="w-5 h-5" />
                        <span>
                          {registration.paymentMode === "pending" && markPaymentPaid
                            ? `Collect ${formatCurrency(registration.totalAmount)} & Handover T-Shirt`
                            : "Confirm T-Shirt Handover"}
                        </span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="w-full sm:flex-1 py-3 px-6 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold text-center flex items-center justify-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    <span>T-Shirt Already Distributed</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setTshirtIdInput("");
                    setRegistration(null);
                    setError(null);
                    setScannerOpen(true);
                  }}
                  className="w-full sm:w-auto py-3.5 px-6 rounded-xl border border-border text-foreground font-semibold text-sm hover:bg-muted/50 transition-all flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4 text-primary" />
                  <span>Scan Next T-Shirt</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* QR Camera Scanner Modal */}
      {scannerOpen && (
        <QrScannerModal
          onClose={() => setScannerOpen(false)}
          onScanSuccess={(scannedText) => {
            setScannerOpen(false);
            const extracted = extractTshirtId(scannedText);
            if (extracted) {
              setTshirtIdInput(extracted);
              setLocation(`/tshirt-collection-cash/${extracted}`);
              toast.success(`Scanned: ${extracted}`);
            }
          }}
        />
      )}
    </div>
  );
}

// ── QR Scanner Modal (html5-qrcode) ──────────────────────────────────────────

function QrScannerModal({
  onClose,
  onScanSuccess,
}: {
  onClose: () => void;
  onScanSuccess: (text: string) => void;
}) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  useEffect(() => {
    const elementId = "html5qr-code-full-region";
    let isMounted = true;

    const html5QrCode = new Html5Qrcode(elementId);
    scannerRef.current = html5QrCode;

    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    html5QrCode
      .start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          if (isMounted) {
            html5QrCode
              .stop()
              .catch(() => { })
              .finally(() => {
                onScanSuccess(decodedText);
              });
          }
        },
        () => {
          // ignore frame errors during scanning
        }
      )
      .catch((err) => {
        if (isMounted) {
          setScanError(
            err?.message || "Camera access denied or unavailable. Please enter ID manually."
          );
        }
      });

    return () => {
      isMounted = false;
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .catch(() => { })
          .finally(() => {
            scannerRef.current?.clear();
          });
      }
    };
  }, [onScanSuccess]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-foreground text-base">Scan T-Shirt QR Code</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <div
            id="html5qr-code-full-region"
            className="w-full overflow-hidden rounded-xl bg-black min-h-[280px]"
          />

          {scanError && (
            <div className="mt-3 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive text-center">
              {scanError}
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center mt-3">
            Point camera at the printed or digital QR code to scan.
          </p>
        </div>

        <div className="p-4 border-t border-border bg-muted/20 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-border text-foreground text-sm font-semibold hover:bg-muted/50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}

