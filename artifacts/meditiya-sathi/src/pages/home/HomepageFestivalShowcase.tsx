import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import {
  Sparkles,
  CalendarDays,
  MapPin,
  ArrowRight,
  FolderOpen,
  ExternalLink,
  Flame,
} from 'lucide-react';
import { getApiUrl } from '@/lib/utils';

interface HomepageFestival {
  id: number;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string | null;
  venue?: string | null;
  year: number;
  startDate?: string | null;
  endDate?: string | null;
  bannerImageUrl?: string | null;
  googleDriveUrl?: string | null;
  status?: string | null;
  isActive?: boolean;
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function HomepageFestivalShowcase() {
  const [festival, setFestival] = useState<HomepageFestival | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`${getApiUrl()}/api/festivals/homepage/showcase`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.festival) {
          setFestival(data.festival);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // If loading, render subtle placeholder to avoid layout shift
  if (isLoading) {
    return (
      <section className="relative overflow-hidden bg-[var(--page-bg)] py-16 sm:py-20 md:py-24">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6">
          <div className="h-96 w-full rounded-3xl bg-white/[0.02] border border-white/[0.06] animate-pulse" />
        </div>
      </section>
    );
  }

  // If no festival configured or visible, return null
  if (!festival) {
    return null;
  }

  const dateText = (() => {
    const start = formatDate(festival.startDate);
    const end = formatDate(festival.endDate);
    if (start && end && start !== end) {
      return `${start} – ${end}`;
    }
    return start || end || `${festival.year} Celebration`;
  })();

  const venueText = festival.venue || 'Medtiya Nagar, Mumbai';
  const displaySummary = festival.shortDescription || festival.description;

  return (
    <section className="relative overflow-hidden bg-[var(--page-bg)] py-16 sm:py-20 md:py-28">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[350px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400/[0.045] blur-[100px]" />
        <div className="absolute right-0 top-1/4 h-[300px] w-[300px] rounded-full bg-orange-500/[0.035] blur-[90px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="container relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Section Label */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-8 flex flex-col items-center text-center"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-amber-300/60" />
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-300/20 bg-amber-300/[0.06] text-amber-300 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-[0.25em]">
                Community Festival Showcase
              </span>
            </div>
            <span className="h-px w-8 bg-gradient-to-l from-transparent to-amber-300/60" />
          </div>

          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white">
            {festival.name}
          </h2>
        </motion.div>

        {/* Premium Showcase Card */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="group relative overflow-hidden rounded-3xl border border-white/10 bg-black/40 backdrop-blur-2xl shadow-2xl transition-all duration-500 hover:border-amber-300/30 hover:shadow-[0_20px_70px_rgba(245,158,11,0.12)]"
        >
          {/* Subtle top border glow */}
          <div className="absolute left-[15%] right-[15%] top-0 h-px bg-gradient-to-r from-transparent via-amber-300/50 to-transparent" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
            {/* Festival Large Photo */}
            <div className="relative lg:col-span-7 min-h-[300px] sm:min-h-[380px] md:min-h-[440px] overflow-hidden bg-black/80">
              {festival.bannerImageUrl ? (
                <>
                  <img
                    src={festival.bannerImageUrl}
                    alt={festival.name}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-black/20 lg:to-black" />
                </>
              ) : (
                <div className="relative h-full w-full min-h-[320px] bg-gradient-to-br from-amber-950/80 via-black to-zinc-950 flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-16 h-16 rounded-2xl border border-amber-300/30 bg-amber-300/10 flex items-center justify-center text-amber-300 mb-4 backdrop-blur-md">
                    <Flame className="w-8 h-8" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-300/80">
                    Grand Society Celebration
                  </span>
                  <h3 className="font-serif text-2xl font-bold text-white mt-2">
                    {festival.name}
                  </h3>
                </div>
              )}

              {/* Floating Badge on Image */}
              <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                <span className="px-3.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-300/30 backdrop-blur-md shadow-md">
                  {festival.year} Celebration
                </span>
              </div>
            </div>

            {/* Festival Information & CTAs */}
            <div className="relative lg:col-span-5 flex flex-col justify-between p-6 sm:p-8 md:p-10 bg-gradient-to-b from-white/[0.02] to-transparent">
              <div className="space-y-6">
                {/* Meta details: Date & Venue */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium text-amber-300/90">
                    <CalendarDays className="h-4 w-4 shrink-0 text-amber-300" />
                    <span>{dateText}</span>
                  </div>

                  <div className="flex items-center gap-2.5 text-xs sm:text-sm text-white/70">
                    <MapPin className="h-4 w-4 shrink-0 text-amber-300/80" />
                    <span>{venueText}</span>
                  </div>
                </div>

                {/* Festival Title */}
                <div>
                  <h3 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    {festival.name}
                  </h3>
                  <div className="mt-2 h-0.5 w-12 bg-gradient-to-r from-amber-300 to-transparent" />
                </div>

                {/* Description */}
                <p className="text-sm sm:text-base leading-relaxed text-white/80 line-clamp-4">
                  {displaySummary}
                </p>
              </div>

              {/* CTA Action Buttons */}
              <div className="mt-8 pt-6 border-t border-white/[0.08] flex flex-wrap items-center gap-3">
                <Link
                  href={`/festivals/${festival.slug || festival.id}`}
                  className="group/btn inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-gradient-to-r from-[#D4AF37] via-[#E5C158] to-[#D4AF37] text-black font-bold text-sm shadow-[0_4px_25px_rgba(212,175,55,0.25)] hover:shadow-[0_6px_30px_rgba(212,175,55,0.4)] hover:brightness-105 active:scale-[0.98] transition-all"
                >
                  <span>Explore Festival</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                </Link>

                {festival.googleDriveUrl && (
                  <a
                    href={festival.googleDriveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-full border border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.08] hover:border-amber-300/30 text-sm font-semibold backdrop-blur-md active:scale-[0.98] transition-all"
                  >
                    <FolderOpen className="w-4 h-4 text-amber-300" />
                    <span>View Photos</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-60 ml-0.5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
