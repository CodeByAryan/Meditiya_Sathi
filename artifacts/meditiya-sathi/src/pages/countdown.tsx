import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'wouter';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Sparkles,
  Clock3,
  PartyPopper,
} from 'lucide-react';

import { useGetUpcomingEventsSummary } from '@workspace/api-client-react';
import { getActiveFestival } from '@/lib/festival-countdown';

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
  return String(value).padStart(2, '0');
}

export default function CountdownPage() {
  const reduceMotion = useReducedMotion();

  const { data: events } = useGetUpcomingEventsSummary();

  const nextEvent =
    events && events.length > 0 ? events[0] : null;

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

  const timer = useTimer(event ? event.date : null);

  const timeUnits = timer
    ? [
        {
          label: 'Days',
          value: timer.days,
          icon: CalendarDays,
        },
        {
          label: 'Hours',
          value: timer.hours,
          icon: Clock3,
        },
        {
          label: 'Minutes',
          value: timer.minutes,
          icon: Clock3,
        },
        {
          label: 'Seconds',
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

      {/* Animated grid */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="
            absolute inset-0
            opacity-[0.18]
            [background-image:linear-gradient(rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.07)_1px,transparent_1px)]
            [background-size:55px_55px]
          "
        />

        {/* Moving grid glow */}
        <motion.div
          className="
            absolute inset-0
            opacity-30
            bg-[radial-gradient(circle_at_50%_35%,rgba(245,158,11,0.20),transparent_35%)]
          "
          animate={
            reduceMotion
              ? undefined
              : {
                  opacity: [0.2, 0.4, 0.2],
                  scale: [1, 1.08, 1],
                }
          }
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      {/* Ambient orange glow */}
      <motion.div
        className="
          pointer-events-none
          absolute
          left-1/2
          top-[18%]
          h-[420px]
          w-[420px]
          -translate-x-1/2
          rounded-full
          bg-orange-500/10
          blur-[130px]
        "
        animate={
          reduceMotion
            ? undefined
            : {
                scale: [1, 1.15, 1],
                opacity: [0.3, 0.6, 0.3],
              }
        }
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Left glow */}
      <motion.div
        className="
          pointer-events-none
          absolute
          -left-40
          top-1/3
          h-96
          w-96
          rounded-full
          bg-amber-400/10
          blur-[120px]
        "
        animate={
          reduceMotion
            ? undefined
            : {
                x: [0, 40, 0],
                y: [0, -30, 0],
              }
        }
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Right glow */}
      <motion.div
        className="
          pointer-events-none
          absolute
          -right-40
          bottom-20
          h-96
          w-96
          rounded-full
          bg-purple-500/10
          blur-[130px]
        "
        animate={
          reduceMotion
            ? undefined
            : {
                x: [0, -40, 0],
                y: [0, 30, 0],
              }
        }
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* =====================================================
          PARTICLES
      ====================================================== */}

      <div className="pointer-events-none absolute inset-0">
        {[...Array(24)].map((_, index) => (
          <motion.span
            key={index}
            className="absolute h-[2px] w-[2px] rounded-full bg-amber-200/50"
            style={{
              left: `${(index * 17) % 95}%`,
              top: `${(index * 29) % 90}%`,
            }}
            animate={
              reduceMotion
                ? undefined
                : {
                    y: [-10, -35, -10],
                    opacity: [0.1, 0.7, 0.1],
                    scale: [0.8, 1.4, 0.8],
                  }
            }
            transition={{
              duration: 3 + (index % 5),
              repeat: Infinity,
              delay: index * 0.2,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* Bottom vignette */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black via-black/40 to-transparent" />

      {/* =====================================================
          CONTENT
      ====================================================== */}

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-20 sm:px-6">
        <div className="w-full max-w-6xl">

          {/* Top navigation */}
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12 flex items-center justify-between"
          >
            <Link href="/">
              <a
                className="
                  group
                  inline-flex
                  items-center
                  gap-2
                  rounded-full
                  border
                  border-white/10
                  bg-white/[0.04]
                  px-4
                  py-2
                  text-sm
                  text-white/70
                  backdrop-blur-xl
                  transition-all
                  hover:border-white/20
                  hover:bg-white/[0.08]
                  hover:text-white
                "
              >
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                Back Home
              </a>
            </Link>

            <div
              className="
                hidden
                items-center
                gap-2
                rounded-full
                border
                border-white/10
                bg-white/[0.04]
                px-4
                py-2
                text-[10px]
                font-semibold
                uppercase
                tracking-[0.25em]
                text-white/50
                backdrop-blur-xl
                sm:flex
              "
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.9)]" />
              Meditiya Nagar
            </div>
          </motion.div>

          {/* Main card */}
          <motion.section
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: 0.9,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="
              relative
              overflow-hidden
              rounded-[32px]
              border
              border-white/10
              bg-white/[0.035]
              p-6
              shadow-[0_30px_100px_rgba(0,0,0,0.45)]
              backdrop-blur-2xl
              sm:p-10
              md:p-14
            "
          >

            {/* Card glow */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.12),transparent_40%)]" />

            {/* Top shine */}
            <div className="pointer-events-none absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-amber-300/60 to-transparent" />

            <div className="relative">

              {/* Eyebrow */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="mb-6 flex justify-center"
              >
                <div
                  className="
                    inline-flex
                    items-center
                    gap-2
                    rounded-full
                    border
                    border-amber-300/15
                    bg-amber-300/[0.06]
                    px-4
                    py-2
                    backdrop-blur-xl
                  "
                >
                  <PartyPopper className="h-4 w-4 text-amber-300" />

                  <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-amber-200/80 sm:text-xs">
                    The Celebration Begins In
                  </span>
                </div>
              </motion.div>

              {/* Event title */}
              <motion.h1
                initial={{
                  opacity: 0,
                  y: 25,
                  filter: 'blur(8px)',
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                  filter: 'blur(0px)',
                }}
                transition={{
                  delay: 0.25,
                  duration: 0.9,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="
                  text-center
                  text-4xl
                  font-serif
                  font-semibold
                  tracking-[-0.04em]
                  text-white
                  sm:text-5xl
                  md:text-6xl
                  lg:text-7xl
                "
              >
                {event ? event.title : 'Upcoming Event'}
              </motion.h1>

              {/* Date */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-5 flex justify-center"
              >
                <div className="flex items-center gap-2 text-sm text-white/45">
                  <CalendarDays className="h-4 w-4 text-amber-300/70" />

                  {event
                    ? event.date.toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                    : 'Date to be announced'}
                </div>
              </motion.div>

              {/* Divider */}
              <div className="mx-auto my-10 h-px max-w-xl bg-gradient-to-r from-transparent via-white/10 to-transparent" />

              {/* Countdown */}
              {timer ? (
                <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4">
                  {timeUnits.map((unit, index) => {
                    const Icon = unit.icon;

                    return (
                      <motion.div
                        key={unit.label}
                        initial={{
                          opacity: 0,
                          y: 25,
                        }}
                        animate={{
                          opacity: 1,
                          y: 0,
                        }}
                        transition={{
                          delay: 0.5 + index * 0.08,
                          duration: 0.6,
                        }}
                        whileHover={{
                          y: -5,
                          scale: 1.02,
                        }}
                        className="
                          group
                          relative
                          overflow-hidden
                          rounded-2xl
                          border
                          border-white/10
                          bg-black/25
                          p-5
                          text-center
                          backdrop-blur-xl
                          transition-colors
                          hover:border-amber-300/20
                          sm:p-7
                        "
                      >
                        {/* Hover glow */}
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-amber-300/[0.07] to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                        <div className="relative">
                          <Icon className="mx-auto mb-3 h-4 w-4 text-amber-300/60" />

                          <motion.div
                            key={unit.value}
                            initial={{ opacity: 0.5, scale: 0.9 }}
                            animate={{
                              opacity: 1,
                              scale: 1,
                            }}
                            className="
                              text-4xl
                              font-semibold
                              tracking-tight
                              text-white
                              sm:text-5xl
                              md:text-6xl
                            "
                          >
                            {pad(unit.value)}
                          </motion.div>

                          <div className="mt-2 text-[9px] font-semibold uppercase tracking-[0.25em] text-white/35 sm:text-[10px]">
                            {unit.label}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-16 text-center text-white/40">
                  No upcoming event available.
                </div>
              )}

              {/* Bottom message */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
                className="
                  mx-auto
                  mt-10
                  max-w-xl
                  text-center
                  text-sm
                  leading-6
                  text-white/40
                "
              >
                Get ready to celebrate, connect, and create unforgettable
                moments together with the Meditiya Nagar community.
              </motion.p>

              {/* Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
                className="mt-8 flex flex-wrap justify-center gap-3"
              >
                <Link href="/festivals">
                  <motion.a
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="
                      group
                      inline-flex
                      items-center
                      gap-2
                      rounded-full
                      bg-white
                      px-6
                      py-3
                      text-sm
                      font-semibold
                      text-black
                      shadow-[0_0_30px_rgba(255,255,255,0.10)]
                    "
                  >
                    Explore Festivals
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </motion.a>
                </Link>

                <Link href="/">
                  <motion.a
                    whileHover={{
                      scale: 1.03,
                      backgroundColor: 'rgba(255,255,255,0.08)',
                    }}
                    whileTap={{ scale: 0.97 }}
                    className="
                      inline-flex
                      items-center
                      gap-2
                      rounded-full
                      border
                      border-white/10
                      bg-white/[0.04]
                      px-6
                      py-3
                      text-sm
                      font-medium
                      text-white/80
                      backdrop-blur-xl
                    "
                  >
                    Home
                  </motion.a>
                </Link>
              </motion.div>
            </div>
          </motion.section>

          {/* Footer label */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3 }}
            className="mt-8 text-center"
          >
            <span className="text-[9px] uppercase tracking-[0.35em] text-white/20">
              One Community • Many Celebrations
            </span>
          </motion.div>
        </div>
      </div>
    </main>
  );
}