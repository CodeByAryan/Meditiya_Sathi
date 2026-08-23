import React, { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link } from "wouter";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { getApiUrl } from "@/lib/utils";
import { VolunteerCard, type Volunteer } from "@/components/VolunteerCard";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";

export type { Volunteer };

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
          <>
            {/* Mobile loading skeleton */}
            <div className="block sm:hidden">
              <div className="flex -ml-3.5 overflow-hidden">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="pl-3.5 basis-[72%] xs:basis-[74%] shrink-0 min-w-0"
                  >
                    <div className="flex flex-col items-center justify-between min-h-[400px] animate-pulse rounded-3xl border border-white/10 bg-card/60 p-4 backdrop-blur-xl">
                      <div className="flex flex-col items-center w-full">
                        <div className="mt-2 mb-4 h-[160px] w-[160px] rounded-full bg-muted/60" />
                        <div className="h-5 w-32 rounded bg-muted/60 mb-2" />
                        <div className="h-5 w-24 rounded-full bg-muted/60" />
                      </div>
                      <div className="w-full border-t border-white/[0.08] pt-3">
                        <div className="mx-auto h-4 w-28 rounded bg-muted/40" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Desktop loading skeleton */}
            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
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
          </>
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
              <CarouselContent className="-ml-3.5 sm:-ml-4">
                {volunteers.map((vol, index) => (
                  <CarouselItem
                    key={vol.id}
                    className="pl-3.5 sm:pl-4 basis-[72%] xs:basis-[74%] sm:basis-1/2 lg:basis-1/3 xl:basis-1/4 min-w-0 shrink-0"
                  >
                    <VolunteerCard vol={vol} idx={index} />
                  </CarouselItem>
                ))}
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
                      className={`h-2 rounded-full transition-all duration-300 ${
                        current === index
                          ? "w-2 bg-amber-400"
                          : "w-2 bg-white/20 hover:bg-white/40"
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
