import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import {
  Trophy,
  Crown,
  Medal,
  Sparkles,
  Flame,
  Heart,
  Search,
  Building2,
  Calendar,
  IndianRupee,
  Users,
  TrendingUp,
  ArrowRight,
  Filter,
  ArrowUpDown,
  Home,
  CheckCircle2,
  ChevronDown,
  Info,
  Gift,
  PartyPopper,
  Share2,
  Layers,
  Banknote,
  CreditCard,
  Wallet,
  Receipt,
  UserCheck,
} from "lucide-react";
import { getApiUrl, cn, formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// ── Types ────────────────────────────────────────────────────────────────────

export interface ShowcaseBadge {
  label: string;
  icon: string;
  key: string;
  color: string;
}

export interface DonorItem {
  id: string;
  donorName: string;
  buildingId: number | null;
  buildingName: string | null;
  wingName: string | null;
  flatNo: string | null;
  amount: number;
  festivalName: string;
  paymentMethod: string;
  paymentDate: string | null;
  createdAt: string | null;
  rank: number;
  badge: ShowcaseBadge;
  donorType: "resident" | "outsider";
}

export interface FestivalOption {
  id: number;
  name: string;
  slug: string;
  year: number;
  status: string;
  bannerImageUrl: string | null;
  startDate?: string;
  endDate?: string;
  description?: string;
}

export interface ShowcaseResponse {
  festival: {
    id: number;
    name: string;
    slug: string;
    year: number;
    description: string;
    startDate: string;
    endDate: string;
    status: string;
    bannerImageUrl: string | null;
  };
  topDonors: DonorItem[];
  podium: DonorItem[];
  donations: DonorItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    totalContributors: number;
  };
  buildings: { id: number; name: string }[];
}

function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getPaymentMethodDetails(method: string) {
  switch (method?.toLowerCase()) {
    case "upi":
      return { label: "UPI", icon: CreditCard };
    case "bank_transfer":
      return { label: "Bank Transfer", icon: Wallet };
    case "cheque":
      return { label: "Cheque", icon: Receipt };
    case "cash":
    default:
      return { label: "Cash", icon: Banknote };
  }
}

// ── Badge Pill Component ──────────────────────────────────────────────────────

function BadgePill({ badge, size = "md" }: { badge: ShowcaseBadge; size?: "sm" | "md" | "lg" }) {
  const colorStyles: Record<string, string> = {
    amber: "bg-gradient-to-r from-amber-500/20 to-yellow-400/20 text-amber-300 border-amber-400/40 shadow-[0_0_12px_rgba(245,158,11,0.2)]",
    orange: "bg-gradient-to-r from-orange-500/20 to-amber-500/20 text-orange-300 border-orange-400/40 shadow-[0_0_12px_rgba(249,115,22,0.2)]",
    yellow: "bg-gradient-to-r from-yellow-500/20 to-amber-400/20 text-yellow-300 border-yellow-400/40",
    rose: "bg-gradient-to-r from-rose-500/15 to-amber-500/15 text-rose-300 border-rose-400/30",
  };

  const currentStyle = colorStyles[badge.color] || colorStyles.amber;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-semibold backdrop-blur-md transition-all",
        size === "sm" && "px-2 py-0.5 text-[10px]",
        size === "md" && "px-3 py-1 text-xs",
        size === "lg" && "px-4 py-1.5 text-sm",
        currentStyle
      )}
    >
      <span className="text-sm">{badge.icon}</span>
      <span>{badge.label}</span>
    </span>
  );
}

// ── Podium Card Component ─────────────────────────────────────────────────────

function PodiumCard({
  donor,
  position,
}: {
  donor?: DonorItem;
  position: 1 | 2 | 3;
}) {
  if (!donor) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-white/5 bg-white/[0.02] p-6 text-center opacity-40">
        <div className="mb-2 text-2xl font-bold text-white/40">#{position}</div>
        <p className="text-xs text-muted-foreground">Awaiting Contributor</p>
      </div>
    );
  }

  const isFirst = position === 1;
  const isSecond = position === 2;
  const isThird = position === 3;

  const podiumConfig = {
    1: {
      medal: "🥇",
      title: "1st Place",
      crown: true,
      border: "border-amber-400/60 hover:border-amber-400",
      bg: "bg-gradient-to-b from-amber-500/[0.16] via-amber-950/[0.20] to-black/80",
      glow: "bg-amber-400/25",
      ring: "ring-2 ring-amber-400/40",
      amountColor: "text-amber-300 drop-shadow-[0_0_16px_rgba(252,211,77,0.5)]",
      badgeText: "bg-amber-400/20 text-amber-200 border-amber-300/40",
      heightClass: "lg:min-h-[380px] lg:-translate-y-4",
    },
    2: {
      medal: "🥈",
      title: "2nd Place",
      crown: false,
      border: "border-slate-300/50 hover:border-slate-300",
      bg: "bg-gradient-to-b from-slate-400/[0.12] via-slate-900/[0.20] to-black/80",
      glow: "bg-slate-300/15",
      ring: "ring-1 ring-slate-300/30",
      amountColor: "text-slate-100 drop-shadow-[0_0_12px_rgba(226,232,240,0.4)]",
      badgeText: "bg-slate-400/20 text-slate-200 border-slate-300/40",
      heightClass: "lg:min-h-[340px]",
    },
    3: {
      medal: "🥉",
      title: "3rd Place",
      crown: false,
      border: "border-amber-700/50 hover:border-amber-600",
      bg: "bg-gradient-to-b from-amber-800/[0.12] via-orange-950/[0.20] to-black/80",
      glow: "bg-amber-700/15",
      ring: "ring-1 ring-amber-600/30",
      amountColor: "text-amber-200/95 drop-shadow-[0_0_12px_rgba(217,119,6,0.3)]",
      badgeText: "bg-amber-700/20 text-amber-200 border-amber-600/40",
      heightClass: "lg:min-h-[320px]",
    },
  }[position];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: position * 0.1 }}
      whileHover={{ y: -8, transition: { duration: 0.25 } }}
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-3xl border p-6 shadow-2xl backdrop-blur-2xl transition-all duration-300",
        podiumConfig.border,
        podiumConfig.bg,
        podiumConfig.heightClass
      )}
    >
      {/* Ambient glow sphere */}
      <div
        className={cn(
          "pointer-events-none absolute -top-12 left-1/2 h-44 w-44 -translate-x-1/2 rounded-full blur-3xl transition-all duration-500 group-hover:scale-125",
          podiumConfig.glow
        )}
      />

      {/* Top Header with Crown / Medal */}
      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Festival Tag */}
        {donor.festivalName && (
          <span className="mb-2.5 inline-flex items-center gap-1 rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
            <PartyPopper className="h-3 w-3" />
            <span>{donor.festivalName}</span>
          </span>
        )}

        {podiumConfig.crown && (
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="mb-1"
          >
            <Crown className="h-8 w-8 text-amber-300 drop-shadow-[0_0_12px_rgba(252,211,77,0.8)]" />
          </motion.div>
        )}

        <div className="mb-2 flex items-center justify-center gap-1.5">
          <span className="text-2xl">{podiumConfig.medal}</span>
          <span
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
              podiumConfig.badgeText
            )}
          >
            {podiumConfig.title}
          </span>
        </div>

        {/* Donor Name */}
        <h3 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-white transition-colors group-hover:text-amber-200">
          {donor.donorName}
        </h3>

        {/* Building / Location info */}
        <div className="mt-1 flex items-center gap-1.5 text-xs text-white/70">
          {donor.donorType === "resident" ? (
            <>
              <Building2 className="h-3.5 w-3.5 text-amber-300/80" />
              <span>
                {donor.buildingName || "Resident"}
                {donor.wingName ? ` • ${donor.wingName}` : ""}
                {donor.flatNo ? ` • Flat ${donor.flatNo}` : ""}
              </span>
            </>
          ) : (
            <>
              <Heart className="h-3.5 w-3.5 text-rose-300/80" />
              <span>Well-wisher & Supporter</span>
            </>
          )}
        </div>
      </div>

      {/* Center Amount Highlight */}
      <div className="relative z-10 my-6 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/50">
          Contribution
        </p>
        <p
          className={cn(
            "mt-1 font-serif text-3xl sm:text-4xl font-extrabold tracking-tight",
            podiumConfig.amountColor
          )}
        >
          {formatCurrency(donor.amount)}
        </p>

        {donor.paymentDate && (
          <p className="mt-1 text-[11px] text-white/40">
            {formatDate(donor.paymentDate)}
          </p>
        )}
      </div>

      {/* Bottom Appreciation Message */}
      <div className="relative z-10 border-t border-white/10 pt-3 text-center">
        <BadgePill badge={donor.badge} size="sm" />
        <p className="mt-2 text-[10px] italic text-white/60">
          Thank you for inspiring our community ❤️
        </p>
      </div>
    </motion.div>
  );
}

// ── Find My Contribution Component ───────────────────────────────────────────

function FindMyContribution({ festivalId }: { festivalId: number }) {
  const [query, setQuery] = useState("");
  const [selectedResult, setSelectedResult] = useState<DonorItem | null>(null);

  const { data, isFetching } = useQuery<{ results: DonorItem[] }>({
    queryKey: ["donation-search", festivalId, query],
    queryFn: async () => {
      if (!query.trim()) return { results: [] };
      const res = await fetch(
        `${getApiUrl()}/api/donation-showcase/${festivalId}/search-contributor?q=${encodeURIComponent(
          query.trim()
        )}`
      );
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: query.trim().length >= 2,
    staleTime: 30_000,
  });

  const searchResults = data?.results || [];

  return (
    <Card className="relative overflow-hidden border-amber-300/20 bg-gradient-to-br from-amber-500/[0.08] via-black/60 to-black/90 p-6 shadow-2xl backdrop-blur-2xl">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-amber-400/10 blur-3xl" />

      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        {/* Left Side: Header & Search Input */}
        <div className="max-w-xl flex-1">
          <div className="flex items-center gap-2 text-amber-300 mb-1.5">
            <UserCheck className="h-4 w-4" />
            <span className="text-[11px] font-bold uppercase tracking-[0.25em]">
              Community Recognition
            </span>
          </div>
          <h3 className="font-serif text-2xl font-bold text-white sm:text-3xl">
            Find My Contribution
          </h3>
          <p className="mt-1 text-sm text-white/70">
            Check your community ranking, badge achievements, and official festival recognition.
          </p>

          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedResult(null);
              }}
              placeholder="Search your name or flat number (e.g. Aryan, 204)..."
              className="w-full rounded-2xl border border-white/15 bg-white/[0.06] py-3 pl-10 pr-4 text-sm text-white placeholder:text-white/40 backdrop-blur-md outline-none transition-all focus:border-amber-400/50 focus:bg-white/[0.1] focus:ring-2 focus:ring-amber-400/20"
            />
            {isFetching && (
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-400/30 border-t-amber-400" />
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Search Results / Selected Card */}
        <div className="w-full lg:w-96">
          {searchResults.length > 0 && !selectedResult && (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              <p className="text-xs font-semibold text-white/60">
                {searchResults.length} {searchResults.length === 1 ? "result" : "results"} found:
              </p>
              {searchResults.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedResult(r)}
                  className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] p-3 text-left transition-all hover:border-amber-400/40 hover:bg-amber-400/10"
                >
                  <div>
                    <p className="text-sm font-bold text-white">{r.donorName}</p>
                    <p className="text-xs text-white/60">
                      {r.buildingName} {r.wingName ? `• ${r.wingName}` : ""} {r.flatNo ? `• Flat ${r.flatNo}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-amber-300">{formatCurrency(r.amount)}</p>
                    <p className="text-[10px] font-semibold text-white/50">Rank #{r.rank}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {selectedResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl border border-amber-400/40 bg-amber-500/[0.12] p-4 text-white shadow-xl"
            >
              <div className="flex items-start justify-between">
                <div>
                  <BadgePill badge={selectedResult.badge} size="sm" />
                  <h4 className="mt-2 font-serif text-lg font-bold text-white">
                    {selectedResult.donorName}
                  </h4>
                  <p className="text-xs text-white/70">
                    {selectedResult.buildingName} {selectedResult.wingName ? `• ${selectedResult.wingName}` : ""} {selectedResult.flatNo ? `• Flat ${selectedResult.flatNo}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <div className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2.5 py-1 text-xs font-bold text-amber-200">
                    <Trophy className="h-3 w-3 text-amber-300" />
                    Rank #{selectedResult.rank}
                  </div>
                  <p className="mt-1.5 font-serif text-2xl font-extrabold text-amber-300">
                    {formatCurrency(selectedResult.amount)}
                  </p>
                </div>
              </div>

              <div className="mt-3 border-t border-white/10 pt-2.5 text-xs text-white/80">
                <p>
                  ❤️ Thank you, <strong>{selectedResult.donorName}</strong>! Your contribution inspires the entire society.
                </p>
              </div>
            </motion.div>
          )}

          {query.trim().length >= 2 && searchResults.length === 0 && !isFetching && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-center text-xs text-white/50">
              No contribution record found matching "{query}".
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// ── Donation Feed Card Component ──────────────────────────────────────────────

function DonationCard({ donation }: { donation: DonorItem }) {
  const method = getPaymentMethodDetails(donation.paymentMethod);
  const MethodIcon = method.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-[#0c0c0c]/90 p-5 shadow-lg backdrop-blur-xl transition-all duration-300 hover:border-amber-300/40 hover:bg-white/[0.04] hover:shadow-[0_10px_30px_rgba(245,158,11,0.1)]"
    >
      {/* Top Header: Festival Banner & Rank */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/25 bg-amber-400/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
            <PartyPopper className="h-3 w-3 text-amber-300" />
            <span className="truncate max-w-[150px]">{donation.festivalName}</span>
          </span>
          <span className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold text-white/70">
            #{donation.rank}
          </span>
        </div>

        {/* Donor Name */}
        <div className="flex items-center gap-2">
          {donation.rank === 1 ? (
            <span className="text-lg">👑</span>
          ) : donation.rank === 2 ? (
            <span className="text-lg">🥈</span>
          ) : donation.rank === 3 ? (
            <span className="text-lg">🥉</span>
          ) : (
            <Trophy className="h-4 w-4 text-amber-400/80 shrink-0" />
          )}
          <h4 className="font-serif text-lg font-bold text-white transition-colors group-hover:text-amber-200 truncate">
            {donation.donorName}
          </h4>
        </div>

        {/* Building / Resident Details */}
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-white/65">
          {donation.donorType === "resident" ? (
            <>
              <Building2 className="h-3.5 w-3.5 text-amber-300/70 shrink-0" />
              <span className="truncate">
                {donation.buildingName || "Resident"}
                {donation.wingName ? ` • ${donation.wingName}` : ""}
                {donation.flatNo ? ` • Flat ${donation.flatNo}` : ""}
              </span>
            </>
          ) : (
            <>
              <Heart className="h-3.5 w-3.5 text-rose-300/70 shrink-0" />
              <span>Community Well-wisher</span>
            </>
          )}
        </div>
      </div>

      {/* Center Amount Highlight */}
      <div className="my-5 rounded-2xl border border-amber-300/15 bg-gradient-to-br from-amber-500/[0.06] to-black/40 p-4 text-center backdrop-blur-sm">
        <span className="text-[10px] uppercase font-semibold tracking-[0.25em] text-white/45">
          Contribution
        </span>
        <p className="mt-1 font-serif text-3xl font-extrabold text-amber-300 drop-shadow-[0_0_14px_rgba(252,211,77,0.35)]">
          {formatCurrency(donation.amount)}
        </p>
      </div>

      {/* Bottom Footer: Badge & Method & Date */}
      <div className="pt-3 border-t border-white/8 flex items-center justify-between gap-2">
        <BadgePill badge={donation.badge} size="sm" />

        <div className="flex items-center gap-2 text-[10px] text-white/50">
          <span className="flex items-center gap-1">
            <MethodIcon className="h-3 w-3 text-amber-300/60" />
            {method.label}
          </span>
          {donation.paymentDate && (
            <span>• {formatDate(donation.paymentDate)}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Donation Showcase Page Component ─────────────────────────────────────

export default function DonationShowcase() {
  const [selectedFestivalId, setSelectedFestivalId] = useState<number | null>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>("all");
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("amount_desc");
  const [showGamificationModal, setShowGamificationModal] = useState<boolean>(false);

  // 1. Fetch available festivals for dropdown
  const {
    data: festivalsData,
    isLoading: isLoadingFestivals,
    isError: isFestivalsError,
  } = useQuery<{ festivals: FestivalOption[] }>({
    queryKey: ["showcase-festivals"],
    queryFn: async () => {
      const res = await fetch(`${getApiUrl()}/api/donation-showcase/festivals`);
      if (!res.ok) throw new Error("Failed to load festivals");
      return res.json();
    },
    staleTime: 60_000,
  });

  const festivals = festivalsData?.festivals || [];

  // Set default festival once list is loaded
  useEffect(() => {
    if (festivals.length > 0 && selectedFestivalId === null) {
      // Find active festival or first festival
      const active = festivals.find((f) => f.status === "active");
      setSelectedFestivalId(active ? active.id : festivals[0].id);
    }
  }, [festivals, selectedFestivalId]);

  // 2. Fetch selected festival's showcase data
  const {
    data: showcaseData,
    isLoading: isLoadingShowcase,
    isError: isShowcaseError,
    refetch,
  } = useQuery<ShowcaseResponse>({
    queryKey: [
      "donation-showcase",
      selectedFestivalId,
      selectedBuildingId,
      searchFilter,
      sortBy,
    ],
    queryFn: async () => {
      if (!selectedFestivalId) throw new Error("No festival selected");
      const sp = new URLSearchParams();
      if (selectedBuildingId && selectedBuildingId !== "all") {
        sp.set("buildingId", selectedBuildingId);
      }
      if (searchFilter.trim()) {
        sp.set("search", searchFilter.trim());
      }
      sp.set("sortBy", sortBy);
      sp.set("limit", "100");

      const res = await fetch(
        `${getApiUrl()}/api/donation-showcase/${selectedFestivalId}?${sp.toString()}`
      );
      if (!res.ok) throw new Error("Failed to load donation showcase");
      return res.json();
    },
    enabled: selectedFestivalId !== null,
    staleTime: 30_000,
  });

  const festival = showcaseData?.festival;
  const totalContributors = showcaseData?.pagination?.totalContributors ?? (showcaseData?.donations?.length || 0);
  const podium = showcaseData?.podium || [];
  const topDonors = showcaseData?.topDonors || [];
  const donations = showcaseData?.donations || [];
  const buildings = showcaseData?.buildings || [];

  // Top 3 for podium
  const rank1 = podium.find((d) => d.rank === 1);
  const rank2 = podium.find((d) => d.rank === 2);
  const rank3 = podium.find((d) => d.rank === 3);

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: "Meditiya Sathi Donation Showcase",
          text: `Check out our community contributions for ${festival?.name || "our festival"}!`,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Showcase link copied to clipboard!");
    }
  };

  return (
    <div className="relative min-h-screen pb-24 text-foreground">
      {/* Background ambient lighting */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-10 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-amber-400/[0.04] blur-[120px]" />
        <div className="absolute -left-20 top-1/3 h-80 w-80 rounded-full bg-orange-500/[0.03] blur-[90px]" />
        <div className="absolute -right-20 top-2/3 h-80 w-80 rounded-full bg-yellow-400/[0.03] blur-[90px]" />
      </div>

      {/* ================================================================
          HERO SECTION & FESTIVAL SELECTOR
      ================================================================= */}
      <section className="relative overflow-hidden pt-10 pb-12 sm:pt-14 sm:pb-16 border-b border-white/8">
        <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            {/* Top pill */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-1.5 text-xs font-semibold text-amber-300 backdrop-blur-md"
            >
              <Trophy className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
              <span>🏆 Festival Leaderboard</span>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="font-serif text-3xl font-extrabold tracking-tight sm:text-5xl md:text-6xl text-white"
            >
              {festival ? `${festival.name} ${festival.year}` : "Festival"}{" "}
              <span className="bg-gradient-to-r from-amber-300 via-orange-300 to-amber-400 bg-clip-text text-transparent">
                Leaderboard
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto"
            >
              Celebrating our generous community contributors whose support powers our joyous cultural celebrations and sacred traditions.
            </motion.p>

            {/* Festival Selector & Actions Bar */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-8 flex flex-wrap items-center justify-center gap-3"
            >
              <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.05] px-4 py-2 backdrop-blur-xl shadow-lg">
                <PartyPopper className="h-4 w-4 text-amber-300" />
                <span className="text-xs font-bold uppercase tracking-wider text-white/70">
                  Festival:
                </span>
                <div className="relative">
                  {festivals.length > 1 ? (
                    <>
                      <select
                        value={selectedFestivalId || ""}
                        onChange={(e) => setSelectedFestivalId(Number(e.target.value))}
                        disabled={isLoadingFestivals || festivals.length === 0}
                        className="cursor-pointer appearance-none bg-transparent pr-7 text-sm font-bold text-amber-300 outline-none hover:text-amber-200"
                      >
                        {festivals.map((f) => (
                          <option
                            key={f.id}
                            value={f.id}
                            className="bg-[#121212] text-white py-1"
                          >
                            {f.name} ({f.year}) {f.status === "active" ? "• Active" : ""}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-300" />
                    </>
                  ) : (
                    <span className="text-sm font-bold text-amber-300">
                      {festivals[0] ? `${festivals[0].name} (${festivals[0].year})` : "Ganesh Utsav (2026)"}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/80 transition-all hover:bg-white/[0.08] active:scale-95"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>Share</span>
              </button>

              <button
                type="button"
                onClick={() => setShowGamificationModal(true)}
                className="inline-flex items-center gap-1.5 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-2 text-xs font-semibold text-amber-300 transition-all hover:bg-amber-400/20 active:scale-95"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Badges Guide</span>
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ================================================================
          FESTIVAL INFO & COMMUNITY PARTICIPATION BAR (NO TOTAL COLLECTION)
      ================================================================= */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-amber-300/20 bg-gradient-to-r from-amber-500/[0.08] via-black/70 to-black/90 p-5 backdrop-blur-2xl shadow-xl flex flex-wrap items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-300/30 bg-amber-400/10 text-amber-300 shrink-0">
              <PartyPopper className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-serif text-lg sm:text-xl font-bold text-white">
                  {festival ? `${festival.name} (${festival.year})` : "Festival Showcase"}
                </h3>
                {festival?.status && (
                  <span className={cn(
                    "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                    festival.status === "active"
                      ? "bg-emerald-400/15 text-emerald-300 border border-emerald-400/30"
                      : "bg-amber-400/15 text-amber-300 border border-amber-400/30"
                  )}>
                    {festival.status}
                  </span>
                )}
              </div>
              <p className="text-xs text-white/60 mt-0.5">
                {festival?.startDate && festival?.endDate
                  ? `${formatDate(festival.startDate)} – ${formatDate(festival.endDate)}`
                  : "Community Celebration Records"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs">
              <Users className="h-4 w-4 text-amber-300" />
              <span className="text-white/60">Confirmed Contributors:</span>
              <strong className="text-amber-300 font-bold font-serif text-sm">
                {isLoadingShowcase ? "..." : totalContributors}
              </strong>
            </div>

            <div className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs text-white/70">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span>100% Verified Festival Records</span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ================================================================
          TOP 3 PODIUM (LEADERBOARD HERO)
      ================================================================= */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 mt-16 sm:mt-20">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 text-amber-300 mb-2">
            <Crown className="h-4 w-4" />
            <span className="text-[11px] font-bold uppercase tracking-[0.3em]">
              Hall of Fame
            </span>
          </div>
          <h2 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl text-white">
            🏆 Top Contributors
          </h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-xl mx-auto">
            Celebrating our top donors whose extraordinary generosity leads the way for the entire society.
          </p>
        </div>

        {isLoadingShowcase ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-80 animate-pulse rounded-3xl border border-white/10 bg-white/[0.03]"
              />
            ))}
          </div>
        ) : podium.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.02] p-12 text-center">
            <Gift className="mx-auto h-12 w-12 text-amber-300/40" />
            <h3 className="mt-4 font-serif text-xl font-bold text-white">
              No contributions yet.
            </h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
              Be one of the first people to support this festival ❤️
            </p>
          </div>
        ) : (
          <div>
            {/* Desktop / Tablet Podium: 2nd place on left, 1st place in center (higher), 3rd place on right */}
            <div className="hidden lg:grid lg:grid-cols-3 lg:items-end lg:gap-6">
              <PodiumCard donor={rank2} position={2} />
              <PodiumCard donor={rank1} position={1} />
              <PodiumCard donor={rank3} position={3} />
            </div>

            {/* Mobile / Compact: Stacked 1st, 2nd, 3rd with prominent badges */}
            <div className="grid grid-cols-1 gap-4 lg:hidden">
              {rank1 && <PodiumCard donor={rank1} position={1} />}
              {rank2 && <PodiumCard donor={rank2} position={2} />}
              {rank3 && <PodiumCard donor={rank3} position={3} />}
            </div>

            {/* Top 4-10 Leaderboard Roster Table */}
            {topDonors.length > 3 && (
              <div className="mt-10 overflow-hidden rounded-3xl border border-white/10 bg-[#0c0c0c]/80 p-5 backdrop-blur-2xl shadow-xl">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                    <Medal className="h-4 w-4 text-amber-400" />
                    Honor Roll (Ranks 4 – {topDonors.length})
                  </h3>
                  <span className="text-xs text-white/50 font-medium">
                    Leaderboard Standing
                  </span>
                </div>

                <div className="space-y-2.5">
                  {topDonors.slice(3).map((donor) => (
                    <motion.div
                      key={donor.id}
                      whileHover={{ scale: 1.01, backgroundColor: "rgba(255, 255, 255, 0.05)" }}
                      className="flex items-center justify-between rounded-2xl border border-white/6 bg-white/[0.025] px-4 py-3 transition-colors"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-xs font-bold text-white/80">
                          #{donor.rank}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate font-serif text-sm sm:text-base font-bold text-white">
                            {donor.donorName}
                          </p>
                          <p className="truncate text-xs text-white/50">
                            {donor.donorType === "resident"
                              ? `${donor.buildingName || "Resident"}${donor.wingName ? ` • ${donor.wingName}` : ""}${donor.flatNo ? ` • Flat ${donor.flatNo}` : ""}`
                              : "Community Well-wisher"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="hidden sm:block">
                          <BadgePill badge={donor.badge} size="sm" />
                        </div>
                        <p className="font-serif text-base sm:text-lg font-bold text-amber-300">
                          {formatCurrency(donor.amount)}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ================================================================
          FIND MY CONTRIBUTION (INTERACTIVE RANK CHECKER)
      ================================================================= */}
      {selectedFestivalId && (
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 mt-16 sm:mt-20">
          <FindMyContribution festivalId={selectedFestivalId} />
        </section>
      )}

      {/* ================================================================
          ALL CONTRIBUTIONS FEED (CARDS & FILTERS)
      ================================================================= */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 mt-16 sm:mt-20">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 text-amber-300 mb-1.5">
              <Layers className="h-4 w-4" />
              <span className="text-[11px] font-bold uppercase tracking-[0.25em]">
                Community Feed
              </span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white">
              All Festival Contributions
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Explore and celebrate every contributor supporting our community celebration.
            </p>
          </div>

          <div className="text-xs text-white/50">
            Showing <strong className="text-white">{donations.length}</strong> of{" "}
            <strong className="text-white">{showcaseData?.pagination?.total ?? totalContributors}</strong> contributions
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="mb-8 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl md:flex-row md:items-center md:justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search by contributor name, building, or wing..."
              className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-white placeholder:text-white/40 outline-none transition-all focus:border-amber-400/40 focus:ring-1 focus:ring-amber-400/20"
            />
          </div>

          {/* Building Filter & Sort Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Building Filter */}
            <div className="relative flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white">
              <Building2 className="h-3.5 w-3.5 text-amber-300" />
              <select
                value={selectedBuildingId}
                onChange={(e) => setSelectedBuildingId(e.target.value)}
                className="cursor-pointer appearance-none bg-transparent pr-6 text-xs font-semibold outline-none text-white"
              >
                <option value="all" className="bg-[#121212] text-white">
                  All Buildings
                </option>
                {buildings.map((b) => (
                  <option key={b.id} value={String(b.id)} className="bg-[#121212] text-white">
                    {b.name}
                  </option>
                ))}
                <option value="outsider" className="bg-[#121212] text-white">
                  Well-wishers
                </option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/50" />
            </div>

            {/* Sort Filter */}
            <div className="relative flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white">
              <ArrowUpDown className="h-3.5 w-3.5 text-amber-300" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="cursor-pointer appearance-none bg-transparent pr-6 text-xs font-semibold outline-none text-white"
              >
                <option value="amount_desc" className="bg-[#121212] text-white">
                  Highest Amount
                </option>
                <option value="amount_asc" className="bg-[#121212] text-white">
                  Lowest Amount
                </option>
                <option value="date_desc" className="bg-[#121212] text-white">
                  Newest Date
                </option>
                <option value="date_asc" className="bg-[#121212] text-white">
                  Oldest Date
                </option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/50" />
            </div>
          </div>
        </div>

        {/* Donations Cards Grid */}
        {isLoadingShowcase ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="h-44 animate-pulse rounded-2xl border border-white/10 bg-white/[0.02]"
              />
            ))}
          </div>
        ) : donations.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.02] p-12 text-center">
            <Search className="mx-auto h-10 w-10 text-white/30 mb-3" />
            <h3 className="font-serif text-lg font-bold text-white">
              No matching contributions found
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Try adjusting your search or building filter.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchFilter("");
                setSelectedBuildingId("all");
              }}
              className="mt-4 border-white/15 bg-white/[0.04] text-xs font-semibold text-white hover:bg-white/[0.08]"
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {donations.map((donation) => (
              <DonationCard key={donation.id} donation={donation} />
            ))}
          </div>
        )}
      </section>

      {/* ================================================================
          GAMIFICATION BADGES MODAL
      ================================================================= */}
      <AnimatePresence>
        {showGamificationModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setShowGamificationModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-amber-300/30 bg-[#121212] p-6 shadow-2xl text-white"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-300" />
                  <h3 className="font-serif text-xl font-bold text-white">
                    Achievement Badges Guide
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGamificationModal(false)}
                  className="rounded-full p-1 text-white/50 hover:bg-white/10 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <p className="mt-4 text-xs text-white/70 leading-relaxed">
                Our community thrives because of members like you! Badges honor contributions and inspire positive, joyful community participation:
              </p>

              <div className="mt-5 space-y-3">
                <div className="flex items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-3.5">
                  <span className="text-2xl">👑</span>
                  <div>
                    <h4 className="font-serif text-sm font-bold text-amber-300">
                      Top Contributor
                    </h4>
                    <p className="text-xs text-white/70">
                      Awarded to the top 3 donors of the festival whose dedication leads our community.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-orange-400/30 bg-orange-500/10 p-3.5">
                  <span className="text-2xl">🔥</span>
                  <div>
                    <h4 className="font-serif text-sm font-bold text-orange-300">
                      High Contributor
                    </h4>
                    <p className="text-xs text-white/70">
                      Awarded to top 10 contributors or contributions of ₹5,000+ providing vital festival backing.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-yellow-400/30 bg-yellow-500/10 p-3.5">
                  <span className="text-2xl">💫</span>
                  <div>
                    <h4 className="font-serif text-sm font-bold text-yellow-300">
                      Community Supporter
                    </h4>
                    <p className="text-xs text-white/70">
                      Awarded to generous supporters with contributions of ₹2,000+ or top 25 rank.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-3.5">
                  <span className="text-2xl">❤️</span>
                  <div>
                    <h4 className="font-serif text-sm font-bold text-rose-300">
                      Community Champion
                    </h4>
                    <p className="text-xs text-white/70">
                      Awarded to every registered donor! Every single contribution brings our society together.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 text-center">
                <Button
                  onClick={() => setShowGamificationModal(false)}
                  className="w-full rounded-xl bg-amber-400 text-black font-bold hover:bg-amber-300"
                >
                  Got It, Thank You!
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
