import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Users, Phone, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getApiUrl } from "@/lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";

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

export default function Volunteers() {
  const { data: volunteers = [], isLoading, isError } = useQuery<Volunteer[]>({
    queryKey: ["volunteers"],
    queryFn: async () => {
      const res = await fetch(`${getApiUrl()}/api/volunteers`);
      if (!res.ok) throw new Error("Failed to load volunteers");
      return res.json();
    },
  });

  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!api) return;
    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());
    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[var(--page-bg)] text-foreground">
      {/* Background & Grid */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-amber-400/10 blur-[140px] dark:bg-amber-400/[0.04]" />
        <div className="absolute -right-32 top-[40%] h-[400px] w-[400px] rounded-full bg-orange-500/[0.05] blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.035] dark:opacity-[0.025]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Hero Section */}
      <section className="relative z-10 overflow-hidden pt-28 pb-14 md:pt-36 md:pb-20">
        <div className="container relative z-10 mx-auto px-4 text-center max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/[0.08] px-4 py-1.5 backdrop-blur-xl">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-300">
                Community Heroes
              </span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-serif text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl"
          >
            Our Volunteers
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg md:text-xl px-2"
          >
            The people who contribute their time, energy and effort to our community.
          </motion.p>
        </div>
      </section>

      {/* Volunteers Content */}
      <section className="relative z-10 mx-auto max-w-7xl px-4 pb-28 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-3xl border border-white/10 bg-card/60 p-5 backdrop-blur-xl"
              >
                <div className="aspect-[4/4.2] w-full rounded-2xl bg-muted/60 mb-4" />
                <div className="h-4 w-24 rounded bg-muted/60 mb-2" />
                <div className="h-6 w-40 rounded bg-muted/60 mb-4" />
                <div className="h-10 w-full rounded-full bg-muted/60" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-3xl border border-destructive/20 bg-card/60 p-12 text-center text-muted-foreground">
            <p className="text-base text-destructive">Unable to load volunteers. Please try again.</p>
          </div>
        ) : volunteers.length === 0 ? (
          <div className="mx-auto max-w-lg rounded-3xl border border-white/10 bg-card/40 p-12 text-center backdrop-blur-xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/10 text-amber-300 mb-4">
              <Users className="h-8 w-8" />
            </div>
            <h3 className="font-serif text-2xl font-bold text-foreground">Our Volunteers</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Our volunteer team will be introduced here soon.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Swipe Carousel (< sm) */}
            <div className="block sm:hidden">
              <Carousel
                setApi={setApi}
                opts={{
                  align: "start",
                  loop: volunteers.length > 2,
                }}
                className="w-full"
              >
                <CarouselContent className="-ml-3">
                  {volunteers.map((vol, idx) => (
                    <CarouselItem
                      key={vol.id}
                      className="pl-3 basis-[84%] shrink-0"
                    >
                      <VolunteerCard vol={vol} idx={idx} />
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>

              {/* Mobile pagination dots */}
              {count > 1 && (
                <div className="mt-6 flex items-center justify-center gap-1.5">
                  {Array.from({ length: count }).map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => api?.scrollTo(index)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        current === index
                          ? "w-6 bg-amber-400"
                          : "w-1.5 bg-white/25 hover:bg-white/40"
                      }`}
                      aria-label={`Go to volunteer ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Desktop & Tablet Responsive Grid (>= sm) */}
            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {volunteers.map((vol, idx) => (
                <VolunteerCard key={vol.id} vol={vol} idx={idx} />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function VolunteerCard({ vol, idx }: { vol: Volunteer; idx: number }) {
  const photoSrc = vol.photo || vol.photoUrl;
  const phoneNum = vol.mobileNumber || vol.phone;
  const posTitle = vol.position || vol.role || "Volunteer";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{
        duration: 0.6,
        delay: (idx % 4) * 0.07,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{ y: -6 }}
      className="group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-card/80 p-4 sm:p-5 shadow-[0_15px_45px_rgba(0,0,0,0.18)] backdrop-blur-2xl transition-all duration-500 hover:border-amber-300/30 hover:bg-card hover:shadow-[0_20px_60px_rgba(245,158,11,0.12)] dark:border-white/[0.08] dark:bg-white/[0.035] dark:hover:border-amber-300/30 dark:hover:bg-white/[0.06]"
    >
      {/* Top shimmer line */}
      <div className="pointer-events-none absolute left-6 right-6 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/40 to-transparent" />

      {/* Top glow */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full bg-amber-400/[0.05] blur-3xl transition-all duration-500 group-hover:bg-amber-400/[0.12]" />

      <div>
        {/* Photo Container */}
        <div className="relative aspect-[4/3.8] sm:aspect-[4/4.2] w-full overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-inner">
          {photoSrc ? (
            <img
              src={photoSrc}
              alt={vol.name}
              loading="lazy"
              className="h-full w-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-amber-500/15 via-white/5 to-transparent text-amber-300">
              <Users className="h-14 w-14 opacity-40 mb-2" />
              <span className="font-serif text-xl font-bold">
                {vol.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
            </div>
          )}

          {/* Photo bottom subtle gradient shadow */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />

          {/* Floating Position Pill */}
          <div className="absolute bottom-2.5 left-2.5 right-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/60 px-2.5 py-1 text-[10px] font-semibold text-amber-200 backdrop-blur-md">
              <Sparkles className="h-2.5 w-2.5 text-amber-300" />
              {posTitle}
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

      {/* Contact Action */}
      <div className="mt-4 border-t border-white/[0.08] pt-3 px-1">
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
            <Badge variant="outline" className="text-[10px]">Active</Badge>
          </div>
        )}
      </div>
    </motion.div>
  );
}

