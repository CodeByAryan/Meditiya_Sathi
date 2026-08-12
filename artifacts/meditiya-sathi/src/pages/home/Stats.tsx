import React, { useEffect } from 'react';
import {
  motion,
  useMotionValue,
  useTransform,
  useSpring,
} from 'framer-motion';
import {
  Building2,
  Users,
  CalendarDays,
  PartyPopper,
} from 'lucide-react';
import { useGetStatsSummary } from '@workspace/api-client-react';

function AnimatedNumber({ value }: { value: number }) {
  const motionValue = useMotionValue(0);

  const springValue = useSpring(motionValue, {
    stiffness: 55,
    damping: 18,
    mass: 0.8,
  });

  const rounded = useTransform(springValue, (value) =>
    Math.round(value)
  );

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  return (
    <motion.span className="text-4xl font-bold tracking-tight text-foreground md:text-5xl dark:text-white">
      {rounded}
    </motion.span>
  );
}

export default function Stats() {
  const { data: stats } = useGetStatsSummary();

  const items = [
    {
      label: 'Buildings',
      value: (stats as any)?.totalBuildings ?? 0,
      icon: Building2,
    },
    {
      label: 'Residents',
      value: stats?.totalResidents ?? 0,
      icon: Users,
    },
    {
      label: 'Upcoming Events',
      value: stats?.totalEvents ?? 0,
      icon: CalendarDays,
    },
    {
      label: 'Festivals',
      value: (stats as any)?.totalFestivals ?? 0,
      icon: PartyPopper,
    },
  ];

  return (
    <section
      id="stats"
      className="relative overflow-hidden py-24 md:py-32"
    >
      {/* =====================================================
          BACKGROUND
      ====================================================== */}

      <div className="pointer-events-none absolute inset-0 bg-[color:var(--page-bg-soft)]" />

      {/* =====================================================
          AMBIENT CENTER GLOW
      ====================================================== */}

      <motion.div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400/[0.06] blur-[140px]"
        animate={{
          scale: [1, 1.08, 1],
          opacity: [0.4, 0.65, 0.4],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* =====================================================
          SUBTLE GRID
      ====================================================== */}

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `
            linear-gradient(
              rgba(255,255,255,0.8) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(255,255,255,0.8) 1px,
              transparent 1px
            )
          `,
          backgroundSize: '70px 70px',
        }}
      />

      {/* =====================================================
          MAIN CONTAINER
      ====================================================== */}

      <div className="container relative z-10 mx-auto px-5 sm:px-6 lg:px-8">

        {/* ===================================================
            SECTION HEADER
        ==================================================== */}

        <motion.div
          initial={{
            opacity: 0,
            y: 25,
          }}
          whileInView={{
            opacity: 1,
            y: 0,
          }}
          viewport={{
            once: true,
            amount: 0.3,
          }}
          transition={{
            duration: 0.7,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="mx-auto mb-14 max-w-2xl text-center"
        >
          {/* Small label */}

          <div className="mb-5 flex items-center justify-center gap-3">
            <span className="h-px w-10 bg-gradient-to-r from-transparent to-amber-300/50" />

            <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-300/70">
              Our Community
            </span>

            <span className="h-px w-10 bg-gradient-to-l from-transparent to-amber-300/50" />
          </div>

          {/* Heading */}

          <h2 className="text-3xl font-serif font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl dark:text-white">
            A community that

            <span className="block bg-gradient-to-r from-amber-600 via-orange-500 to-amber-500 bg-clip-text text-transparent dark:from-amber-200 dark:via-orange-300 dark:to-amber-400">
              grows together.
            </span>
          </h2>

          {/* Description */}

          <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
            A live snapshot of Meditiya Nagar — connecting residents,
            buildings, events and celebrations.
          </p>
        </motion.div>

        {/* ===================================================
            GLASSMORPHISM CARDS
        ==================================================== */}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">

          {items.map((item, index) => {
            const Icon = item.icon;

            return (
              <motion.div
                key={item.label}
                initial={{
                  opacity: 0,
                  y: 35,
                  scale: 0.96,
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                }}
                viewport={{
                  once: true,
                  amount: 0.2,
                }}
                transition={{
                  duration: 0.7,
                  delay: index * 0.12,
                  ease: [0.22, 1, 0.36, 1],
                }}
                whileHover={{
                  y: -8,
                  scale: 1.02,
                }}
                className="group relative"
              >

                {/* =================================================
                    CARD OUTER GLOW
                ================================================== */}

                <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-br from-white/20 via-white/[0.04] to-amber-300/10 opacity-60 blur-[1px] transition-all duration-500 group-hover:from-amber-300/30 group-hover:to-orange-400/20" />

                {/* =================================================
                    GLASS CARD
                ================================================== */}

                <div className="relative min-h-[245px] overflow-hidden rounded-3xl border border-white/[0.14] bg-white/[0.055] p-7 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_20px_60px_rgba(0,0,0,0.25)] transition-all duration-500 group-hover:border-white/[0.22] group-hover:bg-white/[0.075] group-hover:shadow-[0_25px_80px_rgba(0,0,0,0.35)]">

                  {/* =================================================
                      GLASS REFLECTION
                  ================================================== */}

                  <div className="pointer-events-none absolute -left-20 -top-20 h-40 w-40 rounded-full bg-white/[0.08] blur-3xl transition-all duration-700 group-hover:bg-amber-200/[0.08]" />

                  {/* =================================================
                      TOP GLASS SHINE
                  ================================================== */}

                  <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

                  {/* =================================================
                      ICON
                  ================================================== */}

                  <motion.div
                    whileHover={{
                      rotate: -6,
                      scale: 1.08,
                    }}
                    className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.15] bg-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]"
                  >
                    <Icon className="relative z-10 h-5 w-5 text-amber-300" />

                    {/* Icon glow */}

                    <div className="absolute inset-0 rounded-2xl bg-amber-300/10 blur-xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                  </motion.div>

                  {/* =================================================
                      NUMBER
                  ================================================== */}

                  <div className="relative mt-9">
                    <AnimatedNumber value={item.value} />

                    <p className="mt-2 text-sm font-medium text-white/75">
                      {item.label}
                    </p>
                  </div>

                  {/* =================================================
                      BOTTOM DECORATION
                  ================================================== */}

                  <div className="absolute bottom-5 left-7 right-7 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

                  {/* =================================================
                      FLOATING AMBIENT GLOW
                  ================================================== */}

                  <motion.div
                    className="pointer-events-none absolute -bottom-20 -right-20 h-40 w-40 rounded-full bg-amber-400/[0.07] blur-3xl"
                    animate={{
                      scale: [1, 1.15, 1],
                    }}
                    transition={{
                      duration: 5,
                      repeat: Infinity,
                      delay: index * 0.5,
                    }}
                  />

                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ===================================================
            LIVE DATA INDICATOR
        ==================================================== */}

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
            delay: 0.8,
          }}
          className="mt-8 flex items-center justify-center gap-2"
        >
          <span className="relative flex h-2 w-2">

            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-300/50" />

            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-300" />

          </span>

          <span className="text-[10px] uppercase tracking-[0.25em] text-white/30">
            Live platform data
          </span>
        </motion.div>

      </div>
    </section>
  );
}