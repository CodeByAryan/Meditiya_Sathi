import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export default function HeroBackground() {
  const reduceMotion = useReducedMotion();

  const horizontalLines = Array.from({ length: 12 });
  const verticalLines = Array.from({ length: 14 });

  return (
    <div className="absolute inset-0 -z-10 overflow-hidden bg-[color:var(--page-bg-soft)]">

      {/* =====================================================
          BACKGROUND VIDEO
      ====================================================== */}

      <video
        className="absolute inset-0 h-full w-full object-cover opacity-35"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster="/hero/meditiya-community-poster.jpg"
      >
        <source
          src="/hero/meditiya-community.mp4"
          type="video/mp4"
        />
      </video>

      {/* Dark cinematic overlay */}
      <div className="absolute inset-0 bg-black/55" />

      {/* =====================================================
          AMBIENT GLOW
      ====================================================== */}

      <motion.div
        className="absolute -left-40 top-0 h-[500px] w-[500px] rounded-full bg-amber-500/[0.08] blur-[130px]"
        animate={
          reduceMotion
            ? undefined
            : {
                x: [0, 40, 0],
                y: [0, -25, 0],
              }
        }
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <motion.div
        className="absolute -right-40 top-20 h-[500px] w-[500px] rounded-full bg-purple-500/[0.07] blur-[140px]"
        animate={
          reduceMotion
            ? undefined
            : {
                x: [0, -35, 0],
                y: [0, 30, 0],
              }
        }
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* =====================================================
          MAIN GRID
      ====================================================== */}

      <div
        className="absolute inset-0"
        style={{
          perspective: '1000px',
        }}
      >
        <motion.div
          className="absolute -inset-[20%]"
          style={{
            transform: 'rotateX(65deg) scale(1.4)',
            transformOrigin: 'center bottom',
          }}
          animate={
            reduceMotion
              ? undefined
              : {
                  y: [0, 35],
                }
          }
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          {/* Horizontal grid lines */}
          {horizontalLines.map((_, index) => (
            <div
              key={`horizontal-${index}`}
              className="absolute left-0 right-0 h-px bg-white/[0.055]"
              style={{
                top: `${index * 9}%`,
              }}
            />
          ))}

          {/* Vertical grid lines */}
          {verticalLines.map((_, index) => (
            <div
              key={`vertical-${index}`}
              className="absolute bottom-0 top-0 w-px bg-white/[0.045]"
              style={{
                left: `${index * 7.7}%`,
              }}
            />
          ))}
        </motion.div>
      </div>

      {/* =====================================================
          NORMAL DIGITAL GRID
      ====================================================== */}

      <motion.div
        className="absolute inset-0 opacity-[0.045]"
        animate={
          reduceMotion
            ? undefined
            : {
                backgroundPosition: ['0px 0px', '60px 60px'],
              }
        }
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: 'linear',
        }}
        style={{
          backgroundImage: `
            linear-gradient(
              rgba(255,255,255,0.7) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(255,255,255,0.7) 1px,
              transparent 1px
            )
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* =====================================================
          MOVING GLOWING GRID LINE
      ====================================================== */}

      <motion.div
        className="absolute left-0 right-0 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(251,191,36,0.7), transparent)',
          boxShadow: '0 0 25px rgba(251,191,36,0.25)',
        }}
        animate={
          reduceMotion
            ? undefined
            : {
                top: ['15%', '85%', '15%'],
                opacity: [0, 1, 0],
              }
        }
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <motion.div
        className="absolute bottom-0 top-0 w-px"
        style={{
          background:
            'linear-gradient(180deg, transparent, rgba(251,191,36,0.55), transparent)',
          boxShadow: '0 0 25px rgba(251,191,36,0.2)',
        }}
        animate={
          reduceMotion
            ? undefined
            : {
                left: ['10%', '90%', '10%'],
                opacity: [0, 0.8, 0],
              }
        }
        transition={{
          duration: 13,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* =====================================================
          FLOATING GRID NODES
      ====================================================== */}

      {!reduceMotion &&
        Array.from({ length: 12 }).map((_, index) => (
          <motion.div
            key={`node-${index}`}
            className="absolute h-1 w-1 rounded-full bg-amber-300/50"
            style={{
              left: `${8 + ((index * 17) % 84)}%`,
              top: `${15 + ((index * 23) % 65)}%`,
              boxShadow: '0 0 12px rgba(251,191,36,0.45)',
            }}
            animate={{
              opacity: [0, 0.8, 0],
              scale: [0.6, 1.4, 0.6],
            }}
            transition={{
              duration: 3 + (index % 4),
              repeat: Infinity,
              delay: index * 0.45,
              ease: 'easeInOut',
            }}
          />
        ))}

      {/* =====================================================
          CENTER FOCUS GLOW
      ====================================================== */}

      <motion.div
        className="absolute left-1/2 top-[42%] h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400/[0.06] blur-[120px]"
        animate={
          reduceMotion
            ? undefined
            : {
                scale: [1, 1.12, 1],
                opacity: [0.35, 0.6, 0.35],
              }
        }
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* =====================================================
          CINEMATIC VIGNETTE
      ====================================================== */}

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_15%,rgba(0,0,0,0.25)_60%,rgba(0,0,0,0.75)_100%)]" />

      {/* Top fade */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/50 to-transparent" />

      {/* Bottom fade */}
      <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[#070707] via-[#070707]/70 to-transparent" />
    </div>
  );
}