import { useState } from 'react';
import { useListEvents } from '@workspace/api-client-react';
import { motion } from 'framer-motion';
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  ArrowRight,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function Events() {
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'upcoming' | 'past'
  >('upcoming');

  const { data: events, isLoading } = useListEvents({
    status: statusFilter as any,
  });

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--page-bg)] pb-24 text-foreground">
      {/* =========================================================
          BACKGROUND
      ========================================================== */}

      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        {/* Grid */}
        <div
          className="
            absolute inset-0
            opacity-[0.07]
            bg-[linear-gradient(rgba(255,255,255,0.25)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.25)_1px,transparent_1px)]
            bg-[size:55px_55px]
          "
        />

        {/* Top glow */}
        <div className="absolute left-1/2 top-[-180px] h-[550px] w-[550px] -translate-x-1/2 rounded-full bg-amber-400/[0.08] blur-[140px]" />

        {/* Left glow */}
        <div className="absolute -left-40 top-[35%] h-[400px] w-[400px] rounded-full bg-orange-500/[0.06] blur-[130px]" />

        {/* Right glow */}
        <div className="absolute -right-40 top-[55%] h-[450px] w-[450px] rounded-full bg-purple-500/[0.05] blur-[140px]" />

        {/* Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,#080808_90%)]" />
      </div>

      {/* =========================================================
          HERO
      ========================================================== */}

      <section className="relative px-5 pb-16 pt-28 sm:px-6 md:pt-36">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 35 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.9,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="mx-auto max-w-3xl text-center"
          >
            {/* Eyebrow */}

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 }}
              className="mb-7 flex justify-center"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-4 py-2 backdrop-blur-xl">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />

                <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground sm:text-xs">
                  Meditiya Nagar
                </span>

                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.7)]" />
              </div>
            </motion.div>

            {/* Heading */}

            <motion.h1
              initial={{
                opacity: 0,
                y: 30,
                filter: 'blur(8px)',
              }}
              animate={{
                opacity: 1,
                y: 0,
                filter: 'blur(0px)',
              }}
              transition={{
                delay: 0.25,
                duration: 1,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="
                text-5xl
                font-serif
                font-semibold
                leading-[0.95]
                tracking-[-0.04em]
                text-foreground
                sm:text-6xl
                md:text-7xl
              "
            >
              Moments worth
              <br />

              <span className="bg-gradient-to-r from-amber-200 via-orange-300 to-amber-500 bg-clip-text text-transparent">
                celebrating.
              </span>
            </motion.h1>

            {/* Description */}

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.5,
                duration: 0.8,
              }}
              className="mx-auto mt-7 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg"
            >
              Stay connected with festivals, gatherings, activities and
              everything happening across{' '}
              <span className="font-medium text-foreground">Meditiya Nagar.</span>
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* =========================================================
          EVENT CONTENT
      ========================================================== */}

      <div className="container relative z-10 mx-auto max-w-6xl px-5 sm:px-6">
        {/* FILTER */}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
          className="mb-12 flex justify-center"
        >
          <Tabs
            defaultValue="upcoming"
            className="w-full"
            onValueChange={(value) =>
              setStatusFilter(value as 'all' | 'upcoming' | 'past')
            }
          >
            <div className="flex justify-center">
              <TabsList
                className="
                  h-auto
                  rounded-full
                  border border-white/10
                  bg-white/[0.04]
                  p-1
                  shadow-[0_10px_40px_rgba(0,0,0,0.25)]
                  backdrop-blur-2xl
                "
              >
                <TabsTrigger
                  value="upcoming"
                  className="
                    rounded-full
                    px-5
                    py-2.5
                    text-xs
                    font-medium
                    text-white/45
                    transition-all
                    data-[state=active]:bg-white
                    data-[state=active]:text-black
                    sm:px-7
                  "
                >
                  Upcoming
                </TabsTrigger>

                <TabsTrigger
                  value="past"
                  className="
                    rounded-full
                    px-5
                    py-2.5
                    text-xs
                    font-medium
                    text-white/45
                    transition-all
                    data-[state=active]:bg-white
                    data-[state=active]:text-black
                    sm:px-7
                  "
                >
                  Past
                </TabsTrigger>

                <TabsTrigger
                  value="all"
                  className="
                    rounded-full
                    px-5
                    py-2.5
                    text-xs
                    font-medium
                    text-white/45
                    transition-all
                    data-[state=active]:bg-white
                    data-[state=active]:text-black
                    sm:px-7
                  "
                >
                  All
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent
              value={statusFilter}
              className="mt-0 outline-none"
            >
              {/* =====================================================
                  LOADING
              ====================================================== */}

              {isLoading ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.035]"
                    >
                      <Skeleton className="h-56 w-full bg-white/[0.06]" />

                      <div className="space-y-4 p-6">
                        <Skeleton className="h-6 w-3/4 bg-white/[0.06]" />
                        <Skeleton className="h-4 w-full bg-white/[0.06]" />
                        <Skeleton className="h-4 w-5/6 bg-white/[0.06]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : events?.length === 0 ? (
                /* =====================================================
                    EMPTY STATE
                ====================================================== */

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="
                    rounded-[30px]
                    border border-white/10
                    bg-white/[0.035]
                    px-6
                    py-24
                    text-center
                    backdrop-blur-xl
                  "
                >
                  <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/[0.05]">
                    <Calendar className="h-9 w-9 text-white/30" />
                  </div>

                  <h3 className="font-serif text-2xl font-semibold text-white">
                    No Events Found
                  </h3>

                  <p className="mt-2 text-sm text-white/40">
                    There are currently no{' '}
                    {statusFilter !== 'all' ? statusFilter : ''} events
                    scheduled.
                  </p>
                </motion.div>
              ) : (
                /* =====================================================
                    EVENTS GRID
                ====================================================== */

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {events?.map((event, idx) => (
                    <motion.div
                      key={event.id}
                      initial={{
                        opacity: 0,
                        y: 35,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      transition={{
                        delay: idx * 0.07,
                        duration: 0.7,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    >
                      <Dialog>
                        <DialogTrigger asChild>
                          <motion.div
                            whileHover={{
                              y: -8,
                            }}
                            transition={{
                              duration: 0.3,
                            }}
                            className="
                              group
                              h-full
                              cursor-pointer
                              overflow-hidden
                              rounded-[28px]
                              border
                              border-white/10
                              bg-white/[0.035]
                              backdrop-blur-2xl
                              transition-all
                              duration-500
                              hover:border-amber-300/20
                              hover:bg-white/[0.055]
                              hover:shadow-[0_20px_70px_rgba(0,0,0,0.35)]
                            "
                          >
                            {/* Image */}

                            <div className="relative h-56 overflow-hidden">
                              {event.imageUrl ? (
                                <img
                                  src={event.imageUrl}
                                  alt={event.title}
                                  className="
                                    h-full
                                    w-full
                                    object-cover
                                    transition-transform
                                    duration-700
                                    group-hover:scale-110
                                  "
                                />
                              ) : (
                                <div
                                  className="
                                    absolute
                                    inset-0
                                    flex
                                    items-center
                                    justify-center
                                    bg-gradient-to-br
                                    from-amber-400/10
                                    via-orange-500/[0.04]
                                    to-purple-500/[0.06]
                                  "
                                >
                                  <Calendar className="h-14 w-14 text-white/15" />
                                </div>
                              )}

                              {/* Image overlay */}

                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

                              {/* Status */}

                              <div className="absolute left-4 top-4">
                                <Badge
                                  className={`
                                    rounded-full
                                    border
                                    px-3
                                    py-1
                                    text-[9px]
                                    font-semibold
                                    uppercase
                                    tracking-[0.15em]
                                    backdrop-blur-xl
                                    ${
                                      event.status === 'upcoming'
                                        ? 'border-amber-300/20 bg-amber-300/15 text-amber-200'
                                        : event.status === 'ongoing'
                                          ? 'border-green-300/20 bg-green-300/15 text-green-200'
                                          : 'border-white/10 bg-black/30 text-white/60'
                                    }
                                  `}
                                >
                                  {event.status}
                                </Badge>
                              </div>

                              {/* Category */}

                              {event.category && (
                                <div className="absolute right-4 top-4">
                                  <Badge
                                    variant="outline"
                                    className="
                                      rounded-full
                                      border-white/15
                                      bg-black/30
                                      text-[9px]
                                      uppercase
                                      tracking-wider
                                      text-white/60
                                      backdrop-blur-xl
                                    "
                                  >
                                    {event.category}
                                  </Badge>
                                </div>
                              )}

                              {/* Bottom image information */}

                              <div className="absolute bottom-4 left-5 right-5">
                                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-amber-300/80">
                                  Community Event
                                </p>

                                <h3 className="mt-1 line-clamp-2 font-serif text-xl font-semibold leading-tight text-white">
                                  {event.title}
                                </h3>
                              </div>
                            </div>

                            {/* Content */}

                            <CardContent className="p-6">
                              <div className="space-y-3">
                                {/* Date */}

                                <div className="flex items-start gap-3">
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
                                    <Clock className="h-3.5 w-3.5 text-amber-300" />
                                  </div>

                                  <div>
                                    <p className="text-[9px] uppercase tracking-[0.18em] text-white/30">
                                      Date
                                    </p>

                                    <p className="mt-0.5 text-xs text-white/65">
                                      {formatDate(event.date)}
                                      {event.endDate &&
                                        ` - ${formatDate(event.endDate)}`}
                                    </p>
                                  </div>
                                </div>

                                {/* Location */}

                                <div className="flex items-start gap-3">
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
                                    <MapPin className="h-3.5 w-3.5 text-orange-300" />
                                  </div>

                                  <div className="min-w-0">
                                    <p className="text-[9px] uppercase tracking-[0.18em] text-white/30">
                                      Location
                                    </p>

                                    <p className="mt-0.5 truncate text-xs text-white/65">
                                      {event.location}
                                    </p>
                                  </div>
                                </div>

                                {/* Participants */}

                                {event.maxParticipants && (
                                  <div className="flex items-start gap-3">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
                                      <Users className="h-3.5 w-3.5 text-purple-300" />
                                    </div>

                                    <div>
                                      <p className="text-[9px] uppercase tracking-[0.18em] text-white/30">
                                        Participation
                                      </p>

                                      <p className="mt-0.5 text-xs text-white/65">
                                        {event.registrationCount || 0} /{' '}
                                        {event.maxParticipants} registered
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Description */}

                              <p className="mt-5 line-clamp-2 text-sm leading-6 text-white/35">
                                {event.description}
                              </p>
                            </CardContent>

                            {/* Footer */}

                            <CardFooter className="px-6 pb-6 pt-0">
                              <div
                                className="
                                  flex
                                  w-full
                                  items-center
                                  justify-between
                                  border-t
                                  border-white/[0.07]
                                  pt-5
                                "
                              >
                                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">
                                  View details
                                </span>

                                <div
                                  className="
                                    flex
                                    h-9
                                    w-9
                                    items-center
                                    justify-center
                                    rounded-full
                                    border
                                    border-white/10
                                    bg-white/[0.04]
                                    transition-all
                                    duration-300
                                    group-hover:border-amber-300/20
                                    group-hover:bg-amber-300/10
                                  "
                                >
                                  <ChevronRight
                                    className="
                                      h-4
                                      w-4
                                      text-white/40
                                      transition-all
                                      duration-300
                                      group-hover:translate-x-0.5
                                      group-hover:text-amber-300
                                    "
                                  />
                                </div>
                              </div>
                            </CardFooter>
                          </motion.div>
                        </DialogTrigger>

                        {/* =================================================
                            EVENT DETAILS DIALOG
                        ================================================== */}

                        <DialogContent
                          className="
                            max-h-[90vh]
                            overflow-y-auto
                            border-white/10
                            bg-[#0c0c0c]
                            text-white
                            shadow-[0_30px_100px_rgba(0,0,0,0.6)]
                            sm:max-w-[560px]
                          "
                        >
                          <DialogHeader>
                            <DialogTitle className="font-serif text-2xl font-semibold text-white">
                              {event.title}
                            </DialogTitle>

                            <DialogDescription className="text-white/40">
                              {formatDate(event.date)} at {event.location}
                            </DialogDescription>
                          </DialogHeader>

                          {event.imageUrl && (
                            <div className="relative mt-4 overflow-hidden rounded-2xl">
                              <img
                                src={event.imageUrl}
                                alt={event.title}
                                className="h-56 w-full object-cover"
                              />

                              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                            </div>
                          )}

                          <div className="space-y-5 py-4">
                            {/* Event metadata */}

                            <div className="grid grid-cols-2 gap-3">
                              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                                <Clock className="mb-2 h-4 w-4 text-amber-300" />

                                <p className="text-[9px] uppercase tracking-[0.2em] text-white/30">
                                  Date
                                </p>

                                <p className="mt-1 text-sm text-white/70">
                                  {formatDate(event.date)}
                                </p>
                              </div>

                              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                                <MapPin className="mb-2 h-4 w-4 text-orange-300" />

                                <p className="text-[9px] uppercase tracking-[0.2em] text-white/30">
                                  Location
                                </p>

                                <p className="mt-1 truncate text-sm text-white/70">
                                  {event.location}
                                </p>
                              </div>
                            </div>

                            <div>
                              <p className="text-[9px] uppercase tracking-[0.2em] text-white/30">
                                About the event
                              </p>

                              <p className="mt-2 text-sm leading-7 text-white/60">
                                {event.description}
                              </p>
                            </div>
                          </div>

                          {event.status === 'upcoming' && (
                            <div className="mt-2">
                              <Button
                                className="
                                  w-full
                                  rounded-full
                                  bg-white
                                  py-6
                                  font-semibold
                                  text-black
                                  shadow-[0_10px_40px_rgba(255,255,255,0.08)]
                                  hover:bg-white/90
                                "
                              >
                                Confirm Registration
                                <ArrowRight className="ml-2 h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}