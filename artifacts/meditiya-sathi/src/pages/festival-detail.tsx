import React from 'react';
import { Link, useParams } from 'wouter';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  CalendarDays,
  FolderOpen,
  ExternalLink,
  MapPin,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { useGetFestival } from '@workspace/api-client-react';
import SEO from '@/components/SEO';

function formatFestivalDate(dateStr?: string | null): string {
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

export default function FestivalDetail() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ? decodeURIComponent(params.slug) : '';

  const {
    data: festival,
    isLoading,
    isError,
  } = useGetFestival(slug, {
    query: {
      enabled: !!slug,
      queryKey: ['festival-detail', slug],
    },
  });

  const festivalTitle = festival?.name || 'Festival';
  const festivalDescription =
    festival?.description ||
    'Discover festival celebrations, traditions, and community moments at Medtiya Nagar.';
  const festivalPath = slug ? `/festivals/${encodeURIComponent(slug)}` : '/festivals';

  const dateRange = React.useMemo(() => {
    if (!festival?.startDate && !festival?.endDate) return null;
    const start = formatFestivalDate(festival?.startDate);
    const end = formatFestivalDate(festival?.endDate);
    if (start && end && start !== end) {
      return `${start} – ${end}`;
    }
    return start || end || null;
  }, [festival?.startDate, festival?.endDate]);

  const statusBadge = React.useMemo(() => {
    if (!festival) return null;
    const rawStatus = (festival as any).status as string | undefined;
    if (festival.isActive || rawStatus === 'active') {
      return {
        label: 'Current Festival',
        className: 'bg-amber-400/15 text-amber-300 border border-amber-400/30',
      };
    }
    if (rawStatus === 'upcoming') {
      return {
        label: 'Upcoming Festival',
        className: 'bg-primary/15 text-primary border border-primary/30',
      };
    }
    if (rawStatus === 'completed') {
      return {
        label: 'Past Celebration',
        className: 'bg-white/10 text-white/60 border border-white/20',
      };
    }
    return null;
  }, [festival]);

  return (
    <>
      <SEO
        title={`${festivalTitle} | Festivals | Meditiya Sathi`}
        description={festivalDescription}
        path={festivalPath}
        ogType="article"
      />

      <main className="min-h-screen bg-[var(--page-bg)] pb-20 pt-28 sm:pt-32 text-foreground">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          {/* Back Navigation */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-6"
          >
            <Link
              href="/festivals"
              className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Festivals</span>
            </Link>
          </motion.div>

          {/* Loading State */}
          {isLoading && (
            <div className="space-y-6">
              <div className="aspect-video w-full rounded-3xl bg-white/[0.04] animate-pulse border border-white/[0.08]" />
              <div className="h-10 w-2/3 rounded-xl bg-white/[0.04] animate-pulse" />
              <div className="h-6 w-1/3 rounded-xl bg-white/[0.04] animate-pulse" />
              <div className="h-24 w-full rounded-2xl bg-white/[0.04] animate-pulse" />
            </div>
          )}

          {/* Error / Not Found State */}
          {(isError || (!isLoading && !festival)) && (
            <div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-10 text-center backdrop-blur-xl">
              <AlertCircle className="mx-auto mb-4 h-10 w-10 text-destructive" />
              <h2 className="font-serif text-2xl font-bold text-white mb-2">
                Festival Not Found
              </h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                The festival you are looking for is either unavailable or has been archived.
              </p>
              <Link
                href="/festivals"
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-6 py-2.5 text-sm font-semibold text-white hover:bg-white/15 transition-all"
              >
                Browse All Festivals
              </Link>
            </div>
          )}

          {/* Festival Detail Card */}
          {!isLoading && festival && (
            <motion.article
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="overflow-hidden rounded-3xl border border-white/10 bg-black/40 backdrop-blur-2xl shadow-2xl"
            >
              {/* Banner Image or Ambient Festive Banner */}
              <div className="relative aspect-video w-full overflow-hidden bg-black/60">
                {festival.bannerImageUrl ? (
                  <>
                    <img
                      src={festival.bannerImageUrl}
                      alt={festival.name}
                      fetchPriority="high"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />
                  </>
                ) : (
                  <div className="relative h-full w-full bg-gradient-to-br from-amber-900/40 via-amber-950/60 to-black flex items-center justify-center overflow-hidden">
                    <div
                      className="absolute inset-0 opacity-[0.06]"
                      style={{
                        backgroundImage: `
                          linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)
                        `,
                        backgroundSize: '40px 40px',
                      }}
                    />
                    <div className="absolute h-64 w-64 rounded-full bg-amber-400/[0.12] blur-[80px]" />
                    <div className="relative z-10 flex flex-col items-center text-center px-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-300/30 bg-amber-300/10 text-amber-300 mb-3 backdrop-blur-md">
                        <Sparkles className="h-8 w-8" />
                      </div>
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-300/80">
                        Medtiya Nagar Celebration
                      </p>
                    </div>
                  </div>
                )}

                {/* Floating Status Badge */}
                {statusBadge && (
                  <div className="absolute top-4 left-4 z-10">
                    <span
                      className={`inline-block rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur-md shadow-lg ${statusBadge.className}`}
                    >
                      {statusBadge.label}
                    </span>
                  </div>
                )}
              </div>

              {/* Main Information */}
              <div className="space-y-8 p-6 sm:p-10">
                {/* Header */}
                <div>
                  <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-amber-300/80 mb-2">
                    <span>{festival.year}</span>
                    <span>•</span>
                    <span>Medtiya Nagar</span>
                  </div>

                  <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-white drop-shadow-sm">
                    {festival.name}
                  </h1>
                </div>

                {/* Festival Meta: Date & Location */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 sm:p-5">
                  {dateRange && (
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-300/20 bg-amber-300/10 text-amber-300">
                        <CalendarDays className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Festival Date
                        </p>
                        <p className="text-sm sm:text-base font-medium text-white mt-0.5">
                          {dateRange}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-300/20 bg-amber-300/10 text-amber-300">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Celebration Location
                      </p>
                      <p className="text-sm sm:text-base font-medium text-white mt-0.5">
                        Medtiya Nagar, Mumbai
                      </p>
                    </div>
                  </div>
                </div>

                {/* Festival Information / Details */}
                {festival.description && (
                  <div className="space-y-3">
                    <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-amber-300/90">
                      Festival Information
                    </h2>
                    <p className="whitespace-pre-wrap leading-relaxed text-white/80 text-base sm:text-lg">
                      {festival.description}
                    </p>
                  </div>
                )}

                {/* Optional Google Drive Section & Button */}
                {festival.googleDriveUrl && (
                  <div className="pt-6 border-t border-white/[0.08]">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-amber-400/[0.08] to-orange-500/[0.05] border border-amber-300/25 backdrop-blur-xl">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <FolderOpen className="h-5 w-5 text-amber-300" />
                          <h3 className="font-semibold text-white text-base">
                            Festival Photos & Media Drive
                          </h3>
                        </div>
                        <p className="text-xs sm:text-sm text-white/60 max-w-md">
                          Browse and download official festival photos, videos, and celebration memories directly from Google Drive.
                        </p>
                      </div>

                      <a
                        href={festival.googleDriveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 px-6 py-3.5 text-sm font-bold text-black shadow-[0_4px_25px_rgba(245,158,11,0.25)] hover:shadow-[0_6px_35px_rgba(245,158,11,0.4)] hover:brightness-105 active:scale-[0.98] transition-all whitespace-nowrap"
                      >
                        <FolderOpen className="h-4 w-4" />
                        <span>View Festival Photos / Drive</span>
                        <ExternalLink className="h-3.5 w-3.5 opacity-75" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </motion.article>
          )}
        </div>
      </main>
    </>
  );
}
