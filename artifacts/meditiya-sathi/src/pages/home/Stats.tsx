import React, { useEffect } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion';
import {
  Building2,
  Users,
  PartyPopper,
  Heart,
} from 'lucide-react';
import { useGetStatsSummary } from '@workspace/api-client-react';

/* ---------------- Animated Number ---------------- */

function Counter({ value }: { value: number }) {
  const count = useMotionValue(0);

  const spring = useSpring(count, {
    stiffness: 40,
    damping: 18,
  });

  const rounded = useTransform(spring, (latest) =>
    Math.round(latest)
  );

  useEffect(() => {
    count.set(value);
  }, [value]);

  return <motion.span>{rounded}</motion.span>;
}

/* ---------------- Component ---------------- */

export default function Stats() {
  const { data: stats } = useGetStatsSummary();

  const items = [
    {
      title: 'Residents',
      value: Math.max(stats?.totalResidents ?? 0, 1000),
      icon: Users,
    },
    {
      title: 'Buildings',
      value: Math.max((stats as any)?.totalBuildings ?? 0, 20),
      icon: Building2,
    },
    {
      title: 'Festivals',
      value: Math.max((stats as any)?.totalFestivals ?? 0, 10),
      icon: PartyPopper,
    },
    {
      title: 'Connections',
      value: Math.max(stats?.totalResidents ?? 0, 1000),
      icon: Heart,
    },
  ];

  return (
    <section className="relative py-20">
      {/* Soft Glow */}
      <div className="absolute inset-0 -z-10 bg-[var(--page-bg-soft)]" />

      <div className="container mx-auto px-5">
        {/* Heading */}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-10 text-center"
        >
          <p className="text-[11px] uppercase tracking-[0.25em] text-amber-400">
            Our Community
          </p>

          <h2 className="mt-2 text-3xl font-bold text-foreground dark:text-white">
            Growing Together
          </h2>

          <p className="mt-2 text-sm text-muted-foreground">
            Every number tells a beautiful community story.
          </p>
        </motion.div>

        {/* Cards */}

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {items.map((item, index) => {
            const Icon = item.icon;

            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                whileHover={{
                  y: -6,
                  scale: 1.03,
                }}
                transition={{
                  delay: index * 0.1,
                }}
                viewport={{ once: true }}
                className="group relative"
              >
                {/* Yellow Glow */}

                <div className="absolute -inset-[1px] rounded-3xl bg-amber-400/30 opacity-0 blur-xl transition duration-500 group-hover:opacity-100" />

                {/* Card */}

                <div className="relative flex min-h-[230px] flex-col items-center justify-center rounded-3xl border border-amber-300/15 bg-[#0A0A0A] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.45)] transition-all duration-300">
                  {/* Icon */}

                  <div className="mb-5 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 shadow-[0_0_25px_rgba(251,191,36,0.15)]">
                    <Icon className="h-10 w-10 text-amber-300" />
                  </div>

                  {/* Number */}

                  <div className="flex items-end">
                    <span className="text-4xl font-bold text-white">
                      <Counter value={item.value} />
                    </span>

                    <span className="ml-1 text-3xl font-bold text-amber-300">
                      +
                    </span>
                  </div>

                  {/* Label */}

                  <p className="mt-3 text-sm font-medium text-white/70">
                    {item.title}
                  </p>

                  {/* Bottom Line */}

                  <div className="absolute bottom-0 h-px w-16 bg-gradient-to-r from-transparent via-amber-300/40 to-transparent" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}