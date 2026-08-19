import React from 'react';
import { Link } from 'wouter';
import { motion, type Variants } from 'framer-motion';

import {
  Building2,
  Users,
  Calendar,
  Bell,
  Image as ImageIcon,
  Heart,
  Trophy,
  Wrench,
  ShoppingBag,
  Package,
  MapPin,
  Shield,
  ClipboardList,
  HeartHandshake,
  Shirt,
  QrCode,
  ChevronRight,
  Sparkles,
  Search,
  Activity,
  ArrowLeft,
  Wallet,
 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAdminAuth } from '@/lib/AdminAuthContext';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

/* =========================================================
   ANIMATION VARIANTS
   ========================================================= */

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.07,
    },
  },
};

const itemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      ease: 'easeOut',
    },
  },
};

const heroVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 25,
    filter: 'blur(8px)',
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

/* =========================================================
   TYPES
   ========================================================= */

type Section = {
  name: string;
  description: string;
  icon: React.ElementType;
  href: string | null;
};

/* =========================================================
   ADMIN PAGE
   ========================================================= */

export default function Admin() {
  const {
    user,
    isSuperAdmin,
    isAdmin,
    isVolunteer,
    canManageBuildings,
    canManageResidents,
    canManageFestivals,
    canManageVolunteers,
    canManageAdmins,
  } = useAdminAuth();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const adminName = user?.fullName?.trim() || user?.username?.trim() || user?.email?.split('@')[0] || 'Admin';

  /* =======================================================
     DASHBOARD MODULES
     ======================================================= */

  const sections: Section[] = [
    ...(canManageAdmins
      ? [
          {
            name: 'Admin Management',
            description: 'Manage administrators and access',
            icon: Shield,
            href: '/admin/admin-management',
          },
        ]
      : []),

    ...(canManageBuildings
      ? [
          {
            name: 'Building',
            description: 'Manage buildings and wings',
            icon: Building2,
            href: '/admin/buildings',
          },
        ]
      : []),

    ...(canManageResidents
      ? [
          {
            name: 'Resident',
            description: 'View and manage residents',
            icon: Users,
            href: '/admin/residents-list',
          },
        ]
      : []),

    ...(canManageFestivals
      ? [
          {
            name: 'Festival',
            description: 'Manage festivals and collections',
            icon: MapPin,
            href: '/admin/festivals',
          },
          {
            name: 'Festival Expenses',
            description: 'Track money out and festival balances',
            icon: Wallet,
            href: '/admin/festival-expenses',
          },
        ]
      : []),

    ...(isVolunteer
      ? [
          {
            name: 'Festival Collection',
            description: 'Manage assigned collections',
            icon: Heart,
            href: '/admin/festivals',
          },
        ]
      : []),

    {
      name: 'Events',
      description: 'Manage society events',
      icon: Calendar,
      href: '/admin/events',
    },

    ...(canManageFestivals
      ? [
          {
            name: 'Add Donation',
            description: 'Record a new donation',
            icon: Heart,
            href: '/admin/donations/add',
          },
          {
            name: 'Outsider Donations',
            description: 'Manage outsider contributions',
            icon: HeartHandshake,
            href: '/admin/outsider-donations',
          },
          {
            name: 'T-Shirt Registration',
            description: 'Manage T-shirt registrations',
            icon: Shirt,
            href: '/admin/tshirt-registrations',
          },
          {
            name: 'T-Shirt Distribution',
            description: 'Scan QR & verify T-shirt handover',
            icon: QrCode,
            href: '/tshirt-distribution',
          },
        ]
      : []),

    ...(isVolunteer
      ? [
          {
            name: 'T-Shirt Registration',
            description: 'Manage assigned registrations',
            icon: Shirt,
            href: '/admin/tshirt-registrations',
          },
          {
            name: 'T-Shirt Distribution',
            description: 'Scan QR & verify T-shirt handover',
            icon: QrCode,
            href: '/tshirt-distribution',
          },
          {
            name: 'Collection Tasks',
            description: 'View your collection tasks',
            icon: ClipboardList,
            href: '/admin/festivals',
          },
        ]
      : []),

    ...(!isVolunteer
      ? [
          {
            name: 'Gallery',
            description: 'Manage society photos',
            icon: ImageIcon,
            href: '/admin/gallery',
          },
          {
            name: 'Notices',
            description: 'Post society announcements',
            icon: Bell,
            href: '/admin/notices',
          },
          {
            name: 'Committee Members',
            description: 'Manage committee members',
            icon: Shield,
            href: '/admin/committee',
          },
        ]
      : []),

    ...(canManageVolunteers
      ? [
          {
            name: 'Volunteers',
            description: 'Manage society volunteers',
            icon: Users,
            href: '/admin/admin-management',
          },
        ]
      : []),

    ...(!isVolunteer
      ? [
          {
            name: 'Competitions',
            description: 'Manage society competitions',
            icon: Trophy,
             href: '/admin/competitions',
          },
          {
            name: 'Complaints',
            description: 'Review resident complaints',
            icon: Wrench,
            href: null,
          },
          {
            name: 'Marketplace',
            description: 'Manage community marketplace',
            icon: ShoppingBag,
            href: null,
          },
          {
            name: 'Lost & Found',
            description: 'Manage lost and found items',
            icon: Package,
            href: null,
          },
        ]
      : []),
  ];

  /* =======================================================
     DASHBOARD TEXT
     ======================================================= */

  const dashboardTitle = isSuperAdmin
    ? 'Super Admin Dashboard'
    : isAdmin
      ? 'Admin Dashboard'
      : 'Volunteer Dashboard';

  const dashboardDescription = isSuperAdmin
    ? 'Full platform control'
    : isAdmin
      ? 'Manage society operations'
      : 'Manage assigned tasks';

  const roleLabel = isSuperAdmin
    ? 'Super Admin'
    : isAdmin
      ? 'Administrator'
      : 'Volunteer';

  /* =======================================================
     MODULE CARD
     ======================================================= */

  const renderModuleCard = (section: Section, index: number) => {
    const Icon = section.icon;

    const card = (
      <motion.div
        variants={itemVariants}
        custom={index}
        whileHover={{
          y: -6,
          transition: {
            duration: 0.25,
          },
        }}
        className="h-full"
      >
        <Card
          className="
            group relative h-full overflow-hidden
            rounded-xl sm:rounded-2xl
            border border-white/10
            bg-white/[0.04] sm:bg-white/[0.035]
            sm:backdrop-blur-2xl
            shadow-[0_8px_24px_rgba(0,0,0,0.2)] sm:shadow-[0_20px_60px_rgba(0,0,0,0.35)]
            transition-all duration-300
            hover:border-amber-300/30
            hover:bg-white/[0.055]
            hover:shadow-[0_20px_70px_rgba(245,158,11,0.10)]
          "
        >
          {/* Top amber line */}
          <div
            className="
              pointer-events-none absolute
              inset-x-0 top-0 h-px
              bg-gradient-to-r
              from-transparent
              via-amber-300/70
              to-transparent
              opacity-50
              transition-opacity duration-300
              group-hover:opacity-100
            "
          />

          {/* Ambient glow */}
          <div
            className="
              pointer-events-none absolute
              -right-20 -top-20
              hidden h-40 w-40 sm:block
              rounded-full
              bg-amber-400/[0.06]
              blur-3xl
              transition-all duration-500
              group-hover:bg-amber-400/[0.13]
            "
          />

          <CardContent className="relative flex h-full flex-col p-3 sm:p-6">
            <div className="flex items-start justify-between">
              {/* Icon */}
              <div
                className="
                  flex h-8 w-8 items-center justify-center
                  rounded-lg sm:h-12 sm:w-12 sm:rounded-xl
                  border border-amber-300/15
                  bg-amber-300/[0.08]
                  text-amber-300
                  transition-all duration-300
                  group-hover:scale-110
                  group-hover:border-amber-300/30
                  group-hover:bg-amber-300/15
                  group-hover:shadow-[0_0_30px_rgba(251,191,36,0.12)]
                "
              >
                <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>

              {/* Arrow */}
              {section.href && (
                <div
                  className="
                    flex h-6 w-6 items-center justify-center sm:h-8 sm:w-8
                    rounded-full
                    border border-white/5
                    bg-white/[0.035]
                    text-white/30
                    transition-all duration-300
                    group-hover:border-amber-300/20
                    group-hover:bg-amber-300/[0.08]
                    group-hover:text-amber-300
                  "
                >
                  <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="mt-3 sm:mt-5">
              <h2
                className="
                  text-[13px] font-semibold
                  tracking-tight
                  text-white
                  transition-colors duration-300
                  group-hover:text-amber-200
                  sm:text-lg
                "
              >
                {section.name}
              </h2>

              <p
                className="
                  mt-1 text-[10px] leading-4
                  text-white/40
                  transition-colors duration-300
                  group-hover:text-white/55
                  sm:mt-1.5 sm:text-sm sm:leading-6
                "
              >
                {section.description}
              </p>
            </div>

            {/* Footer */}
            <div className="mt-auto pt-2 sm:pt-5">
              <div
                className="
                  flex items-center gap-2
                  text-[8px] sm:text-[10px]
                  font-semibold
                  uppercase
                  tracking-[0.22em]
                  text-white/25
                  transition-colors duration-300
                  group-hover:text-amber-300/70
                "
              >
                <span
                  className="
                    h-1.5 w-1.5
                    rounded-full
                    bg-amber-300/50
                    shadow-[0_0_8px_rgba(252,211,77,0.5)]
                    transition-all duration-300
                    group-hover:bg-amber-300
                    group-hover:shadow-[0_0_12px_rgba(252,211,77,0.9)]
                  "
                />

                Manage
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );

    if (!section.href) {
      return (
        <div key={`${section.name}-${index}`} className="h-full">
          {card}
        </div>
      );
    }

    return (
      <Link
        key={`${section.name}-${index}`}
        href={section.href}
        className="block h-full"
      >
        {card}
      </Link>
    );
  };

  /* =======================================================
     PAGE
     ======================================================= */

  return (
    <div className="min-h-screen w-full overflow-hidden bg-[#080808] text-white">
      {/* ===================================================
          BACKGROUND AMBIENCE
          =================================================== */}

      <div className="pointer-events-none fixed inset-0 z-0">
        {/* Center amber glow */}
        <motion.div
          className="
            absolute left-1/2 top-[18%]
            h-[500px] w-[500px]
            -translate-x-1/2
            rounded-full
            bg-amber-400/[0.055]
            blur-[130px]
          "
          animate={{
            scale: [1, 1.12, 1],
            opacity: [0.4, 0.7, 0.4],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Left glow */}
        <div
          className="
            absolute -left-40 top-[45%]
            h-96 w-96
            rounded-full
            bg-orange-500/[0.035]
            blur-[110px]
          "
        />

        {/* Right glow */}
        <div
          className="
            absolute -right-40 bottom-[10%]
            h-96 w-96
            rounded-full
            bg-amber-500/[0.04]
            blur-[110px]
          "
        />

        {/* Vignette */}
        <div
          className="
            absolute inset-0
            bg-[radial-gradient(circle_at_50%_0%,rgba(255,170,70,0.07),transparent_32%)]
          "
        />

        <div
          className="
            absolute inset-0
            bg-gradient-to-b
            from-transparent
            via-transparent
            to-[#080808]
          "
        />
      </div>

      {/* ===================================================
          FLOATING PARTICLES
          =================================================== */}

      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {[...Array(14)].map((_, i) => (
          <motion.span
            key={i}
            className="
              absolute h-1 w-1
              rounded-full
              bg-amber-200/20
            "
            style={{
              left: `${5 + ((i * 19) % 90)}%`,
              top: `${8 + ((i * 27) % 85)}%`,
            }}
            animate={{
              y: [-10, -30, -10],
              opacity: [0.1, 0.5, 0.1],
            }}
            transition={{
              duration: 3 + (i % 4),
              repeat: Infinity,
              delay: i * 0.3,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* ===================================================
          HEADER
          =================================================== */}

      <header
        className="
          relative z-10
          overflow-hidden
          border-b border-white/10
          bg-black/30
          backdrop-blur-2xl
        "
      >
        {/* Header glow */}
        <div
          className="
            pointer-events-none absolute
            left-1/2 top-0
            h-72 w-[600px]
            -translate-x-1/2
            rounded-full
            bg-amber-400/[0.07]
            blur-[100px]
          "
        />

        <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {/* =================================================
              BACK BUTTON
              ================================================= */}

          <motion.div
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6"
          >
            <Link href="/">
              <motion.div
                whileHover={{ x: -3 }}
                whileTap={{ scale: 0.97 }}
                className="
                  group inline-flex
                  items-center gap-2
                  rounded-xl
                  border border-white/10
                  bg-white/[0.035]
                  px-3.5 py-2.5
                  text-sm
                  font-medium
                  text-white/60
                  backdrop-blur-xl
                  transition-all duration-300
                  hover:border-amber-300/25
                  hover:bg-amber-300/[0.06]
                  hover:text-amber-200
                  hover:shadow-[0_10px_30px_rgba(245,158,11,0.08)]
                "
              >
                <ArrowLeft
                  className="
                    h-4 w-4
                    transition-transform duration-300
                    group-hover:-translate-x-0.5
                  "
                />

                <span>Back to Home</span>
              </motion.div>
            </Link>
          </motion.div>

          {/* Mobile-only identity card. The existing desktop header remains unchanged. */}
          <section className="mb-4 rounded-2xl border border-amber-300/20 bg-card/95 p-4 text-foreground shadow-[0_8px_24px_rgba(0,0,0,0.12)] dark:border-amber-300/15 dark:bg-white/[0.045] dark:text-white lg:hidden">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300/75">Admin workspace</p>
                <h1 className="mt-1 truncate text-lg font-semibold tracking-tight text-foreground dark:text-white">
                  {greeting}, {adminName} <span aria-hidden="true">👋</span>
                </h1>
                <p className="mt-1 text-[11px] leading-4 text-muted-foreground dark:text-white/45">
                  Manage your Meditiya Nagar community from one place.
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-amber-300/20 bg-amber-300/[0.08] px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-200">
                {isSuperAdmin ? 'Super Admin' : 'Admin'}
              </span>
            </div>
          </section>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* =================================================
                HEADER TOP
                ================================================= */}

            <div className="hidden flex-col gap-5 sm:flex-row sm:items-center sm:justify-between lg:flex">
              <motion.div
                variants={itemVariants}
                className="flex items-center gap-4"
              >
                {/* Logo */}
                <div
                  className="
                    flex h-14 w-14
                    shrink-0
                    items-center justify-center
                    rounded-2xl
                    border border-white/10
                    bg-white/[0.04]
                    p-2
                    shadow-[0_10px_40px_rgba(0,0,0,0.4)]
                    backdrop-blur-xl
                    sm:h-16 sm:w-16
                  "
                >
                  <img
                    src={`${basePath}/logo.png`}
                    alt="Meditiya Sathi"
                    className="h-full w-full object-contain drop-shadow-[0_0_15px_rgba(251,191,36,0.15)]"
                  />
                </div>

                <div>
                  {/* Brand */}
                  <div className="mb-1 flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-amber-300" />

                    <span
                      className="
                        text-[10px]
                        font-semibold
                        uppercase
                        tracking-[0.28em]
                        text-amber-200/70
                      "
                    >
                      Meditiya Sathi
                    </span>
                  </div>

                  <h1
                    className="
                      text-2xl
                      font-semibold
                      tracking-tight
                      text-white
                      sm:text-3xl
                    "
                  >
                    {dashboardTitle}
                  </h1>

                  <p className="mt-1 text-sm text-white/40">
                    {dashboardDescription}
                  </p>
                </div>
              </motion.div>

              {/* Role */}
              <motion.div
                variants={itemVariants}
                className="
                  inline-flex w-fit
                  items-center gap-2
                  rounded-full
                  border border-amber-300/15
                  bg-amber-300/[0.06]
                  px-4 py-2
                  text-[10px]
                  font-semibold
                  uppercase
                  tracking-[0.2em]
                  text-amber-200/80
                  backdrop-blur-xl
                "
              >
                <span
                  className="
                    h-1.5 w-1.5
                    rounded-full
                    bg-amber-300
                    shadow-[0_0_10px_rgba(252,211,77,0.9)]
                  "
                />

                {roleLabel}
              </motion.div>
            </div>

          </motion.div>
        </div>
      </header>

      {/* ===================================================
          MAIN
          =================================================== */}

      <main
        className="
          relative z-10
          mx-auto
          max-w-7xl
          px-4 py-10
          sm:px-6
          lg:px-8
        "
      >
        {/* =================================================
            SECTION HEADING
            ================================================= */}

        <motion.div
          variants={heroVariants}
          initial="hidden"
          animate="visible"
          className="mb-7"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="h-px w-7 bg-amber-300/60" />

                <p
                  className="
                    text-[10px]
                    font-semibold
                    uppercase
                    tracking-[0.28em]
                    text-amber-300/70
                  "
                >
                  Administration
                </p>
              </div>

              <h2
                className="
                  text-2xl
                  font-semibold
                  tracking-tight
                  text-white
                  sm:text-3xl
                "
              >
                Dashboard Modules
              </h2>

              <p className="mt-1.5 text-sm text-white/35">
                Select a module to manage your community.
              </p>
            </div>

            <div
              className="
                hidden
                items-center
                gap-2
                rounded-full
                border border-amber-300/15
                bg-amber-300/[0.05]
                px-4 py-2
                text-[10px]
                font-semibold
                uppercase
                tracking-wider
                text-amber-300/70
                sm:flex
              "
            >
              <Activity className="h-3 w-3" />
              {sections.length} Modules
            </div>
          </div>
        </motion.div>

        {/* =================================================
            SEARCH BUILDING
            ================================================= */}

        {canManageBuildings && (
          <motion.div
            variants={heroVariants}
            initial="hidden"
            animate="visible"
            className="relative mb-8"
          >
            <Link href="/admin/buildings" className="block">
              <motion.div
                whileHover={{ y: -3 }}
                className="
                  group relative
                  overflow-hidden
                  rounded-2xl
                  border border-amber-300/15
                  bg-gradient-to-r
                  from-amber-300/[0.08]
                  via-white/[0.025]
                  to-orange-400/[0.04]
                  p-5
                  backdrop-blur-2xl
                  transition-all duration-300
                  hover:border-amber-300/30
                  hover:shadow-[0_20px_60px_rgba(245,158,11,0.08)]
                "
              >
                {/* Glow */}
                <div
                  className="
                    pointer-events-none absolute
                    -right-16 -top-16
                    h-40 w-40
                    rounded-full
                    bg-amber-300/[0.08]
                    blur-3xl
                    transition-all duration-500
                    group-hover:bg-amber-300/[0.15]
                  "
                />

                <div className="relative flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div
                      className="
                        flex h-12 w-12
                        items-center justify-center
                        rounded-xl
                        border border-amber-300/20
                        bg-amber-300/10
                        text-amber-300
                        shadow-[0_0_30px_rgba(251,191,36,0.08)]
                        transition-all duration-300
                        group-hover:scale-105
                        group-hover:bg-amber-300
                        group-hover:text-black
                      "
                    >
                      <Search className="h-5 w-5" />
                    </div>

                    <div>
                      <h3
                        className="
                          text-sm
                          font-semibold
                          text-white
                          transition-colors
                          group-hover:text-amber-200
                          sm:text-base
                        "
                      >
                        Search Building
                      </h3>

                      <p className="mt-1 text-xs text-white/35 sm:text-sm">
                        Quickly find and manage a building or wing.
                      </p>
                    </div>
                  </div>

                  <ChevronRight
                    className="
                      h-5 w-5
                      text-white/25
                      transition-all duration-300
                      group-hover:translate-x-1
                      group-hover:text-amber-300
                    "
                  />
                </div>
              </motion.div>
            </Link>
          </motion.div>
        )}

        {/* =================================================
            MODULE GRID
            ================================================= */}

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="
            relative
            grid grid-cols-2
            gap-3
            sm:gap-4
            lg:grid-cols-3
            xl:grid-cols-4
          "
        >
          {sections.map(renderModuleCard)}
        </motion.div>

        {/* =================================================
            QUICK ACTIONS
            ================================================= */}

        {!isVolunteer && (
          <motion.section
            variants={heroVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            className="relative mt-14"
          >
            <div className="mb-5">
              <div className="mb-2 flex items-center gap-2">
                <span className="h-px w-6 bg-amber-300/50" />

                <p
                  className="
                    text-[10px]
                    font-semibold
                    uppercase
                    tracking-[0.28em]
                    text-amber-300/60
                  "
                >
                  Shortcuts
                </p>
              </div>

              <h2 className="text-xl font-semibold text-white">
                Quick Actions
              </h2>
            </div>

            <Card
              className="
                overflow-hidden
                rounded-2xl
                border border-white/8
                bg-white/[0.025]
                shadow-[0_20px_60px_rgba(0,0,0,0.3)]
                backdrop-blur-2xl
              "
            >
              <CardHeader
                className="
                  border-b border-white/8
                  bg-amber-300/[0.025]
                  px-5 py-4
                  sm:px-6
                "
              >
                <CardTitle
                  className="
                    flex items-center gap-2
                    text-sm font-semibold
                    text-white
                  "
                >
                  <div
                    className="
                      flex h-8 w-8
                      items-center justify-center
                      rounded-lg
                      border border-amber-300/15
                      bg-amber-300/[0.07]
                      text-amber-300
                    "
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>

                  Common Actions
                </CardTitle>
              </CardHeader>

              <CardContent
                className="
                  grid grid-cols-1
                  gap-3
                  p-4
                  md:grid-cols-3
                  md:p-5
                "
              >
                {/* Notice */}
                <Link href="/admin/notices">
                  <motion.div
                    whileHover={{ y: -2 }}
                    className="
                      group cursor-pointer
                      rounded-xl
                      border border-white/8
                      bg-white/[0.018]
                      p-4
                      text-left
                      transition-all duration-300
                      hover:border-amber-300/20
                      hover:bg-amber-300/[0.035]
                    "
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-white transition-colors group-hover:text-amber-200">
                          Post New Notice
                        </h4>

                        <p className="mt-1 text-xs leading-5 text-white/30">
                          Broadcast important information to residents.
                        </p>
                      </div>

                      <ChevronRight className="h-4 w-4 text-white/20 transition-all group-hover:translate-x-1 group-hover:text-amber-300" />
                    </div>
                  </motion.div>
                </Link>

                {/* Event */}
                <Link href="/admin/events">
                  <motion.div
                    whileHover={{ y: -2 }}
                    className="
                      group cursor-pointer
                      rounded-xl
                      border border-white/8
                      bg-white/[0.018]
                      p-4
                      text-left
                      transition-all duration-300
                      hover:border-amber-300/20
                      hover:bg-amber-300/[0.035]
                    "
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-white transition-colors group-hover:text-amber-200">
                          Create Event
                        </h4>

                        <p className="mt-1 text-xs leading-5 text-white/30">
                          Schedule a new society gathering or festival.
                        </p>
                      </div>

                      <ChevronRight className="h-4 w-4 text-white/20 transition-all group-hover:translate-x-1 group-hover:text-amber-300" />
                    </div>
                  </motion.div>
                </Link>

                {/* Complaints */}
                <motion.div
                  whileHover={{ y: -2 }}
                  className="
                    group cursor-pointer
                    rounded-xl
                    border border-white/8
                    bg-white/[0.018]
                    p-4
                    text-left
                    transition-all duration-300
                    hover:border-amber-300/20
                    hover:bg-amber-300/[0.035]
                  "
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-white transition-colors group-hover:text-amber-200">
                        Review Complaints
                      </h4>

                      <p className="mt-1 text-xs leading-5 text-white/30">
                        Check and update service requests.
                      </p>
                    </div>

                    <ChevronRight className="h-4 w-4 text-white/20 transition-all group-hover:translate-x-1 group-hover:text-amber-300" />
                  </div>
                </motion.div>
              </CardContent>
            </Card>
          </motion.section>
        )}

        {/* =================================================
            VOLUNTEER TASKS
            ================================================= */}

        {isVolunteer && (
          <motion.section
            variants={heroVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            className="relative mt-14"
          >
            <div className="mb-5">
              <div className="mb-2 flex items-center gap-2">
                <span className="h-px w-6 bg-amber-300/50" />

                <p
                  className="
                    text-[10px]
                    font-semibold
                    uppercase
                    tracking-[0.28em]
                    text-amber-300/60
                  "
                >
                  Assigned Work
                </p>
              </div>

              <h2 className="text-xl font-semibold text-white">
                Your Tasks
              </h2>
            </div>

            <Card
              className="
                overflow-hidden
                rounded-2xl
                border border-white/8
                bg-white/[0.025]
                shadow-[0_20px_60px_rgba(0,0,0,0.3)]
                backdrop-blur-2xl
              "
            >
              <CardHeader
                className="
                  border-b border-white/8
                  bg-amber-300/[0.025]
                  px-5 py-4
                  sm:px-6
                "
              >
                <CardTitle
                  className="
                    flex items-center gap-2
                    text-sm font-semibold
                    text-white
                  "
                >
                  <div
                    className="
                      flex h-8 w-8
                      items-center justify-center
                      rounded-lg
                      border border-amber-300/15
                      bg-amber-300/[0.07]
                      text-amber-300
                    "
                  >
                    <ClipboardList className="h-3.5 w-3.5" />
                  </div>

                  Assigned Tasks
                </CardTitle>
              </CardHeader>

              <CardContent
                className="
                  grid grid-cols-1
                  gap-3
                  p-4
                  md:grid-cols-2
                  md:p-5
                "
              >
                {/* Festivals */}
                <Link href="/admin/festivals">
                  <motion.div
                    whileHover={{ y: -2 }}
                    className="
                      group cursor-pointer
                      rounded-xl
                      border border-white/8
                      bg-white/[0.018]
                      p-5
                      transition-all duration-300
                      hover:border-amber-300/20
                      hover:bg-amber-300/[0.035]
                    "
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-white transition-colors group-hover:text-amber-200">
                          View Assigned Festivals
                        </h4>

                        <p className="mt-1 text-xs leading-5 text-white/30">
                          Manage festival collections assigned to you.
                        </p>
                      </div>

                      <ChevronRight className="h-5 w-5 text-white/20 transition-all group-hover:translate-x-1 group-hover:text-amber-300" />
                    </div>
                  </motion.div>
                </Link>

                {/* Events */}
                <Link href="/admin/events">
                  <motion.div
                    whileHover={{ y: -2 }}
                    className="
                      group cursor-pointer
                      rounded-xl
                      border border-white/8
                      bg-white/[0.018]
                      p-5
                      transition-all duration-300
                      hover:border-amber-300/20
                      hover:bg-amber-300/[0.035]
                    "
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-white transition-colors group-hover:text-amber-200">
                          View Assigned Events
                        </h4>

                        <p className="mt-1 text-xs leading-5 text-white/30">
                          Manage events assigned to you.
                        </p>
                      </div>

                      <ChevronRight className="h-5 w-5 text-white/20 transition-all group-hover:translate-x-1 group-hover:text-amber-300" />
                    </div>
                  </motion.div>
                </Link>
              </CardContent>
            </Card>
          </motion.section>
        )}

        {/* Bottom spacing */}
        <div className="h-10" />
      </main>

      {/* ===================================================
          BOTTOM VIGNETTE
          =================================================== */}

      <div
        className="
          pointer-events-none
          fixed bottom-0 left-0 right-0
          z-20 h-24
          bg-gradient-to-t
          from-[#080808]
          to-transparent
        "
      />
    </div>
  );
}
