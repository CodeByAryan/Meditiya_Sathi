import React, { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Sparkles,
  Clock3,
  PartyPopper,
} from "lucide-react";

import { useGetUpcomingEventsSummary } from "@workspace/api-client-react";
import { getActiveFestival } from "@/lib/festival-countdown";

function useTimer(targetDate: Date | null) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!targetDate) return;

    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  if (!targetDate) return null;

  const diff = Math.max(0, targetDate.getTime() - now);

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return {
    days,
    hours,
    minutes,
    seconds,
    isComplete: diff <= 0,
  };
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export default function CountdownPage() {
  const reduceMotion = useReducedMotion();

  const { data: events } = useGetUpcomingEventsSummary();

  const nextEvent = events?.[0] || null;
  const fallback = getActiveFestival();

  const event = nextEvent
    ? {
        title: nextEvent.title,
        date: new Date(nextEvent.date),
      }
    : fallback
      ? {
          title: fallback.name,
          date: new Date(fallback.date),
        }
      : null;

  const timer = useTimer(event?.date || null);

  const timeUnits = timer
    ? [
        {
          label: "Days",
          value: timer.days,
          icon: CalendarDays,
        },
        {
          label: "Hours",
          value: timer.hours,
          icon: Clock3,
        },
        {
          label: "Minutes",
          value: timer.minutes,
          icon: Clock3,
        },
        {
          label: "Seconds",
          value: timer.seconds,
          icon: Sparkles,
        },
      ]
    : [];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
      {/* =====================================================
          BACKGROUND
      ====================================================== */}

      <div className="pointer-events-none absolute inset-0">
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.10]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />

        {/* Main glow */}
        <motion.div
          className="absolute left-1/2 top-[12%] h-[300px] w-[300px] -translate-x-1/2 rounded-full bg-amber-400/[0.08] blur-[110px] sm:h-[420px] sm:w-[420px]"
          animate={
            reduceMotion
              ? undefined
              : {
                  scale: [1, 1.12, 1],
                  opacity: [0.35, 0.55, 0.35],
                }
          }
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Side glow */}
        <motion.div
          className="absolute -right-32 top-1/2 h-[280px] w-[280px] rounded-full bg-orange-500/[0.05] blur-[110px] sm:h-[380px] sm:w-[380px]"
          animate={
            reduceMotion
              ? undefined
              : {
                  x: [0, -25, 0],
                }
          }
          transition={{
            duration: 9,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Bottom glow */}
        <div className="absolute bottom-0 left-1/2 h-[220px] w-[500px] -translate-x-1/2 rounded-full bg-amber-400/[0.035] blur-[100px]" />
      </div>

      {/* =====================================================
          CONTENT
      ====================================================== */}

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-5 sm:px-6 sm:py-8">
        {/* =====================================================
            TOP BAR
        ====================================================== */}

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between"
        >
          <Link href="/">
            <a
              className="
                group
                inline-flex
                items-center
                gap-2
                rounded-full
                border border-white/10
                bg-white/[0.04]
                px-3.5 py-2
                text-xs
                font-medium
                text-white/65
                backdrop-blur-xl
                transition-all
                hover:border-white/20
                hover:bg-white/[0.07]
                hover:text-white
                sm:px-4
                sm:text-sm
              "
            >
              <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1 sm:h-4 sm:w-4" />
              <span>Back</span>
            </a>
          </Link>

          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,0.8)]" />

            <span className="text-[9px] font-semibold uppercase tracking-[0.25em] text-white/40">
              Meditiya Nagar
            </span>
          </div>
        </motion.div>

        {/* =====================================================
            MAIN CONTENT
        ====================================================== */}

        <div className="flex flex-1 items-center justify-center py-8 sm:py-12">
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.7,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="
              relative
              w-full
              max-w-3xl
              overflow-hidden
              rounded-[24px]
              border border-white/[0.09]
              bg-white/[0.035]
              p-5
              shadow-[0_25px_80px_rgba(0,0,0,0.4)]
              backdrop-blur-2xl
              sm:rounded-[28px]
              sm:p-8
              md:p-10
            "
          >
            {/* Card glow */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.10),transparent_45%)]" />

            {/* Top line */}
            <div className="pointer-events-none absolute left-[15%] right-[15%] top-0 h-px bg-gradient-to-r from-transparent via-amber-300/50 to-transparent" />

            <div className="relative">
              {/* =================================================
                  HEADER
              ================================================== */}

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex flex-col items-center"
              >
                {/* Icon */}
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-amber-300/15 bg-amber-300/[0.06] sm:h-12 sm:w-12">
                  <PartyPopper className="h-5 w-5 text-amber-300 sm:h-5 sm:w-5" />
                </div>

                {/* Label */}
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles className="h-3 w-3 text-amber-300/70" />

                  <span className="text-[9px] font-semibold uppercase tracking-[0.28em] text-amber-300/70 sm:text-[10px]">
                    Celebration Countdown
                  </span>

                  <Sparkles className="h-3 w-3 text-amber-300/70" />
                </div>

                {/* Title */}
                <motion.h1
                  initial={{
                    opacity: 0,
                    y: 15,
                    filter: "blur(5px)",
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    filter: "blur(0px)",
                  }}
                  transition={{
                    delay: 0.2,
                    duration: 0.7,
                  }}
                  className="
                    max-w-2xl
                    text-center
                    text-3xl
                    font-serif
                    font-semibold
                    leading-[1.08]
                    tracking-[-0.035em]
                    text-white
                    sm:text-4xl
                    md:text-5xl
                  "
                >
                  {event?.title || "Upcoming Event"}
                </motion.h1>

                {/* Date */}
                <div className="mt-4 flex items-center gap-2 text-xs text-white/45 sm:text-sm">
                  <CalendarDays className="h-3.5 w-3.5 text-amber-300/70 sm:h-4 sm:w-4" />

                  <span>
                    {event
                      ? event.date.toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : "Date to be announced"}
                  </span>
                </div>
              </motion.div>

              {/* =================================================
                  DIVIDER
              ================================================== */}

              <div className="mx-auto my-7 h-px max-w-md bg-gradient-to-r from-transparent via-white/10 to-transparent sm:my-8" />

              {/* =================================================
                  COUNTDOWN
              ================================================== */}

              {timer ? (
                <div className="grid grid-cols-4 gap-2 sm:gap-3">
                  {timeUnits.map((unit, index) => {
                    const Icon = unit.icon;

                    return (
                      <motion.div
                        key={unit.label}
                        initial={{
                          opacity: 0,
                          y: 15,
                        }}
                        animate={{
                          opacity: 1,
                          y: 0,
                        }}
                        transition={{
                          delay: 0.3 + index * 0.07,
                          duration: 0.5,
                        }}
                        className="
                          group
                          relative
                          overflow-hidden
                          rounded-xl
                          border border-white/[0.08]
                          bg-black/20
                          px-2
                          py-4
                          text-center
                          backdrop-blur-xl
                          transition-all
                          hover:border-amber-300/15
                          hover:bg-white/[0.04]
                          sm:rounded-2xl
                          sm:px-3
                          sm:py-5
                        "
                      >
                        {/* Hover glow */}
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-amber-300/[0.06] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                        <div className="relative">
                          <Icon className="mx-auto mb-2 h-3.5 w-3.5 text-amber-300/50 sm:h-4 sm:w-4" />

                          <motion.div
                            key={unit.value}
                            initial={{
                              opacity: 0.5,
                              scale: 0.94,
                            }}
                            animate={{
                              opacity: 1,
                              scale: 1,
                            }}
                            className="
                              text-2xl
                              font-semibold
                              tracking-tight
                              text-white
                              sm:text-3xl
                              md:text-4xl
                            "
                          >
                            {pad(unit.value)}
                          </motion.div>

                          <div className="mt-1.5 text-[7px] font-semibold uppercase tracking-[0.2em] text-white/30 sm:text-[8px] sm:tracking-[0.25em]">
                            {unit.label}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-10 text-center text-sm text-white/35">
                  No upcoming event available.
                </div>
              )}

              {/* =================================================
                  MESSAGE
              ================================================== */}

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="
                  mx-auto
                  mt-7
                  max-w-lg
                  text-center
                  text-xs
                  leading-5
                  text-white/35
                  sm:text-sm
                  sm:leading-6
                "
              >
                Get ready to celebrate, connect, and create memorable moments
                together with the Meditiya Nagar community.
              </motion.p>

              {/* =================================================
                  ACTIONS
              ================================================== */}

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.85 }}
                className="mt-6 flex flex-col items-stretch justify-center gap-2.5 sm:flex-row sm:items-center"
              >
                <Link href="/festivals">
                  <a
                    className="
                      group
                      inline-flex
                      w-full
                      items-center
                      justify-center
                      gap-2
                      rounded-full
                      bg-white
                      px-5
                      py-3
                      text-xs
                      font-semibold
                      text-black
                      shadow-[0_10px_35px_rgba(255,255,255,0.08)]
                      transition-all
                      hover:scale-[1.02]
                      sm:w-auto
                      sm:text-sm
                    "
                  >
                    Explore Festivals

                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </a>
                </Link>

                <Link href="/">
                  <a
                    className="
                      inline-flex
                      w-full
                      items-center
                      justify-center
                      gap-2
                      rounded-full
                      border border-white/10
                      bg-white/[0.035]
                      px-5
                      py-3
                      text-xs
                      font-medium
                      text-white/65
                      backdrop-blur-xl
                      transition-all
                      hover:border-white/20
                      hover:bg-white/[0.06]
                      hover:text-white
                      sm:w-auto
                      sm:text-sm
                    "
                  >
                    Home
                  </a>
                </Link>
              </motion.div>
            </div>
          </motion.section>
        </div>

        {/* =====================================================
            FOOTER
        ====================================================== */}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="pb-1 text-center"
        >
          <span className="text-[8px] uppercase tracking-[0.3em] text-white/20 sm:text-[9px]">
            Meditiya Nagar • One Community • Many Celebrations
          </span>
        </motion.div>
      </div>
    </main>
  );
}