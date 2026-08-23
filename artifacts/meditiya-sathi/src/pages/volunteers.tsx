import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Users, ShieldCheck, Heart, Sparkles, Hand } from "lucide-react";
import { getApiUrl } from "@/lib/utils";
import { VolunteerCard, type Volunteer } from "@/components/VolunteerCard";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";

export type { Volunteer };

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
      <section className="relative z-10 overflow-hidden pt-24 pb-8 md:pt-32 md:pb-14">
        <div className="container relative z-10 mx-auto px-4 text-center max-w-3xl">
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground"
          >
            Our{" "}
            <span className="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">
              Volunteers
            </span>
          </motion.h1>

          {/* Decorative Divider with Community Icon: — 👥 — */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="my-3 flex items-center justify-center gap-3"
          >
            <span className="h-px w-10 bg-gradient-to-r from-transparent to-amber-400/60" />
            <Users className="h-4 w-4 text-amber-400/90" />
            <span className="h-px w-10 bg-gradient-to-l from-transparent to-amber-400/60" />
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base px-2"
          >
            The people who contribute their time, energy and effort to our community.
          </motion.p>
        </div>
      </section>

      {/* Volunteers Content */}
      <section className="relative z-10 mx-auto max-w-7xl px-4 pb-28 sm:px-6 lg:px-8">
        {isLoading ? (
          <>
            {/* Mobile loading skeleton */}
            <div className="block sm:hidden">
              <div className="flex -ml-3.5 overflow-hidden">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="pl-3.5 basis-[68%] xs:basis-[70%] shrink-0 min-w-0"
                  >
                    <div className="flex flex-col items-center justify-between min-h-[350px] animate-pulse rounded-3xl border border-white/10 bg-card/60 p-4 backdrop-blur-xl">
                      <div className="flex flex-col items-center w-full">
                        <div className="mt-1 mb-4 h-32 w-32 xs:h-36 xs:w-36 rounded-full bg-muted/60" />
                        <div className="h-4 w-28 rounded bg-muted/60 mb-2" />
                        <div className="h-5 w-20 rounded-full bg-muted/60" />
                      </div>
                      <div className="w-full border-t border-white/[0.08] pt-2.5">
                        <div className="mx-auto h-3 w-20 rounded bg-muted/40" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Desktop loading skeleton */}
            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
          </>
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
                <CarouselContent className="-ml-3.5">
                  {volunteers.map((vol, idx) => (
                    <CarouselItem
                      key={vol.id}
                      className="pl-3.5 basis-[72%] xs:basis-[74%] min-w-0 shrink-0"
                    >
                      <VolunteerCard vol={vol} idx={idx} />
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>

              {/* Mobile pagination dots */}
              {count > 1 && (
                <div className="mt-5 flex items-center justify-center gap-1.5">
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
                      aria-label={`Go to volunteer ${index + 1}`}
                    />
                  ))}
                </div>
              )}

              {/* Bottom Values Floating Bar */}
              <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-white/10 bg-[#121316]/80 p-3.5 backdrop-blur-xl shadow-lg">
                <div className="grid grid-cols-3 gap-2 text-left">
                  {/* Dedicated */}
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10 text-amber-400">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white leading-tight">Dedicated</p>
                      <p className="text-[10px] text-muted-foreground leading-tight truncate">Always Ready</p>
                    </div>
                  </div>
                  {/* Passionate */}
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-rose-400/20 bg-rose-400/10 text-rose-400">
                      <Heart className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white leading-tight">Passionate</p>
                      <p className="text-[10px] text-muted-foreground leading-tight truncate">For Community</p>
                    </div>
                  </div>
                  {/* Together */}
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-400">
                      <Users className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white leading-tight">Together</p>
                      <p className="text-[10px] text-muted-foreground leading-tight truncate">We Grow</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Swipe to see more volunteers hint */}
              <div className="mt-4 flex items-center justify-center gap-1.5 text-xs font-medium text-amber-400/80">
                <Hand className="h-3.5 w-3.5 animate-pulse text-amber-400" />
                <span>Swipe to see more volunteers</span>
              </div>
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

