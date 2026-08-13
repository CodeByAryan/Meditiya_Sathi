import React from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  LogIn,
  Sparkles,
  ChevronDown,
  CalendarDays,
} from 'lucide-react';

import HeroBackground from './HeroBackground';

export default function Hero() {
  return (
    <section
      className="
        relative
        flex
        min-h-[92vh]
        items-center
        overflow-hidden
        bg-[var(--page-bg)]
      "
    >
      {/* =========================================================
          BACKGROUND
      ========================================================== */}

      <HeroBackground />

      {/* Cinematic overlays */}

      <div className="absolute inset-0 z-[1] bg-black/45" />

      <div className="absolute inset-0 z-[1] bg-[radial-gradient(circle_at_50%_35%,rgba(255,170,70,0.16),transparent_38%)]" />

      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-black/30 via-transparent to-black/90" />

      {/* =========================================================
          AMBIENT LIGHT
      ========================================================== */}

      <motion.div
        className="
          absolute
          left-1/2
          top-[25%]
          z-[2]
          h-[420px]
          w-[420px]
          -translate-x-1/2
          rounded-full
          bg-amber-400/10
          blur-[120px]
        "
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.35, 0.55, 0.35],
        }}
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* =========================================================
          FLOATING PARTICLES
      ========================================================== */}

      <div className="pointer-events-none absolute inset-0 z-[2]">
        {[...Array(18)].map((_, i) => (
          <motion.span
            key={i}
            className="
              absolute
              h-1
              w-1
              rounded-full
              bg-amber-200/50
            "
            style={{
              left: `${5 + ((i * 17) % 90)}%`,
              top: `${12 + ((i * 23) % 78)}%`,
            }}
            animate={{
              y: [-10, -35, -10],
              opacity: [0.15, 0.7, 0.15],
            }}
            transition={{
              duration: 3 + (i % 4),
              repeat: Infinity,
              delay: i * 0.25,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* =========================================================
          MAIN CONTENT
      ========================================================== */}

      <div
        className="
          container
          relative
          z-10
          mx-auto
          px-5
          sm:px-6
          lg:px-8
        "
      >
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: {
              transition: {
                staggerChildren: 0.12,
              },
            },
          }}
          className="
            mx-auto
            max-w-6xl
            text-center
          "
        >
          {/* =====================================================
              EYEBROW
          ====================================================== */}

          <motion.div
            variants={{
              hidden: {
                opacity: 0,
                y: 20,
              },
              visible: {
                opacity: 1,
                y: 0,
                transition: {
                  duration: 0.7,
                },
              },
            }}
            className="mb-7 flex justify-center"
          >
            <div
              className="
                group
                inline-flex
                items-center
                gap-2
                rounded-full
                border
                border-border
                bg-card/80
                px-4
                py-2
                backdrop-blur-xl
              "
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />

              <span
                className="
                  text-[10px]
                  font-semibold
                  uppercase
                  tracking-[0.28em]
                  text-muted-foreground
                  sm:text-xs
                "
              >
                Meditiya Nagar • Community Platform
              </span>

              <span
                className="
                  h-1.5
                  w-1.5
                  rounded-full
                  bg-amber-500
                  shadow-[0_0_12px_rgba(245,158,11,0.7)]
                "
              />
            </div>
          </motion.div>

          {/* =====================================================
              HEADLINE
          ====================================================== */}

          <motion.h1
            variants={{
              hidden: {
                opacity: 0,
                y: 35,
                filter: 'blur(8px)',
              },
              visible: {
                opacity: 1,
                y: 0,
                filter: 'blur(0px)',
                transition: {
                  duration: 1,
                  ease: [0.22, 1, 0.36, 1],
                },
              },
            }}
            className="
              mx-auto
              max-w-5xl
              text-5xl
              font-serif
              font-semibold
              leading-[0.95]
              tracking-[-0.04em]
              text-foreground
              sm:text-6xl
              md:text-7xl
              lg:text-[88px]
            "
          >
            One Community.
            <br />

            <span className="relative inline-block">
              <span
                className="
                  bg-gradient-to-r
                  from-amber-200
                  via-orange-300
                  to-amber-500
                  bg-clip-text
                  text-transparent
                "
              >
                Many Celebrations.
              </span>

              <motion.span
                initial={{
                  scaleX: 0,
                  opacity: 0,
                }}
                animate={{
                  scaleX: 1,
                  opacity: 1,
                }}
                transition={{
                  delay: 1.1,
                  duration: 0.8,
                  ease: 'easeOut',
                }}
                className="
                  absolute
                  -bottom-2
                  left-[8%]
                  right-[8%]
                  h-px
                  origin-center
                  bg-gradient-to-r
                  from-transparent
                  via-amber-300/80
                  to-transparent
                "
              />
            </span>
          </motion.h1>

          {/* =====================================================
              DESCRIPTION
          ====================================================== */}

          <motion.p
            variants={{
              hidden: {
                opacity: 0,
                y: 20,
              },
              visible: {
                opacity: 1,
                y: 0,
                transition: {
                  duration: 0.8,
                  ease: 'easeOut',
                },
              },
            }}
            className="
              mx-auto
              mt-8
              max-w-2xl
              text-base
              leading-7
              text-muted-foreground
              sm:text-lg
            "
          >
            Discover festivals, events, and moments that bring
            <span className="font-medium text-foreground">
              {' '}
              Meditiya Nagar{' '}
            </span>
            together — all in one place.
          </motion.p>

          {/* =====================================================
              BUTTONS
          ====================================================== */}

          <motion.div
            variants={{
              hidden: {
                opacity: 0,
                y: 20,
              },
              visible: {
                opacity: 1,
                y: 0,
                transition: {
                  duration: 0.8,
                },
              },
            }}
            className="
              mt-9
              flex
              flex-wrap
              items-center
              justify-center
              gap-3
            "
          >
            {/* PRIMARY */}

            <Link href="/festivals">
              <motion.a
                whileHover={{
                  scale: 1.03,
                }}
                whileTap={{
                  scale: 0.97,
                }}
                className="
                  group
                  inline-flex
                  items-center
                  gap-2
                  rounded-full
                  bg-white
                  px-6
                  py-3.5
                  text-sm
                  font-semibold
                  text-black
                  shadow-[0_0_35px_rgba(255,255,255,0.12)]
                  transition-all
                "
              >
                Explore Community

                <ArrowRight
                  className="
                    h-4
                    w-4
                    transition-transform
                    duration-300
                    group-hover:translate-x-1
                  "
                />
              </motion.a>
            </Link>

            {/* SECONDARY */}

            <Link href="/admin-login">
              <motion.a
                whileHover={{
                  scale: 1.03,
                  backgroundColor: 'rgba(255,255,255,0.12)',
                  borderColor: 'rgba(252,211,77,0.25)',
                }}
                whileTap={{
                  scale: 0.97,
                }}
                className="
                  group
                  inline-flex
                  items-center
                  gap-2
                  rounded-full
                  border
                  border-white/15
                  bg-white/[0.05]
                  px-6
                  py-3.5
                  text-sm
                  font-medium
                  text-white
                  backdrop-blur-xl
                  transition-all
                "
              >
                <LogIn
                  className="
                    h-3.5
                    w-3.5
                    transition-transform
                    duration-300
                    group-hover:translate-x-0.5
                  "
                />

                Admin Login
              </motion.a>
            </Link>
          </motion.div>

          {/* =====================================================
              UPCOMING EVENT GLASS CARD
              MOBILE FIX:
              Extra bottom margin + slightly smaller card
          ====================================================== */}

          <motion.div
            variants={{
              hidden: {
                opacity: 0,
                y: 30,
              },
              visible: {
                opacity: 1,
                y: 0,
                transition: {
                  duration: 0.9,
                  delay: 0.15,
                },
              },
            }}
            className="
              mx-auto
              mt-12
              max-w-xl

              /* Mobile spacing */
              mb-16

              /* Desktop spacing reset */
              sm:mb-0
              sm:mt-14
            "
          >
            <Link href="/countdown">
              <motion.a
                whileHover={{
                  y: -4,
                }}
                className="
                  group
                  block
                  rounded-2xl
                  border
                  border-white/10
                  bg-black/25
                  p-1
                  backdrop-blur-2xl
                  transition-all
                  hover:border-amber-300/20
                "
              >
                <div
                  className="
                    flex
                    items-center
                    justify-between
                    gap-3
                    rounded-xl
                    bg-white/[0.045]
                    px-4
                    py-3.5

                    sm:gap-4
                    sm:px-5
                    sm:py-4
                  "
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="
                        flex
                        h-10
                        w-10
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        border
                        border-amber-300/20
                        bg-amber-300/10
                      "
                    >
                      <CalendarDays className="h-4 w-4 text-amber-300" />
                    </div>

                    <div className="text-left">
                      <p
                        className="
                          text-[9px]
                          font-semibold
                          uppercase
                          tracking-[0.25em]
                          text-amber-300/80
                        "
                      >
                        Up Next
                      </p>

                      <p
                        className="
                          mt-0.5
                          text-sm
                          font-medium
                          text-white
                        "
                      >
                        Ganesh Utsav 2026
                      </p>
                    </div>
                  </div>

                  {/* Desktop information */}

                  <div
                    className="
                      hidden
                      text-right
                      sm:block
                    "
                  >
                    <p className="text-xs text-white/45">
                      14 September 2026
                    </p>

                    <p
                      className="
                        mt-1
                        text-xs
                        font-medium
                        text-white/80
                        transition-colors
                        group-hover:text-amber-300
                      "
                    >
                      View countdown →
                    </p>
                  </div>

                  {/* Mobile arrow */}

                  <ArrowRight
                    className="
                      h-4
                      w-4
                      shrink-0
                      text-white/40
                      transition-all
                      group-hover:translate-x-1
                      group-hover:text-amber-300
                      sm:hidden
                    "
                  />
                </div>
              </motion.a>
            </Link>
          </motion.div>
        </motion.div>
      </div>

      {/* =========================================================
          SCROLL INDICATOR
          
          MOBILE FIX:
          Positioned below countdown card instead of overlapping.
          Hidden on very small screens where vertical space is tight.
      ========================================================== */}

      <motion.button
        initial={{
          opacity: 0,
        }}
        animate={{
          opacity: 1,
        }}
        transition={{
          delay: 2,
        }}
        onClick={() => {
          const el = document.getElementById('stats');

          if (el) {
            el.scrollIntoView({
              behavior: 'smooth',
            });
          }
        }}
        className="
          absolute
          bottom-5
          left-1/2
          z-10
          hidden
          -translate-x-1/2
          flex-col
          items-center
          gap-2
          text-white/35
          transition-colors
          hover:text-white/70

          /* Show from 400px width */
          min-[400px]:flex

          /* Desktop */
          sm:bottom-7
        "
      >
        <span
          className="
            text-[9px]
            uppercase
            tracking-[0.3em]
          "
        >
          Scroll to explore
        </span>

        <motion.span
          animate={{
            y: [0, 5, 0],
          }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <ChevronDown className="h-4 w-4" />
        </motion.span>
      </motion.button>

      {/* =========================================================
          BOTTOM VIGNETTE
      ========================================================== */}

      <div
        className="
          pointer-events-none
          absolute
          bottom-0
          left-0
          right-0
          z-[5]
          h-32
          bg-gradient-to-t
          from-[#080808]
          to-transparent
        "
      />
    </section>
  );
}