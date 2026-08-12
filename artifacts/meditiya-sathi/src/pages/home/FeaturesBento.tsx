import React from 'react';
import { Link } from 'wouter';
import {
  Users,
  CalendarDays,
  Heart,
  ShoppingBag,
  Star,
  ArrowUpRight,
} from 'lucide-react';
import { motion } from 'framer-motion';

const features = [
  {
    title: 'Festivals',
    desc: 'Celebrate traditions together',
    href: '/festivals',
    icon: Star,
    size: 'large',
    number: '01',
  },
  {
    title: 'Events',
    desc: 'Discover what is happening',
    href: '/events',
    icon: CalendarDays,
    size: 'medium',
    number: '02',
  },
  {
    title: 'Residents',
    desc: 'Connect with your community',
    href: '/about',
    icon: Users,
    size: 'medium',
    number: '03',
  },
  {
    title: 'Donate',
    desc: 'Support community causes',
    href: '/donations',
    icon: Heart,
    size: 'small',
    number: '04',
  },
  {
    title: 'Marketplace',
    desc: 'Buy & sell locally',
    href: '/marketplace',
    icon: ShoppingBag,
    size: 'small',
    number: '05',
  },
];

export default function FeaturesBento() {
  return (
    <section className="relative overflow-hidden py-24 md:py-32">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 bg-[color:var(--page-bg-soft)]" />

      {/* Grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
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

      {/* Ambient glow */}
      <motion.div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-400/[0.045] blur-[150px]"
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.35, 0.6, 0.35],
        }}
        transition={{
          duration: 9,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <div className="container relative z-10 mx-auto px-5 sm:px-6 lg:px-8">

        {/* =====================================================
            HEADER
        ====================================================== */}

        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{
            duration: 0.7,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end"
        >
          <div>
            {/* Label */}

            <div className="mb-5 flex items-center gap-3">
              <span className="h-px w-10 bg-gradient-to-r from-transparent to-amber-300/60" />

              <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-300/70">
                Explore Meditiya
              </span>
            </div>

            {/* Heading */}

            <h2 className="max-w-2xl text-3xl font-serif font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl">
              Everything your
              <span className="block bg-gradient-to-r from-amber-600 via-orange-500 to-amber-500 bg-clip-text text-transparent dark:from-amber-200 dark:via-orange-300 dark:to-amber-400">
                community needs.
              </span>
            </h2>
          </div>

          <p className="max-w-sm text-sm leading-7 text-muted-foreground">
            Discover festivals, events, residents and everything happening
            around your community.
          </p>
        </motion.div>

        {/* =====================================================
            BENTO GRID
        ====================================================== */}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-6 md:grid-rows-2">

          {features.map((feature, index) => {
            const Icon = feature.icon;

            const gridClass =
              feature.size === 'large'
                ? 'md:col-span-3 md:row-span-2'
                : feature.size === 'medium'
                ? 'md:col-span-3 md:row-span-1'
                : 'md:col-span-3 md:row-span-1';

            return (
              <Link
                key={feature.title}
                href={feature.href}
                className={`group block ${gridClass}`}
              >
                <motion.div
                  initial={{
                    opacity: 0,
                    y: 30,
                    scale: 0.97,
                  }}
                  whileInView={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                  }}
                  viewport={{
                    once: true,
                    amount: 0.15,
                  }}
                  transition={{
                    duration: 0.7,
                    delay: index * 0.08,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  whileHover={{
                    y: -6,
                  }}
                  className="relative h-full min-h-[190px] overflow-hidden rounded-[28px]"
                >
                  {/* Outer border glow */}

                  <div className="absolute -inset-[1px] rounded-[28px] bg-gradient-to-br from-white/20 via-white/[0.04] to-amber-300/10 opacity-60 transition-all duration-500 group-hover:from-amber-300/30 group-hover:to-orange-400/20" />

                  {/* Glass */}

                  <div className="relative flex h-full min-h-[190px] flex-col justify-between overflow-hidden rounded-[28px] border border-border bg-card/80 p-7 backdrop-blur-2xl transition-all duration-500 group-hover:border-amber-300/30 group-hover:bg-card dark:border-white/[0.12] dark:bg-white/[0.045] dark:group-hover:border-white/[0.22] dark:group-hover:bg-white/[0.07]">

                    {/* Top shine */}

                    <div className="pointer-events-none absolute left-8 right-8 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

                    {/* Large background number */}

                    <span className="pointer-events-none absolute -right-2 -top-8 select-none text-[140px] font-bold leading-none text-foreground/[0.04] transition-all duration-700 group-hover:text-amber-500/[0.08] dark:text-white/[0.025] dark:group-hover:text-amber-200/[0.05]">
                      {feature.number}
                    </span>

                    {/* Floating glow */}

                    <motion.div
                      className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-amber-400/[0.06] blur-3xl"
                      animate={{
                        scale: [1, 1.15, 1],
                      }}
                      transition={{
                        duration: 5,
                        repeat: Infinity,
                        delay: index * 0.4,
                      }}
                    />

                    {/* Icon + arrow */}

                    <div className="relative z-10 flex items-start justify-between">

                      <motion.div
                        whileHover={{
                          scale: 1.08,
                          rotate: -5,
                        }}
                        className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.14] bg-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]"
                      >
                        <Icon className="h-5 w-5 text-amber-300" />
                      </motion.div>

                      <motion.div
                        whileHover={{
                          scale: 1.15,
                          rotate: 10,
                        }}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.04] text-white/40 transition-colors group-hover:text-white"
                      >
                        <ArrowUpRight className="h-4 w-4" />
                      </motion.div>
                    </div>

                    {/* Content */}

                    <div className="relative z-10 mt-10">

                      <h3 className="text-2xl font-semibold tracking-tight text-white">
                        {feature.title}
                      </h3>

                      <p className="mt-2 max-w-xs text-sm leading-6 text-white/40 transition-colors duration-300 group-hover:text-white/55">
                        {feature.desc}
                      </p>

                    </div>

                    {/* Bottom line */}

                    <div className="absolute bottom-5 left-7 right-7 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

                  </div>
                </motion.div>
              </Link>
            );
          })}

        </div>

        {/* =====================================================
            BOTTOM MESSAGE
        ====================================================== */}

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.7 }}
          className="mt-8 flex items-center justify-center gap-3"
        >
          <span className="h-px w-12 bg-gradient-to-r from-transparent to-white/10" />

          <span className="text-[10px] uppercase tracking-[0.3em] text-white/25">
            One place. One community.
          </span>

          <span className="h-px w-12 bg-gradient-to-l from-transparent to-white/10" />
        </motion.div>

      </div>
    </section>
  );
}