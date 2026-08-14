import React from 'react';

export default function HeroBackground() {
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

      <div className="absolute -left-24 top-0 h-[300px] w-[300px] rounded-full bg-amber-500/[0.07] blur-[64px] sm:h-[420px] sm:w-[420px] sm:blur-[88px]" />

      <div className="absolute -right-28 top-20 hidden h-[420px] w-[420px] rounded-full bg-purple-500/[0.06] blur-[88px] sm:block" />

      {/* =====================================================
          MAIN GRID
      ====================================================== */}

      <div
        className="absolute inset-0"
        style={{
          perspective: '1000px',
        }}
      >
        <div
          className="absolute -inset-[20%]"
          style={{
            transform: 'rotateX(65deg) scale(1.4)',
            transformOrigin: 'center bottom',
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
        </div>
      </div>

      {/* =====================================================
          NORMAL DIGITAL GRID
      ====================================================== */}

      <div
        className="absolute inset-0 opacity-[0.045]"
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

      <div
        className="absolute left-0 right-0 h-px"
        style={{
          top: '58%',
          background: 'linear-gradient(90deg, transparent, rgba(251,191,36,0.35), transparent)',
        }}
      />

      <div className="absolute bottom-[15%] top-[15%] left-[65%] hidden w-px bg-gradient-to-b from-transparent via-amber-300/30 to-transparent sm:block" />

      {/* =====================================================
          FLOATING GRID NODES
      ====================================================== */}

      <div className="hidden sm:block">
        {Array.from({ length: 6 }).map((_, index) => (
          <span
            key={`node-${index}`}
            className="absolute h-1 w-1 rounded-full bg-amber-300/40"
            style={{
              left: `${8 + ((index * 17) % 84)}%`,
              top: `${15 + ((index * 23) % 65)}%`,
            }}
          />
        ))}
      </div>

      {/* =====================================================
          CENTER FOCUS GLOW
      ====================================================== */}

      <div className="absolute left-1/2 top-[42%] h-[260px] w-[260px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400/[0.05] blur-[72px] sm:h-[360px] sm:w-[360px] sm:blur-[96px]" />

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
