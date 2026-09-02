import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Sparkles,
  Clock3,
  PartyPopper,
} from "lucide-react";

import { getApiUrl } from "@/lib/utils";

function useTimer(targetDate: Date | null, endDate: Date | null) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!targetDate || !endDate) return;

    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, endDate]);

  if (!targetDate || !endDate) return null;

  const nowMs = now;
  const diff = Math.max(0, targetDate.getTime() - nowMs);
  const state = nowMs < targetDate.getTime() ? "UPCOMING" : nowMs < endDate.getTime() ? "LIVE" : "COMPLETED";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return { days, hours, minutes, seconds, state };
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function CountdownUnits({ targetDate, endDate }: { targetDate: Date | null; endDate: Date | null }) {
  const timer = useTimer(targetDate, endDate);
  if (!timer) return <div className="py-10 text-center text-sm text-white/35">No countdown available.</div>;
  if (timer.state === "LIVE") return <div className="py-10 text-center text-2xl font-semibold text-amber-300">🎉 It's Live!</div>;
  if (timer.state === "COMPLETED") return <div className="py-10 text-center text-2xl font-semibold text-white/60">Completed</div>;

  const timeUnits = [
    { label: "Days", value: timer.days, icon: CalendarDays },
    { label: "Hours", value: timer.hours, icon: Clock3 },
    { label: "Minutes", value: timer.minutes, icon: Clock3 },
    { label: "Seconds", value: timer.seconds, icon: Sparkles },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3">
      {timeUnits.map((unit) => {
        const Icon = unit.icon;
        return (
          <div key={unit.label} className="group relative overflow-hidden rounded-xl border border-white/[0.08] bg-black/20 px-2 py-4 text-center sm:backdrop-blur-sm">
            <div className="relative">
              <Icon className="mx-auto mb-2 h-3.5 w-3.5 text-amber-300/50 sm:h-4 sm:w-4" />
              <span className="text-2xl font-semibold tracking-tight text-white sm:text-3xl md:text-4xl">{pad(unit.value)}</span>
              <div className="mt-1.5 text-[7px] font-semibold uppercase tracking-[0.2em] text-white/30 sm:text-[8px] sm:tracking-[0.25em]">{unit.label}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function CountdownPage() {
  const [countdown, setCountdown] = useState<{ name: string; targetAt: string; endAt: string; description: string | null } | null>(null);
  useEffect(() => { fetch(`${getApiUrl()}/api/festival-countdowns/active`).then((response) => response.ok ? response.json() : null).then((data) => setCountdown(data?.countdown || null)).catch(() => undefined); }, []);

  const event = countdown ? { title: countdown.name, date: new Date(countdown.targetAt), endDate: new Date(countdown.endAt), description: countdown.description } : null;

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
        <div className="absolute left-1/2 top-[12%] h-[240px] w-[240px] -translate-x-1/2 rounded-full bg-amber-400/[0.06] blur-[64px] sm:h-[340px] sm:w-[340px] sm:blur-[88px]" />

        {/* Side glow */}
        <div className="absolute -right-32 top-1/2 hidden h-[300px] w-[300px] rounded-full bg-orange-500/[0.04] blur-[72px] sm:block" />

        {/* Bottom glow */}
        <div className="absolute bottom-0 left-1/2 hidden h-[180px] w-[360px] -translate-x-1/2 rounded-full bg-amber-400/[0.03] blur-[64px] sm:block" />
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
              sm:backdrop-blur-md
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

              <CountdownUnits targetDate={event?.date || null} endDate={event?.endDate || null} />

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
