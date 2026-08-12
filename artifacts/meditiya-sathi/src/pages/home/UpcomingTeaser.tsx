import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, CalendarDays, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { useGetUpcomingEventsSummary } from "@workspace/api-client-react";
import { getActiveFestival } from "@/lib/festival-countdown";

export default function UpcomingTeaser() {
  const { data: events } = useGetUpcomingEventsSummary();

  const nextEvent = events?.[0] || null;
  const fallback = getActiveFestival();

  const title = nextEvent?.title || fallback?.name || null;

  const eventDate = nextEvent
    ? new Date(nextEvent.date)
    : fallback
      ? new Date(fallback.date)
      : null;

  const date = eventDate
    ? eventDate.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "TBA";

  if (!title) return null;

  return (
    <section className="relative overflow-hidden bg-[var(--page-bg-soft)] py-24 md:py-32">
      {/* =========================================================
          BACKGROUND GRID
      ========================================================== */}

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Moving grid glow */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        animate={{
          backgroundPosition: ["0px 0px", "60px 60px"],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "linear",
        }}
        style={{
          backgroundImage: `
            linear-gradient(rgba(245,158,11,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(245,158,11,0.035) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Central glow */}
      <motion.div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400/[0.06] blur-[140px]"
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.35, 0.6, 0.35],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Side glow */}
      <motion.div
        className="pointer-events-none absolute -right-40 top-1/2 h-[350px] w-[350px] -translate-y-1/2 rounded-full bg-orange-500/[0.05] blur-[120px]"
        animate={{
          x: [0, -30, 0],
        }}
        transition={{
          duration: 9,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* =========================================================
          CONTENT
      ========================================================== */}

      <div className="container relative z-10 mx-auto px-5 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 35 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{
            duration: 0.9,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="mx-auto max-w-6xl"
        >
          {/* =====================================================
              SECTION LABEL
          ====================================================== */}

          <div className="mb-8 flex items-center justify-center gap-3">
            <motion.span
              initial={{ width: 0 }}
              whileInView={{ width: 45 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="h-px bg-gradient-to-r from-transparent to-amber-300/60"
            />

            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />

              <span className="text-[10px] font-semibold uppercase tracking-[0.32em] text-amber-300/80">
                Up Next
              </span>
            </div>

            <motion.span
              initial={{ width: 0 }}
              whileInView={{ width: 45 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="h-px bg-gradient-to-l from-transparent to-amber-300/60"
            />
          </div>

          {/* =====================================================
              MAIN GLASS CARD
          ====================================================== */}

          <Link href="/countdown">
            <motion.div
              whileHover={{
                y: -6,
                scale: 1.005,
              }}
              transition={{
                duration: 0.35,
                ease: "easeOut",
              }}
              className="group relative cursor-pointer overflow-hidden rounded-[30px] border border-border bg-card/80 backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.035]"
            >
              {/* Top glowing line */}
              <motion.div
                className="absolute left-[12%] right-[12%] top-0 h-px bg-gradient-to-r from-transparent via-amber-300/60 to-transparent"
                animate={{
                  opacity: [0.35, 1, 0.35],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />

              {/* Card glow */}
              <div className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-amber-400/[0.07] blur-[100px] transition-all duration-700 group-hover:bg-amber-400/[0.13]" />

              <div className="pointer-events-none absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-orange-500/[0.05] blur-[100px]" />

              {/* =================================================
                  CARD CONTENT
              ================================================== */}

              <div className="relative grid gap-10 p-7 sm:p-10 md:grid-cols-[1fr_auto] md:items-center md:p-14">
                {/* LEFT */}
                <div>
                  {/* Event icon */}
                  <motion.div
                    whileHover={{ rotate: 5, scale: 1.05 }}
                    className="mb-7 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-300/15 bg-amber-300/[0.08] shadow-[0_0_30px_rgba(245,158,11,0.08)]"
                  >
                    <CalendarDays className="h-6 w-6 text-amber-300" />
                  </motion.div>

                  <p className="mb-3 text-[9px] font-semibold uppercase tracking-[0.28em] text-muted-foreground dark:text-white/35">
                    Upcoming Celebration
                  </p>

                  <h2 className="max-w-3xl text-4xl font-serif font-semibold leading-[1.05] tracking-[-0.03em] text-foreground sm:text-5xl md:text-6xl dark:text-white">
                    {title}
                  </h2>

                  {/* Date */}
                  <div className="mt-6 flex items-center gap-3">
                    <div className="h-px w-8 bg-amber-300/40" />

                    <p className="text-sm font-medium text-muted-foreground sm:text-base dark:text-white/55">
                      {date}
                    </p>
                  </div>

                  <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground dark:text-white/35">
                    Get ready for the celebration. Explore the countdown and
                    stay connected with everything happening in the community.
                  </p>
                </div>

                {/* =================================================
                    RIGHT CTA
                ================================================== */}

                <div className="md:min-w-[190px] md:text-right">
                  <motion.div
                    whileHover={{
                      scale: 1.04,
                    }}
                    whileTap={{
                      scale: 0.97,
                    }}
                    className="inline-flex items-center justify-center gap-3 rounded-full bg-white px-7 py-4 text-sm font-semibold text-black shadow-[0_15px_50px_rgba(255,255,255,0.08)] transition-all duration-300 group-hover:shadow-[0_15px_60px_rgba(245,158,11,0.15)]"
                  >
                    <span>View Countdown</span>

                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </motion.div>

                  <p className="mt-4 text-[9px] uppercase tracking-[0.25em] text-white/25">
                    The celebration begins soon
                  </p>
                </div>
              </div>

              {/* Bottom border */}
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </motion.div>
          </Link>

          {/* =====================================================
              BOTTOM TEXT
          ====================================================== */}

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="mt-8 flex items-center justify-center gap-3"
          >
            <span className="h-1 w-1 rounded-full bg-amber-300/50" />

            <span className="text-[9px] uppercase tracking-[0.28em] text-white/25">
              Meditiya Nagar • Community Celebrations
            </span>

            <span className="h-1 w-1 rounded-full bg-amber-300/50" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}