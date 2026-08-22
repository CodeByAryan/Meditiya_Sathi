import React, { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link } from "wouter";
import {
  Users,
  Phone,
  Sparkles,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
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

export default function VolunteersSection() {
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

  const scrollPrev = useCallback(() => {
    api?.scrollPrev();
  }, [api]);

  const scrollNext = useCallback(() => {
    api?.scrollNext();
  }, [api]);

  // If error or zero volunteers, gracefully hide the section from homepage
  if (isError || (!isLoading && volunteers.length === 0)) {
    return null;
  }

  return (
    <section className="relative overflow-hidden py-20 sm:py-24 md:py-28 bg-[color:var(--page-bg-soft)]">
      {/* Background Grid Pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025] dark:opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Ambient Lighting Glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 hidden h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400/[0.04] blur-[90px] sm:block" />
      <div className="pointer-events-none absolute -right-24 top-1/3 h-52 w-52 rounded-full bg-orange-500/[0.03] blur-[70px]" />

      <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
        {/* =====================================================
            HEADER
        ====================================================== */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end"
        >
          <div>
            {/* Label */}
            <div className="mb-4 flex items-center gap-3">
              <span className="h-px w-10 bg-gradient-to-r from-transparent to-amber-300/60" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-300/80">
                Community Support
              </span>
            </div>

            {/* Heading */}
            <h2 className="text-3xl font-serif font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
              Meet Our{" "}
              <span className="bg-gradient-to-r from-amber-600 via-orange-500 to-amber-500 bg-clip-text text-transparent dark:from-amber-200 dark:via-orange-300 dark:to-amber-400">
                Volunteers
              </span>
            </h2>

            {/* Subheading */}
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              The people who give their time, energy and heart to our community.
            </p>
          </div>

          {/* Desktop Actions (View All & Navigation Buttons) */}
          <div className="flex items-center gap-3">
            <Link
              href="/volunteers"
              className="group inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-600 transition-colors hover:text-amber-500 dark:text-amber-300 dark:hover:text-amber-200"
            >
              <span>View All Volunteers</span>
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>

            {/* Nav arrows on desktop */}
            <div className="hidden sm:flex items-center gap-2 ml-4">
              <button
                type="button"
                onClick={scrollPrev}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-foreground/70 backdrop-blur-md transition-all hover:border-amber-300/30 hover:bg-amber-300/10 hover:text-amber-300 active:scale-95"
                aria-label="Previous volunteers"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={scrollNext}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-foreground/70 backdrop-blur-md transition-all hover:border-amber-300/30 hover:bg-amber-300/10 hover:text-amber-300 active:scale-95"
                aria-label="Next volunteers"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* =====================================================
            CAROUSEL OF VOLUNTEERS
        ====================================================== */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-3xl border border-white/10 bg-card/60 p-5 backdrop-blur-xl"
              >
                <div className="aspect-[4/4.2] w-full rounded-2xl bg-muted/60 mb-4" />
                <div className="h-4 w-24 rounded bg-muted/60 mb-2" />
                <div className="h-6 w-36 rounded bg-muted/60 mb-4" />
                <div className="h-10 w-full rounded-full bg-muted/60" />
              </div>
            ))}
          </div>
        ) : (
          <div>
            <Carousel
              setApi={setApi}
              opts={{
                align: "start",
                loop: volunteers.length > 4,
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-3 sm:-ml-4">
                {volunteers.map((vol, index) => {
                  const photoSrc = vol.photo || vol.photoUrl;
                  const phoneNum = vol.mobileNumber || vol.phone;
                  const posTitle = vol.position || vol.role || "Volunteer";

                  return (
                    <CarouselItem
                      key={vol.id}
                      className="pl-3 sm:pl-4 basis-[84%] sm:basis-1/2 lg:basis-1/3 xl:basis-1/4 shrink-0"
                    >
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.2 }}
                        transition={{
                          duration: 0.6,
                          delay: index * 0.05,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        whileHover={{ y: -6 }}
                        className="group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-border bg-card/85 p-4 sm:p-5 shadow-[0_15px_40px_rgba(0,0,0,0.15)] backdrop-blur-2xl transition-all duration-500 hover:border-amber-300/30 hover:bg-card hover:shadow-[0_20px_60px_rgba(245,158,11,0.10)] dark:border-white/[0.10] dark:bg-white/[0.035] dark:hover:border-amber-300/30 dark:hover:bg-white/[0.06]"
                      >
                        {/* Shimmer accent line */}
                        <div className="pointer-events-none absolute left-6 right-6 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/40 to-transparent" />

                        {/* Top glow */}
                        <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-amber-400/[0.05] blur-2xl transition-all duration-500 group-hover:bg-amber-400/[0.12]" />

                        <div>
                          {/* Photo Frame */}
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

                            {/* Gradient overlay on bottom */}
                            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />

                            {/* Position Pill */}
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
                        <div className="mt-4 border-t border-border/60 dark:border-white/[0.07] pt-3 px-1">
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
                              <span>Active Volunteer</span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    </CarouselItem>
                  );
                })}
              </CarouselContent>
            </Carousel>

            {/* Pagination indicators and mobile CTA */}
            <div className="mt-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
              {/* Dots */}
              {count > 1 && (
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: count }).map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => api?.scrollTo(index)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        current === index
                          ? "w-6 bg-amber-400"
                          : "w-1.5 bg-white/20 hover:bg-white/40"
                      }`}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>
              )}

              {/* Mobile View All CTA */}
              <div className="sm:hidden">
                <Link
                  href="/volunteers"
                  className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-5 py-2 text-xs font-bold text-amber-300"
                >
                  <span>View All Volunteers</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
