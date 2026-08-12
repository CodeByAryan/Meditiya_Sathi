import { useListServiceRequests } from '@workspace/api-client-react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Wrench,
  Zap,
  Droplets,
  ShieldAlert,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  Plus,
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function Services() {
  const { data: requests, isLoading } = useListServiceRequests();
  const reduceMotion = useReducedMotion();

  const categories = [
    {
      id: 'electrician',
      name: 'Electrician',
      description: 'Electrical issues & repairs',
      icon: Zap,
      color: 'text-yellow-300',
      glow: 'bg-yellow-400/10',
      border: 'group-hover:border-yellow-300/30',
    },
    {
      id: 'plumber',
      name: 'Plumber',
      description: 'Water & plumbing issues',
      icon: Droplets,
      color: 'text-blue-300',
      glow: 'bg-blue-400/10',
      border: 'group-hover:border-blue-300/30',
    },
    {
      id: 'maintenance',
      name: 'Maintenance',
      description: 'General society maintenance',
      icon: Wrench,
      color: 'text-orange-300',
      glow: 'bg-orange-400/10',
      border: 'group-hover:border-orange-300/30',
    },
    {
      id: 'security',
      name: 'Security',
      description: 'Safety & security concerns',
      icon: ShieldAlert,
      color: 'text-red-300',
      glow: 'bg-red-400/10',
      border: 'group-hover:border-red-300/30',
    },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--page-bg)] text-foreground">
      {/* =====================================================
          BACKGROUND
      ====================================================== */}

      <div className="pointer-events-none fixed inset-0 -z-10">
        {/* Grid */}
        <div
          className="
            absolute inset-0
            opacity-[0.16]
            [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)]
            [background-size:55px_55px]
          "
        />

        {/* Center glow */}
        <motion.div
          className="
            absolute
            left-1/2
            top-0
            h-[550px]
            w-[550px]
            -translate-x-1/2
            rounded-full
            bg-amber-400/10
            blur-[150px]
          "
          animate={
            reduceMotion
              ? undefined
              : {
                  scale: [1, 1.12, 1],
                  opacity: [0.25, 0.45, 0.25],
                }
          }
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Left glow */}
        <motion.div
          className="
            absolute
            -left-48
            top-[35%]
            h-[450px]
            w-[450px]
            rounded-full
            bg-orange-500/10
            blur-[140px]
          "
          animate={
            reduceMotion
              ? undefined
              : {
                  x: [0, 40, 0],
                  y: [0, -30, 0],
                }
          }
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Right glow */}
        <motion.div
          className="
            absolute
            -right-48
            top-[55%]
            h-[450px]
            w-[450px]
            rounded-full
            bg-purple-500/10
            blur-[140px]
          "
          animate={
            reduceMotion
              ? undefined
              : {
                  x: [0, -40, 0],
                  y: [0, 30, 0],
                }
          }
          transition={{
            duration: 14,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      {/* =====================================================
          FLOATING PARTICLES
      ====================================================== */}

      <div className="pointer-events-none fixed inset-0 -z-10">
        {[...Array(20)].map((_, index) => (
          <motion.span
            key={index}
            className="absolute h-[2px] w-[2px] rounded-full bg-amber-200/40"
            style={{
              left: `${(index * 19) % 96}%`,
              top: `${(index * 31) % 94}%`,
            }}
            animate={
              reduceMotion
                ? undefined
                : {
                    y: [-10, -30, -10],
                    opacity: [0.1, 0.6, 0.1],
                  }
            }
            transition={{
              duration: 3 + (index % 4),
              repeat: Infinity,
              delay: index * 0.2,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* =====================================================
          HERO
      ====================================================== */}

      <section className="relative overflow-hidden px-4 pb-16 pt-24 sm:px-6">
        {/* Hero overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-amber-400/[0.04] via-transparent to-transparent" />

        <div className="container relative mx-auto max-w-6xl">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: {
                transition: {
                  staggerChildren: 0.1,
                },
              },
            }}
            className="text-center"
          >
            {/* Eyebrow */}
            <motion.div
              variants={{
                hidden: {
                  opacity: 0,
                  y: 15,
                },
                visible: {
                  opacity: 1,
                  y: 0,
                },
              }}
              className="mb-6 flex justify-center"
            >
              <div
                className="
                  inline-flex
                  items-center
                  gap-2
                  rounded-full
                  border
                  border-white/10
                  bg-white/[0.04]
                  px-4
                  py-2
                  backdrop-blur-xl
                "
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />

                <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/60 sm:text-xs">
                  Community Support
                </span>

                <span className="h-1.5 w-1.5 rounded-full bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.8)]" />
              </div>
            </motion.div>

            {/* Heading */}
            <motion.h1
              variants={{
                hidden: {
                  opacity: 0,
                  y: 30,
                  filter: 'blur(8px)',
                },
                visible: {
                  opacity: 1,
                  y: 0,
                  filter: 'blur(0px)',
                  transition: {
                    duration: 0.9,
                    ease: [0.22, 1, 0.36, 1],
                  },
                },
              }}
              className="
                mx-auto
                max-w-4xl
                text-5xl
                font-serif
                font-semibold
                leading-[0.95]
                tracking-[-0.04em]
                text-white
                sm:text-6xl
                md:text-7xl
              "
            >
              Community
              <br />
              <span className="bg-gradient-to-r from-amber-200 via-orange-300 to-amber-500 bg-clip-text text-transparent">
                Services.
              </span>
            </motion.h1>

            {/* Description */}
            <motion.p
              variants={{
                hidden: {
                  opacity: 0,
                  y: 20,
                },
                visible: {
                  opacity: 1,
                  y: 0,
                },
              }}
              className="
                mx-auto
                mt-7
                max-w-2xl
                text-base
                leading-7
                text-white/50
                sm:text-lg
              "
            >
              From everyday maintenance to urgent issues, raise a request
              and let the community management take care of it.
            </motion.p>

            {/* CTA */}
            <motion.div
              variants={{
                hidden: {
                  opacity: 0,
                  y: 20,
                },
                visible: {
                  opacity: 1,
                  y: 0,
                },
              }}
              className="mt-8 flex justify-center"
            >
              <Button
                className="
                  group
                  rounded-full
                  bg-white
                  px-7
                  py-6
                  font-semibold
                  text-black
                  shadow-[0_0_40px_rgba(255,255,255,0.10)]
                  transition-all
                  hover:bg-white
                "
              >
                <Plus className="mr-2 h-4 w-4" />
                Raise New Request
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* =====================================================
          SERVICES
      ====================================================== */}

      <section className="relative px-4 py-8 sm:px-6">
        <div className="container mx-auto max-w-6xl">

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-7"
          >
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-300/70">
              What do you need?
            </p>

            <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Choose a service
            </h2>

            <p className="mt-2 text-sm text-white/40">
              Select the category that best matches your request.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
            {categories.map((cat, index) => {
              const Icon = cat.icon;

              return (
                <motion.div
                  key={cat.id}
                  initial={{
                    opacity: 0,
                    y: 25,
                  }}
                  whileInView={{
                    opacity: 1,
                    y: 0,
                  }}
                  viewport={{ once: true }}
                  transition={{
                    delay: index * 0.08,
                    duration: 0.6,
                  }}
                  whileHover={{
                    y: -6,
                  }}
                  className="group"
                >
                  <Card
                    className={`
                      relative
                      h-full
                      overflow-hidden
                      rounded-2xl
                      border
                      border-white/10
                      bg-white/[0.035]
                      backdrop-blur-2xl
                      transition-all
                      duration-500
                      hover:bg-white/[0.06]
                      ${cat.border}
                    `}
                  >
                    <CardContent className="relative p-5 sm:p-7">

                      {/* Glow */}
                      <div
                        className={`
                          pointer-events-none
                          absolute
                          -right-10
                          -top-10
                          h-32
                          w-32
                          rounded-full
                          ${cat.glow}
                          blur-3xl
                          opacity-0
                          transition-opacity
                          duration-500
                          group-hover:opacity-100
                        `}
                      />

                      <div className="relative">
                        <div
                          className={`
                            mb-5
                            flex
                            h-12
                            w-12
                            items-center
                            justify-center
                            rounded-xl
                            border
                            border-white/10
                            ${cat.glow}
                            ${cat.color}
                            transition-transform
                            duration-500
                            group-hover:scale-110
                          `}
                        >
                          <Icon className="h-6 w-6" />
                        </div>

                        <h3 className="font-semibold text-white">
                          {cat.name}
                        </h3>

                        <p className="mt-1 text-xs leading-5 text-white/35">
                          {cat.description}
                        </p>

                        <div className="mt-5 flex items-center text-[10px] font-medium uppercase tracking-wider text-white/30 transition-colors group-hover:text-amber-300">
                          Request service
                          <ArrowRight className="ml-2 h-3 w-3 transition-transform group-hover:translate-x-1" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================
          RECENT REQUESTS
      ====================================================== */}

      <section className="relative px-4 pb-24 pt-16 sm:px-6">
        <div className="container mx-auto max-w-6xl">

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-7 flex items-end justify-between"
          >
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-300/70">
                Community activity
              </p>

              <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Recent Requests
              </h2>
            </div>
          </motion.div>

          <Card
            className="
              overflow-hidden
              rounded-2xl
              border
              border-white/10
              bg-white/[0.035]
              backdrop-blur-2xl
            "
          >
            {isLoading ? (
              <div className="p-12 text-center">
                <motion.div
                  animate={
                    reduceMotion
                      ? undefined
                      : {
                          rotate: 360,
                        }
                  }
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                  className="
                    mx-auto
                    mb-4
                    h-8
                    w-8
                    rounded-full
                    border-2
                    border-white/10
                    border-t-amber-300
                  "
                />

                <p className="text-sm text-white/40">
                  Loading requests...
                </p>
              </div>
            ) : requests?.length === 0 ? (
              <div className="p-16 text-center">
                <div
                  className="
                    mx-auto
                    mb-5
                    flex
                    h-16
                    w-16
                    items-center
                    justify-center
                    rounded-2xl
                    border
                    border-white/10
                    bg-white/[0.04]
                  "
                >
                  <CheckCircle2 className="h-7 w-7 text-white/30" />
                </div>

                <p className="font-medium text-white">
                  No active service requests
                </p>

                <p className="mt-1 text-sm text-white/35">
                  Everything is running smoothly.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.07]">
                {requests?.map((req, index) => (
                  <motion.div
                    key={req.id}
                    initial={{
                      opacity: 0,
                      y: 10,
                    }}
                    whileInView={{
                      opacity: 1,
                      y: 0,
                    }}
                    viewport={{ once: true }}
                    transition={{
                      delay: index * 0.04,
                    }}
                    className="
                      group
                      flex
                      flex-col
                      gap-5
                      p-5
                      transition-colors
                      hover:bg-white/[0.025]
                      md:flex-row
                      md:items-center
                      md:justify-between
                      md:p-6
                    "
                  >
                    <div className="min-w-0 flex-1">

                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className="
                            border-white/10
                            bg-white/[0.04]
                            text-[10px]
                            font-medium
                            uppercase
                            tracking-wider
                            text-white/60
                          "
                        >
                          {req.category.replace('_', ' ')}
                        </Badge>

                        <span className="flex items-center gap-1 text-[11px] text-white/30">
                          <Clock className="h-3 w-3" />
                          {formatDate(req.createdAt)}
                        </span>
                      </div>

                      <p className="mb-2 text-base font-medium text-white sm:text-lg">
                        {req.description}
                      </p>

                      <p className="text-xs text-white/35">
                        <span className="font-medium text-white/60">
                          {req.requesterName}
                        </span>

                        {req.flatNumber &&
                          ` • Flat ${req.flatNumber}`}
                      </p>
                    </div>

                    <div className="shrink-0">
                      <Badge
                        variant="outline"
                        className={`
                          rounded-full
                          px-3
                          py-1.5
                          text-[10px]
                          font-semibold
                          tracking-wider
                          ${
                            req.status === 'resolved'
                              ? 'border-green-400/20 bg-green-400/10 text-green-300'
                              : req.status === 'in_progress'
                                ? 'border-blue-400/20 bg-blue-400/10 text-blue-300'
                                : 'border-amber-400/20 bg-amber-400/10 text-amber-300'
                          }
                        `}
                      >
                        {req.status === 'resolved' ? (
                          <CheckCircle2 className="mr-1.5 h-3 w-3" />
                        ) : req.status === 'in_progress' ? (
                          <Zap className="mr-1.5 h-3 w-3" />
                        ) : (
                          <Clock className="mr-1.5 h-3 w-3" />
                        )}

                        {req.status
                          .replace('_', ' ')
                          .toUpperCase()}
                      </Badge>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </section>

      {/* Bottom glow */}
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-64 w-[80%] -translate-x-1/2 rounded-full bg-amber-400/[0.04] blur-[120px]" />
    </main>
  );
}