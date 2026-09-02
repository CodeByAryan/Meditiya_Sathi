import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, CalendarDays, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { useGetUpcomingEventsSummary } from "@workspace/api-client-react";
import FestivalCountdown from "@/components/FestivalCountdown";
import { getApiUrl } from "@/lib/utils";

export default function UpcomingTeaser() {
  const { data: events } = useGetUpcomingEventsSummary();
  const [managed, setManaged] = React.useState<any>(null);
  React.useEffect(() => { fetch(`${getApiUrl()}/api/festival-countdowns/homepage`).then((response) => response.ok ? response.json() : null).then((data) => setManaged(data?.countdown || null)).catch(() => undefined); }, []);

  const nextEvent = managed || events?.[0] || null;
  const title = managed?.name || nextEvent?.title || null;

  const eventDate = managed ? new Date(managed.targetAt) : nextEvent ? new Date(nextEvent.date) : null;

  const date = eventDate
    ? eventDate.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Date TBA";

  if (!title) return null;

  return (
    <section className="relative overflow-hidden bg-[var(--page-bg-soft)] py-14 sm:py-16 md:py-20">
      {/* =========================================================
          AMBIENT BACKGROUND
      ========================================================== */}

      <div className="pointer-events-none absolute inset-0">
        {/* Soft center glow */}
        <div className="absolute left-1/2 top-1/2 h-[220px] w-[220px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400/[0.05] blur-[64px] sm:h-[300px] sm:w-[300px] sm:blur-[80px]" />

        {/* Small side glow */}
        <div className="absolute -right-24 top-1/2 hidden h-40 w-40 -translate-y-1/2 rounded-full bg-orange-500/[0.05] blur-[64px] sm:block" />

        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)
            `,
            backgroundSize: "55px 55px",
          }}
        />
      </div>

      {/* =========================================================
          CONTENT
      ========================================================== */}

      <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{
            opacity: 0,
            y: 20,
          }}
          whileInView={{
            opacity: 1,
            y: 0,
          }}
          viewport={{
            once: true,
            amount: 0.25,
          }}
          transition={{
            duration: 0.7,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="mx-auto max-w-4xl"
        >
          {/* =====================================================
              SMALL SECTION LABEL
          ====================================================== */}

          <div className="mb-5 flex items-center justify-center gap-2">
            <span className="h-px w-6 bg-gradient-to-r from-transparent to-amber-300/50 sm:w-8" />

            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-amber-300" />

              <span className="text-[9px] font-semibold uppercase tracking-[0.28em] text-amber-300/75">
                Up Next
              </span>
            </div>

            <span className="h-px w-6 bg-gradient-to-l from-transparent to-amber-300/50 sm:w-8" />
          </div>

          {/* =====================================================
              COMPACT CARD
          ====================================================== */}

          <Link href="/countdown">
            <motion.div
              whileHover={{
                y: -3,
              }}
              whileTap={{
                scale: 0.99,
              }}
              className="group relative overflow-hidden rounded-2xl border border-white/[0.09] bg-black/[0.28] backdrop-blur-2xl transition-all duration-300 hover:border-amber-300/20 hover:shadow-[0_15px_50px_rgba(245,158,11,0.08)] dark:bg-white/[0.025]"
            >
              {/* Top glow line */}
              <div className="absolute left-[15%] right-[15%] top-0 h-px bg-gradient-to-r from-transparent via-amber-300/50 to-transparent" />

              {/* Card glow */}
              <div className="pointer-events-none absolute -right-24 -top-24 h-52 w-52 rounded-full bg-amber-400/[0.06] blur-[70px] transition-all duration-500 group-hover:bg-amber-400/[0.11]" />

              <div className="relative flex flex-col gap-5 p-5 sm:p-6 md:flex-row md:items-center md:justify-between md:gap-8">
                {/* =================================================
                    LEFT CONTENT
                ================================================== */}

                <div className="flex min-w-0 items-center gap-4">
                  {/* Icon */}
                  <motion.div
                    whileHover={{
                      rotate: 4,
                      scale: 1.05,
                    }}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-300/15 bg-amber-300/[0.08] shadow-[0_0_25px_rgba(245,158,11,0.07)] sm:h-12 sm:w-12"
                  >
                    <CalendarDays className="h-5 w-5 text-amber-300" />
                  </motion.div>

                  {/* Text */}
                  <div className="min-w-0">
                    <p className="mb-1 text-[8px] font-semibold uppercase tracking-[0.25em] text-amber-300/65">
                      Upcoming Celebration
                    </p>

                    <h2 className="truncate font-serif text-xl font-semibold tracking-tight text-foreground sm:text-2xl dark:text-white">
                      {title}
                    </h2>

                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="h-px w-4 bg-amber-300/35" />

                      <p className="text-xs text-muted-foreground dark:text-white/45">
                        {date}
                      </p>
                    </div>
                    {managed && <FestivalCountdown targetAt={managed.targetAt} endAt={managed.endAt} className="mt-4 max-w-md" />}
                  </div>
                </div>

                {/* =================================================
                    CTA
                ================================================== */}

                <div className="flex items-center justify-between border-t border-white/[0.07] pt-4 md:border-0 md:pt-0">
                  <p className="text-[8px] uppercase tracking-[0.2em] text-white/25 md:hidden">
                    Celebration begins soon
                  </p>

                  <motion.div
                    whileHover={{
                      x: 2,
                    }}
                    className="flex shrink-0 items-center gap-2 rounded-full bg-white px-4 py-2.5 text-xs font-semibold text-black shadow-[0_8px_25px_rgba(255,255,255,0.06)] transition-all group-hover:shadow-[0_8px_30px_rgba(245,158,11,0.12)] sm:px-5 sm:py-3"
                  >
                    <span>View Countdown</span>

                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                  </motion.div>
                </div>
              </div>

              {/* Bottom glow */}
              <div className="absolute bottom-0 left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-amber-300/10 to-transparent" />
            </motion.div>
          </Link>

          {/* =====================================================
              SMALL FOOTER TEXT
          ====================================================== */}

          <motion.div
            initial={{
              opacity: 0,
            }}
            whileInView={{
              opacity: 1,
            }}
            viewport={{
              once: true,
            }}
            transition={{
              delay: 0.3,
            }}
            className="mt-5 flex items-center justify-center gap-2"
          >
            <span className="h-1 w-1 rounded-full bg-amber-300/40" />

            <span className="text-[8px] uppercase tracking-[0.25em] text-muted-foreground/40 dark:text-white/20">
              Meditiya Nagar • Community Celebrations
            </span>

            <span className="h-1 w-1 rounded-full bg-amber-300/40" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
