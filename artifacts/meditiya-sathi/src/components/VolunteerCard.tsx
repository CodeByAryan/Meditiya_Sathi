import React, { useState } from "react";
import { motion } from "framer-motion";
import { Users, Phone, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface Volunteer {
  id: number;
  name: string;
  photo?: string | null;
  photoUrl?: string | null;
  mobileNumber?: string | null;
  phone?: string | null;
  position?: string | null;
  role?: string | null;
  displayPosition: number;
}

interface VolunteerCardProps {
  vol: Volunteer;
  idx: number;
  className?: string;
}

export function VolunteerCard({ vol, idx, className = "" }: VolunteerCardProps) {
  const [imgError, setImgError] = useState(false);
  const photoSrc = !imgError ? vol.photo || vol.photoUrl : null;
  const phoneNum = vol.mobileNumber || vol.phone;
  const posTitle = vol.position || vol.role || "Volunteer";

  const initials =
    vol.name
      ?.split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "V";

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{
        duration: 0.5,
        delay: (idx % 4) * 0.06,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{ y: -4 }}
      className={`group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-card/80 shadow-[0_15px_45px_rgba(0,0,0,0.18)] backdrop-blur-2xl transition-all duration-500 hover:border-amber-300/30 hover:bg-card hover:shadow-[0_20px_60px_rgba(245,158,11,0.12)] dark:border-white/[0.08] dark:bg-white/[0.035] dark:hover:border-amber-300/30 dark:hover:bg-white/[0.06] p-4 sm:p-5 ${className}`}
    >
      {/* Top shimmer accent line */}
      <div className="pointer-events-none absolute left-6 right-6 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/40 to-transparent" />

      {/* Ambient background glow */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-amber-400/[0.05] blur-2xl transition-all duration-500 group-hover:bg-amber-400/[0.14]" />

      {/* ==============================================================
          MOBILE LAYOUT (< sm)
          PORTRAIT CARD (MATCHING USER SCREENSHOT SPEC):
          1. Large circular photo with radiant golden halo glow (160px-175px)
          2. Volunteer Name (serif bold, centered) + gold accent dot
          3. Position pill (amber badge with sparkle icon)
          4. Subtle divider line
          5. Contact number (subtle phone icon + text)
          ============================================================== */}
      <div className="flex sm:hidden flex-col items-center justify-between h-full min-h-[400px] text-center w-full py-1">
        {/* Top & Middle: Photo + Name + Position */}
        <div className="flex flex-col items-center w-full">
          {/* Large Circular Photo Frame with Radiant Golden Halo */}
          <div className="relative mt-2 mb-4 flex items-center justify-center">
            {/* Radiant golden halo glow behind */}
            <div className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-amber-500/40 via-yellow-400/35 to-amber-300/45 blur-xl opacity-90 transition-all duration-500 group-hover:scale-110 group-hover:opacity-100" />
            <div className="absolute inset-0 rounded-full bg-amber-400/30 blur-md" />

            {/* Gradient Gold Ring Frame */}
            <div className="relative h-[160px] w-[160px] xs:h-[175px] xs:w-[175px] shrink-0 rounded-full p-[2.5px] bg-gradient-to-b from-amber-300 via-amber-500 to-amber-600 shadow-[0_8px_30px_rgba(245,158,11,0.28)]">
              <div className="h-full w-full rounded-full overflow-hidden bg-black/60">
                {photoSrc ? (
                  <img
                    src={photoSrc}
                    alt={vol.name}
                    loading="lazy"
                    className="h-full w-full rounded-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-amber-500/25 via-amber-400/10 to-orange-500/20 text-amber-300">
                    <Users className="h-12 w-12 opacity-50 mb-1" />
                    <span className="font-serif text-2xl font-bold tracking-wider">
                      {initials}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Volunteer Name */}
          <h3
            className="font-serif text-xl xs:text-2xl font-bold tracking-normal text-white line-clamp-1 px-1 transition-colors duration-300 group-hover:text-amber-300"
            title={vol.name}
          >
            {vol.name}
          </h3>

          {/* Gold Accent Dot */}
          <div className="my-1.5 flex items-center justify-center">
            <span className="h-1 w-1 rounded-full bg-amber-400/80 shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
          </div>

          {/* Dynamic Position Pill */}
          <div className="mt-1 flex items-center justify-center px-1">
            <span className="inline-flex max-w-[200px] items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/[0.08] px-3.5 py-1 text-xs font-semibold text-amber-300 shadow-[0_2px_10px_rgba(245,158,11,0.08)] backdrop-blur-md">
              <Sparkles className="h-3 w-3 shrink-0 text-amber-400" />
              <span className="truncate" title={posTitle}>
                {posTitle}
              </span>
            </span>
          </div>
        </div>

        {/* Bottom Section: Divider + Contact info */}
        <div className="w-full mt-4">
          <div className="mb-3 w-3/4 mx-auto h-px bg-gradient-to-r from-transparent via-white/[0.1] to-transparent" />
          <div className="flex items-center justify-center pb-1">
            {phoneNum ? (
              <a
                href={`tel:${phoneNum}`}
                className="inline-flex items-center justify-center gap-2 text-sm font-medium text-white/70 hover:text-amber-300 transition-colors py-0.5 px-2"
                aria-label={`Call ${vol.name} at ${phoneNum}`}
              >
                <Phone className="h-3.5 w-3.5 text-white/50 shrink-0" />
                <span className="truncate">{phoneNum}</span>
              </a>
            ) : (
              <span className="text-xs text-white/40 py-0.5">
                Meditiya Volunteer
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ==============================================================
          DESKTOP LAYOUT (>= sm)
          Existing rich desktop card preserved
          ============================================================== */}
      <div className="hidden sm:flex sm:flex-col sm:justify-between sm:h-full w-full">
        <div>
          {/* Rectangular Photo Frame */}
          <div className="relative aspect-[4/4.2] w-full overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-inner">
            {photoSrc ? (
              <img
                src={photoSrc}
                alt={vol.name}
                loading="lazy"
                className="h-full w-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-amber-500/15 via-white/5 to-transparent text-amber-300">
                <Users className="h-14 w-14 opacity-40 mb-2" />
                <span className="font-serif text-xl font-bold">
                  {initials}
                </span>
              </div>
            )}

            {/* Photo bottom gradient shadow */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />

            {/* Floating Position Pill on Desktop */}
            <div className="absolute bottom-2.5 left-2.5 right-2.5">
              <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/20 bg-black/60 px-2.5 py-1 text-[10px] font-semibold text-amber-200 backdrop-blur-md">
                <Sparkles className="h-2.5 w-2.5 shrink-0 text-amber-300" />
                <span className="truncate">{posTitle}</span>
              </span>
            </div>
          </div>

          {/* Volunteer Name */}
          <div className="mt-3.5 px-1">
            <h3 className="font-serif text-lg sm:text-xl font-bold tracking-tight text-foreground transition-colors duration-300 group-hover:text-amber-300">
              {vol.name}
            </h3>
          </div>
        </div>

        {/* Desktop Contact Action */}
        <div className="mt-4 border-t border-white/[0.08] dark:border-white/[0.07] pt-3 px-1">
          {phoneNum ? (
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground">
                  Contact
                </p>
                <p className="truncate text-xs font-medium text-foreground">
                  {phoneNum}
                </p>
              </div>
              <a
                href={`tel:${phoneNum}`}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-200 via-orange-300 to-amber-400 px-3.5 py-1.5 text-xs font-bold text-black shadow-[0_3px_12px_rgba(245,158,11,0.2)] transition-all duration-300 hover:scale-105 hover:brightness-110 active:scale-95"
                aria-label={`Call ${vol.name}`}
              >
                <Phone className="h-3 w-3 fill-black" />
                Call
              </a>
            </div>
          ) : (
            <div className="flex items-center justify-between text-xs text-muted-foreground py-0.5">
              <span>Meditiya Volunteer</span>
              <Badge variant="outline" className="text-[10px]">
                Active
              </Badge>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default VolunteerCard;
