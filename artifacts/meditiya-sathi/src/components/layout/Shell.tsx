import { ReactNode, useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  motion,
  AnimatePresence,
  useReducedMotion,
} from 'framer-motion';

import {
  Menu,
  X,
  Home,
  Calendar,
  Image as ImageIcon,
  Bell,
  Heart,
  MapPin,
  AlertCircle,
  ChevronDown,
  Shield,
  Radio,
  ArrowUpRight,
  Sparkles,
  Users,
  Trophy,
  ShoppingBag,
  Search,
  Phone,
  Info,
  LogOut,
  LayoutDashboard,
  Building2,
  UserRound,
  PartyPopper,
  ClipboardList,
  Github,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useAdminAuth } from '@/lib/AdminAuthContext';

export default function Shell({
  children,
}: {
  children: ReactNode;
}) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  // Administration is intentionally open in the mobile drawer so admins can act immediately.
  const [adminOpen, setAdminOpen] = useState(true);

  const [location] = useLocation();

  const {
    isAuthenticated,
    logout,
    isSuperAdmin,
  } = useAdminAuth();

  const shouldReduceMotion = useReducedMotion();

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
    setMoreOpen(false);
  }, []);

  useEffect(() => {
    let frameId = 0;
    const handleScroll = () => {
      if (frameId) return;
      frameId = window.requestAnimationFrame(() => {
        const nextIsScrolled = window.scrollY > 20;
        setIsScrolled((current) => current === nextIsScrolled ? current : nextIsScrolled);
        frameId = 0;
      });
    };

    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  useEffect(() => {
    closeMobileMenu();
    setAdminOpen(true);
  }, [closeMobileMenu, location]);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMobileMenu();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeMobileMenu, mobileMenuOpen]);

  useEffect(() => {
    if (mobileMenuOpen) setAdminOpen(true);
  }, [mobileMenuOpen]);

  /* ============================================================
     PUBLIC NAVIGATION
  ============================================================ */

  const navLinks = [
    {
      name: 'Home',
      href: '/',
      icon: Home,
    },
    {
      name: 'Events',
      href: '/events',
      icon: Calendar,
    },
    {
      name: 'Festivals',
      href: '/festivals',
      icon: MapPin,
    },
    {
      name: 'Notices',
      href: '/notices',
      icon: Bell,
    },
    {
      name: 'Gallery',
      href: '/gallery',
      icon: ImageIcon,
    },
    {
      name: 'Donations',
      href: '/donations',
      icon: Heart,
    },
    {
      name: 'Services',
      href: '/services',
      icon: AlertCircle,
    },
  ];

  /* ============================================================
     MORE LINKS
  ============================================================ */

  const moreLinks = [
    {
      name: 'About',
      href: '/about',
      icon: Info,
    },
    {
      name: 'Volunteers',
      href: '/volunteers',
      icon: Users,
    },
    {
      name: 'Competitions',
      href: '/competitions',
      icon: Trophy,
    },
    {
      name: 'Marketplace',
      href: '/marketplace',
      icon: ShoppingBag,
    },
    {
      name: 'Lost & Found',
      href: '/lost-found',
      icon: Search,
    },
    {
      name: 'Emergency',
      href: '/emergency',
      icon: Phone,
    },
    {
      name: 'Live Stream',
      href: '/live',
      icon: Radio,
    },
    {
      name: 'Contact',
      href: '/contact',
      icon: Phone,
    },
  ];

  /* ============================================================
     ADMIN NAVIGATION

     Super Admin:
       Admin Management
       Building
       Resident
       Festival
       Events

     Admin:
       Building
       Resident
       Festival
       Events

     Admin Management is ONLY visible to Super Admin.
  ============================================================ */

  const adminLinks = [
    ...(isSuperAdmin
      ? [
          {
            name: 'Admin Management',
            href: '/admin/admin-management',
            icon: Shield,
            description: 'Manage admin accounts',
            superAdminOnly: true,
          },
        ]
      : []),

    {
      name: 'Building',
      href: '/admin/buildings',
      icon: Building2,
      description: 'Manage buildings',
      superAdminOnly: false,
    },

    {
      name: 'Resident',
      href: '/admin/residents',
      icon: UserRound,
      description: 'Manage residents',
      superAdminOnly: false,
    },

    {
      name: 'Festival',
      href: '/admin/festivals',
      icon: PartyPopper,
      description: 'Manage festivals',
      superAdminOnly: false,
    },

    {
      name: 'Events',
      href: '/admin/events',
      icon: ClipboardList,
      description: 'Manage events',
      superAdminOnly: false,
    },
  ];

  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

  const isActive = (href: string) => {
    if (href === '/') {
      return location === '/';
    }

    return (
      location === href ||
      location.startsWith(`${href}/`)
    );
  };

  const isMoreActive = moreLinks.some((link) =>
    isActive(link.href)
  );

  const navItemVariants = {
    hidden: {
      opacity: 0,
      y: -8,
    },
    visible: {
      opacity: 1,
      y: 0,
    },
  };

  return (
    <div className="min-h-[100dvh] w-full overflow-x-hidden bg-[var(--page-bg)] text-foreground">

      {/* ============================================================
          AMBIENT BACKGROUND
      ============================================================ */}

      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">

        <div className="absolute -left-32 top-20 h-[320px] w-[320px] rounded-full bg-amber-500/10 blur-[72px] sm:h-[420px] sm:w-[420px] sm:blur-[96px] dark:bg-amber-500/[0.035]" />

        <div className="absolute -right-32 top-[35%] hidden h-[420px] w-[420px] rounded-full bg-orange-500/[0.07] blur-[96px] sm:block dark:bg-orange-500/[0.025]" />

        <div className="absolute bottom-0 left-[40%] hidden h-[280px] w-[280px] rounded-full bg-yellow-400/[0.07] blur-[80px] md:block dark:bg-yellow-400/[0.015]" />

        <div
          className="absolute inset-0 opacity-[0.04] dark:opacity-[0.02]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(120,86,30,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(120,86,30,0.18) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }}
        />

      </div>

      {/* ============================================================
          HEADER
      ============================================================ */}

      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 py-2.5 transition-colors duration-200 md:py-3',
          isScrolled
            ? 'bg-[color:var(--page-bg)]/95 sm:bg-[color:var(--page-bg)]/85 sm:backdrop-blur-md'
            : 'bg-transparent'
        )}
      >

        <div className="container mx-auto px-4 md:px-6">

          <div
            className={cn(
              'relative flex items-center justify-between rounded-2xl border px-3 transition-all duration-500 md:px-4',
              isScrolled
                ? 'border-border/80 bg-[#f7f2eb]/85 shadow-[0_15px_50px_rgba(120,76,17,0.08)] dark:border-white/10 dark:bg-white/[0.035] dark:shadow-[0_15px_50px_rgba(0,0,0,0.35)]'
                : 'border-transparent bg-transparent'
            )}
          >

            {/* ========================================================
                LOGO
            ======================================================== */}

            <Link
              href="/"
              className="group relative z-50 flex min-w-0 items-center gap-2.5 py-2"
            >

              <motion.div
                whileHover={
                  shouldReduceMotion
                    ? undefined
                    : { scale: 1.04 }
                }
                className="relative shrink-0"
              >

                <div className="absolute inset-0 rounded-full bg-amber-400/20 blur-xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                <img
                  src={`${basePath}/logo.png`}
                  alt="Meditiya Sathi"
                  className="relative h-9 w-auto drop-shadow-[0_0_12px_rgba(245,158,11,0.15)] md:h-10"
                />

              </motion.div>

              <div className="flex min-w-0 flex-col">

                <span className="truncate font-serif text-base font-bold leading-none tracking-tight text-foreground sm:text-lg md:text-xl">
                  Meditiya Sathi
                </span>

                <span className="mt-1 hidden text-[8px] font-semibold tracking-[0.25em] text-amber-600/80 dark:text-amber-300/70 sm:block">
                  ONE SOCIETY • ONE FAMILY
                </span>

              </div>

            </Link>

            {/* ========================================================
                DESKTOP NAVIGATION
            ======================================================== */}

            <nav className="hidden items-center gap-0.5 lg:flex">

              {navLinks.map((link, index) => {

                const Icon = link.icon;
                const active = isActive(link.href);

                return (
                  <motion.div
                    key={link.href}
                    initial="hidden"
                    animate="visible"
                    variants={navItemVariants}
                    transition={{
                      delay: shouldReduceMotion
                        ? 0
                        : index * 0.025,
                    }}
                  >

                    <Link
                      href={link.href}
                      className={cn(
                        'group relative flex items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-300 xl:px-3.5',
                        active
                          ? 'bg-amber-500/10 text-amber-700 dark:bg-amber-300/[0.09] dark:text-amber-300'
                          : 'text-muted-foreground hover:bg-amber-500/5 hover:text-foreground dark:text-white/55 dark:hover:bg-white/[0.045] dark:hover:text-white'
                      )}
                    >

                      <Icon
                        className={cn(
                          'h-3.5 w-3.5 transition-colors duration-300',
                          active
                            ? 'text-amber-700 dark:text-amber-300'
                            : 'text-muted-foreground group-hover:text-amber-600 dark:text-white/40 dark:group-hover:text-amber-300'
                        )}
                      />

                      <span>{link.name}</span>

                      {active && (
                        <motion.span
                          layoutId="active-nav"
                          className="absolute bottom-0.5 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-amber-300"
                        />
                      )}

                    </Link>

                  </motion.div>
                );
              })}

              {/* ======================================================
                  MORE
              ====================================================== */}

              <div
                className="relative"
                onMouseEnter={() => setMoreOpen(true)}
                onMouseLeave={() => setMoreOpen(false)}
              >

                <button
                  type="button"
                  onClick={() =>
                    setMoreOpen((prev) => !prev)
                  }
                  className={cn(
                    'flex items-center gap-1 rounded-xl px-3.5 py-2 text-[13px] font-medium transition-all duration-300',
                    isMoreActive
                      ? 'bg-amber-500/10 text-amber-700 dark:bg-amber-300/[0.09] dark:text-amber-300'
                      : 'text-muted-foreground hover:bg-amber-500/5 hover:text-foreground dark:text-white/55 dark:hover:bg-white/[0.045] dark:hover:text-white'
                  )}
                >

                  More

                  <motion.div
                    animate={{
                      rotate: moreOpen ? 180 : 0,
                    }}
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </motion.div>

                </button>

                <AnimatePresence>

                  {moreOpen && (
                    <motion.div
                      initial={{
                        opacity: 0,
                        y: -8,
                        scale: 0.97,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        scale: 1,
                      }}
                      exit={{
                        opacity: 0,
                        y: -8,
                        scale: 0.97,
                      }}
                      className="absolute right-0 top-full w-64 pt-3"
                    >

                      <div className="overflow-hidden rounded-2xl border border-border bg-[color:var(--surface-strong)] p-2 shadow-xl sm:backdrop-blur-md dark:border-white/10 dark:bg-[#0c0c0c]/95">

                        <div className="mb-2 flex items-center gap-2 border-b border-border px-3 py-3 dark:border-white/[0.07]">

                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-300/10">
                            <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-300" />
                          </div>

                          <div>
                            <p className="text-xs font-semibold text-foreground dark:text-white">
                              Explore More
                            </p>

                            <p className="text-[9px] text-muted-foreground dark:text-white/35">
                              Community features
                            </p>
                          </div>

                        </div>

                        <div className="grid grid-cols-2 gap-1">

                          {moreLinks.map((link) => {

                            const Icon = link.icon;
                            const active = isActive(link.href);

                            return (
                              <Link
                                key={link.href}
                                href={link.href}
                                className={cn(
                                  'group flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs transition-all duration-200',
                                  active
                                    ? 'bg-amber-500/10 text-amber-700 dark:bg-amber-300/10 dark:text-amber-300'
                                    : 'text-muted-foreground hover:bg-amber-500/5 hover:text-foreground dark:text-white/55 dark:hover:bg-white/[0.06] dark:hover:text-white'
                                )}
                              >

                                <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />

                                <span className="flex-1">
                                  {link.name}
                                </span>

                                <ArrowUpRight className="h-3 w-3 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-60" />

                              </Link>
                            );
                          })}

                        </div>

                      </div>

                    </motion.div>
                  )}

                </AnimatePresence>

              </div>

            </nav>

            {/* ========================================================
                RIGHT ACTIONS
            ======================================================== */}

            <div className="relative z-50 flex items-center gap-1.5">

              {!isAuthenticated && (
                <Link
                  href="/admin-login"
                  className="group hidden items-center gap-1.5 rounded-xl border border-amber-300/30 bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-700 transition-all hover:bg-amber-200 dark:border-amber-300/20 dark:bg-amber-300/[0.045] dark:text-amber-300 sm:flex"
                >
                  <Shield className="h-3.5 w-3.5" />
                  Admin Login
                </Link>
              )}

              {isAuthenticated && (
                <>
                  <Link
                    href="/admin"
                    className="hidden items-center gap-1.5 rounded-xl border border-amber-300/30 bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-700 transition-all hover:bg-amber-200 dark:border-amber-300/20 dark:bg-amber-300/[0.06] dark:text-amber-300 sm:flex"
                  >
                    <Shield className="h-3.5 w-3.5" />
                    Admin
                  </Link>

                  <button
                    type="button"
                    onClick={logout}
                    className="hidden rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground transition-all hover:bg-red-500/10 hover:text-red-600 sm:block dark:text-white/40 dark:hover:text-red-400"
                  >
                    Logout
                  </button>
                </>
              )}

              {/* MOBILE MENU BUTTON */}

              <motion.button
                type="button"
                whileTap={
                  shouldReduceMotion
                    ? undefined
                    : { scale: 0.9 }
                }
                onClick={() =>
                  setMobileMenuOpen((prev) => !prev)
                }
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl border transition-all lg:hidden',
                  mobileMenuOpen
                    ? 'border-amber-300/30 bg-amber-300/10 text-amber-300'
                    : 'border-border bg-[#f7f2eb] text-muted-foreground dark:border-white/[0.07] dark:bg-white/[0.035] dark:text-white/70'
                )}
                aria-label={
                  mobileMenuOpen
                    ? 'Close menu'
                    : 'Open menu'
                }
              >

                <AnimatePresence
                  mode="wait"
                  initial={false}
                >

                  {mobileMenuOpen ? (
                    <motion.div
                      key="close"
                      initial={{
                        opacity: 0,
                        rotate: -90,
                      }}
                      animate={{
                        opacity: 1,
                        rotate: 0,
                      }}
                      exit={{
                        opacity: 0,
                        rotate: 90,
                      }}
                    >
                      <X className="h-5 w-5" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="menu"
                      initial={{
                        opacity: 0,
                        rotate: 90,
                      }}
                      animate={{
                        opacity: 1,
                        rotate: 0,
                      }}
                      exit={{
                        opacity: 0,
                        rotate: -90,
                      }}
                    >
                      <Menu className="h-5 w-5" />
                    </motion.div>
                  )}

                </AnimatePresence>

              </motion.button>

            </div>

          </div>

        </div>

      </header>

      {/* ============================================================
          MOBILE NAVIGATION
      ============================================================ */}

      <AnimatePresence>

        {mobileMenuOpen && (

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 lg:hidden"
            onClickCapture={(event) => {
              if ((event.target as HTMLElement).closest('a[href]')) {
                closeMobileMenu();
              }
            }}
          >

            {/* BACKDROP */}

            <div
              className="absolute inset-0 bg-black/65 sm:bg-black/50 sm:backdrop-blur-sm dark:bg-black/75"
              onClick={closeMobileMenu}
            />

            {/* MENU PANEL */}

            <motion.div
              initial={{
                opacity: 0,
                y: -20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                y: -20,
              }}
              transition={{
                duration: shouldReduceMotion ? 0 : 0.25,
              }}
              className="absolute inset-x-0 bottom-0 top-16 overflow-y-auto border-t border-white/[0.08] bg-[#0a0a09] sm:bg-[#0a0a09]/95 sm:backdrop-blur-md md:top-20"
            >

              {/* GOLD AMBIENT GLOW */}

              <div className="pointer-events-none absolute -right-32 top-0 hidden h-72 w-72 rounded-full bg-amber-400/10 blur-[72px] sm:block" />

              <div className="pointer-events-none absolute -left-32 top-[40%] hidden h-72 w-72 rounded-full bg-orange-500/[0.06] blur-[72px] sm:block" />

              <div className="relative mx-auto flex max-w-lg flex-col px-4 pb-6 pt-4">

                {/* ==================================================
                    MOBILE MENU HEADER
                ================================================== */}

                <div className="order-0 mb-4 flex items-center justify-between">

                  <div>

                    <div className="flex items-center gap-2">

                      <span className="h-1.5 w-1.5 rounded-full bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.8)]" />

                      <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-amber-300/70">
                        Navigation
                      </p>

                    </div>

                    <h2 className="mt-1 font-serif text-lg font-bold text-white">
                      Meditiya Sathi
                    </h2>

                    <p className="mt-0.5 text-[11px] text-white/35">
                      Explore Meditiya
                    </p>

                  </div>

                  <div className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-amber-300/15 bg-amber-300/[0.06]">

                    <Sparkles className="h-4 w-4 text-amber-300" />

                  </div>

                </div>

                {/* ==================================================
                    MAIN NAVIGATION
                ================================================== */}

                <section className="order-1">

                  <div className="mb-3 flex items-center justify-between">

                    <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/30">
                      Main Navigation
                    </p>

                    <span className="text-[10px] text-white/20">
                      {navLinks.length} sections
                    </span>

                  </div>

                  <div className="grid grid-cols-2 gap-2">

                    {navLinks.map((link, index) => {

                      const Icon = link.icon;
                      const active = isActive(link.href);

                      return (
                        <motion.div
                          key={link.href}
                          initial={{
                            opacity: 0,
                            y: 12,
                          }}
                          animate={{
                            opacity: 1,
                            y: 0,
                          }}
                          transition={{
                            delay: shouldReduceMotion
                              ? 0
                              : index * 0.035,
                          }}
                        >

                          <Link
                            href={link.href}
                            onClick={() =>
                              setMobileMenuOpen(false)
                            }
                            className={cn(
                              'group relative flex min-h-[56px] items-center gap-2 overflow-hidden rounded-xl border px-3 py-2.5 text-left transition-colors duration-200 active:scale-[0.98]',
                              active
                                ? 'border-amber-300/35 bg-amber-300/[0.08]'
                                : 'border-white/[0.08] bg-white/[0.025] hover:border-amber-300/20 hover:bg-white/[0.05]'
                            )}
                          >

                            <div className="relative flex items-center justify-between">

                              <div
                                className={cn(
                                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                                  active
                                    ? 'bg-amber-300/15 text-amber-300'
                                    : 'bg-white/[0.05] text-white/55 group-hover:text-amber-300'
                                )}
                              >
                                <Icon className="h-[17px] w-[17px]" />
                              </div>

                              {active && (
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,0.9)]" />
                              )}

                            </div>

                            <span
                              className={cn(
                                'relative text-xs font-semibold',
                                active
                                  ? 'text-amber-300'
                                  : 'text-white/65'
                              )}
                            >
                              {link.name}
                            </span>

                          </Link>

                        </motion.div>
                      );
                    })}

                  </div>

                </section>

                {/* ==================================================
                    MORE FEATURES
                ================================================== */}

                <section className="order-3 mt-4">

                  <div
                    className={cn(
                      'overflow-hidden rounded-2xl border transition-all duration-300',
                      moreOpen
                        ? 'border-amber-300/20 bg-white/[0.035]'
                        : 'border-white/[0.08] bg-white/[0.02]'
                    )}
                  >

                    <button
                      type="button"
                      onClick={() =>
                        setMoreOpen((prev) => !prev)
                      }
                      className="flex w-full items-center justify-between p-3 text-left"
                    >

                      <div className="flex items-center gap-3">

                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-300/[0.08]">

                          <Sparkles className="h-4.5 w-4.5 text-amber-300" />

                        </div>

                        <div>

                          <p className="text-sm font-semibold text-white">
                            More
                          </p>

                          <p className="mt-0.5 text-[10px] text-white/30">
                            Community features
                          </p>

                        </div>

                      </div>

                      <motion.div
                        animate={{
                          rotate: moreOpen ? 180 : 0,
                        }}
                        transition={{ duration: 0.2 }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04]"
                      >
                        <ChevronDown className="h-4 w-4 text-white/50" />
                      </motion.div>

                    </button>

                    <AnimatePresence initial={false}>

                      {moreOpen && (

                        <motion.div
                          initial={{
                            height: 0,
                            opacity: 0,
                          }}
                          animate={{
                            height: 'auto',
                            opacity: 1,
                          }}
                          exit={{
                            height: 0,
                            opacity: 0,
                          }}
                          transition={{
                            duration: shouldReduceMotion
                              ? 0
                              : 0.25,
                          }}
                        >

                          <div className="grid grid-cols-2 gap-2 px-3 pb-3">

                            {moreLinks.map((link) => {

                              const Icon = link.icon;
                              const active = isActive(link.href);

                              return (
                                <Link
                                  key={link.href}
                                  href={link.href}
                                  onClick={() =>
                                    setMobileMenuOpen(false)
                                  }
                                  className={cn(
                                    'flex min-h-[54px] items-center gap-2.5 rounded-xl border px-3 text-xs font-medium transition-all active:scale-[0.97]',
                                    active
                                      ? 'border-amber-300/30 bg-amber-300/[0.08] text-amber-300'
                                      : 'border-white/[0.06] bg-white/[0.025] text-white/55 hover:bg-white/[0.05] hover:text-white'
                                  )}
                                >

                                  <Icon className="h-4 w-4 shrink-0" />

                                  <span>
                                    {link.name}
                                  </span>

                                </Link>
                              );
                            })}

                          </div>

                        </motion.div>

                      )}

                    </AnimatePresence>

                  </div>

                </section>

                {/* ==================================================
                    ADMINISTRATION
                ================================================== */}

                <section className="order-2 mt-4">

                  <div
                    className={cn(
                      'overflow-hidden rounded-2xl border transition-all duration-300',
                      adminOpen
                        ? 'border-amber-300/30 bg-amber-300/[0.025] shadow-[0_0_35px_rgba(245,158,11,0.04)]'
                        : 'border-white/[0.08] bg-white/[0.02]'
                    )}
                  >

                    {/* ADMIN HEADER */}

                    <button
                      type="button"
                      onClick={() =>
                        setAdminOpen((prev) => !prev)
                      }
                      className={cn('w-full items-center justify-between p-3 text-left', isAuthenticated ? 'flex' : 'hidden')}
                    >

                      <div className="flex items-center gap-3">

                        <div
                          className={cn(
                            'flex h-10 w-10 items-center justify-center rounded-xl',
                            isAuthenticated
                              ? 'bg-amber-300/[0.12]'
                              : 'bg-white/[0.04]'
                          )}
                        >

                          <Shield
                            className={cn(
                              'h-5 w-5',
                              isAuthenticated
                                ? 'text-amber-300'
                                : 'text-white/50'
                            )}
                          />

                        </div>

                        <div>

                          <div className="flex items-center gap-2">

                            <p className="font-serif text-base font-bold text-white">
                              Administration
                            </p>

                            {isAuthenticated && (
                              <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-emerald-400">
                                Active
                              </span>
                            )}

                          </div>

                          <p className="mt-0.5 text-[10px] text-white/30">
                            {isAuthenticated
                              ? isSuperAdmin
                                ? 'Super Admin access'
                                : 'Admin access'
                              : 'Restricted area'}
                          </p>

                        </div>

                      </div>

                      <motion.div
                        animate={{
                          rotate: adminOpen ? 180 : 0,
                        }}
                        transition={{ duration: 0.2 }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04]"
                      >
                        <ChevronDown className="h-4 w-4 text-white/50" />
                      </motion.div>

                    </button>

                    {/* ADMIN CONTENT */}

                    <AnimatePresence initial={false}>

                      {adminOpen && (

                        <motion.div
                          initial={{
                            height: 0,
                            opacity: 0,
                          }}
                          animate={{
                            height: 'auto',
                            opacity: 1,
                          }}
                          exit={{
                            height: 0,
                            opacity: 0,
                          }}
                          transition={{
                            duration: shouldReduceMotion
                              ? 0
                              : 0.25,
                          }}
                        >

                          <div className="space-y-2 px-3 pb-3">

                            {/* ==================================================
                                NOT AUTHENTICATED
                            ================================================== */}

                            {!isAuthenticated ? (

                              <Link
                                href="/admin-login"
                                onClick={() =>
                                  setMobileMenuOpen(false)
                                }
                                className="group flex min-h-[58px] w-full items-center justify-between rounded-xl border border-amber-300/20 bg-amber-300/[0.07] px-3 py-2.5 transition-colors active:scale-[0.98]"
                              >

                                <div className="flex items-center gap-3">

                                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-300/10">

                                    <Shield className="h-4 w-4 text-amber-300" />

                                  </div>

                                  <div>

                                    <p className="text-sm font-bold text-amber-300">
                                      Admin Login
                                    </p>

                                    <p className="text-[10px] text-amber-300/40">
                                      Access administration
                                    </p>

                                  </div>

                                </div>

                                <ArrowUpRight className="h-4 w-4 text-amber-300/50 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />

                              </Link>

                            ) : (

                              <>

                                {/* ==================================================
                                    ADMIN DASHBOARD
                                ================================================== */}

                                <Link
                                  href="/admin"
                                  onClick={() =>
                                    setMobileMenuOpen(false)
                                  }
                                  className="group flex min-h-[62px] w-full items-center justify-between rounded-xl border border-amber-300/25 bg-amber-300/[0.08] px-3 py-3 transition-colors hover:bg-amber-300/[0.12] active:scale-[0.98]"
                                >

                                  <div className="flex items-center gap-3">

                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-300/10">

                                      <LayoutDashboard className="h-5 w-5 text-amber-300" />

                                    </div>

                                    <div>

                                      <p className="text-sm font-bold text-amber-300">
                                        Admin Panel
                                      </p>

                                      <p className="text-[10px] text-amber-300/45">
                                        Manage your society
                                      </p>

                                    </div>

                                  </div>

                                  <ArrowUpRight className="h-4 w-4 text-amber-300/60 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />

                                </Link>

                                {/* ==================================================
                                    ADMIN MANAGEMENT — SUPER ADMIN ONLY
                                ================================================== */}

                                {isSuperAdmin && (
                                  <Link
                                    href="/admin/admin-management"
                                    onClick={() =>
                                      setMobileMenuOpen(false)
                                    }
                                    className={cn(
                                      'group flex min-h-[58px] w-full items-center justify-between rounded-xl border px-3 py-2.5 transition-colors active:scale-[0.98]',
                                      isActive('/admin/admin-management')
                                        ? 'border-amber-300/30 bg-amber-300/[0.08]'
                                        : 'border-white/[0.07] bg-white/[0.025] hover:bg-white/[0.05]'
                                    )}
                                  >

                                    <div className="flex items-center gap-3">

                                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04]">

                                        <Users className="h-5 w-5 text-white/60" />

                                      </div>

                                      <div>

                                        <p className="text-sm font-semibold text-white/80">
                                          Admin Management
                                        </p>

                                        <p className="text-[10px] text-white/30">
                                          Admin accounts & permissions
                                        </p>

                                      </div>

                                    </div>

                                    <ArrowUpRight className="h-4 w-4 text-white/30 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />

                                  </Link>
                                )}

                                {/* ==================================================
                                    ADMIN MANAGEMENT CARDS
                                ================================================== */}

                                <div className="pt-1">

                                  <p className="mb-2 px-1 text-[9px] font-bold uppercase tracking-[0.22em] text-white/25">
                                    Management
                                  </p>

                                  <div className="grid grid-cols-2 gap-2">

                                    {adminLinks
                                      .filter((link) => !link.superAdminOnly)
                                      .map((link) => {

                                        const Icon = link.icon;
                                        const active = isActive(
                                          link.href
                                        );

                                        return (
                                          <Link
                                            key={link.href}
                                            href={link.href}
                                            onClick={() =>
                                              setMobileMenuOpen(false)
                                            }
                                            className={cn(
                                              'group relative flex min-h-[58px] flex-col justify-between overflow-hidden rounded-xl border p-2.5 transition-colors active:scale-[0.98]',
                                              active
                                                ? 'border-amber-300/30 bg-amber-300/[0.08]'
                                                : 'border-white/[0.06] bg-white/[0.02] hover:border-amber-300/15 hover:bg-white/[0.04]'
                                            )}
                                          >

                                            {active && (
                                              <div className="absolute -right-5 -top-5 h-16 w-16 rounded-full bg-amber-300/10 blur-2xl" />
                                            )}

                                            <div className="relative flex items-center justify-between">

                                              <div
                                                className={cn(
                                                  'flex h-8 w-8 items-center justify-center rounded-lg',
                                                  active
                                                    ? 'bg-amber-300/15 text-amber-300'
                                                    : 'bg-white/[0.04] text-white/50 group-hover:text-amber-300'
                                                )}
                                              >
                                                <Icon className="h-4 w-4" />
                                              </div>

                                              {active && (
                                                <span className="h-1.5 w-1.5 rounded-full bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,0.9)]" />
                                              )}

                                            </div>

                                            <div className="relative">

                                              <p
                                                className={cn(
                                                  'text-xs font-semibold',
                                                  active
                                                    ? 'text-amber-300'
                                                    : 'text-white/65'
                                                )}
                                              >
                                                {link.name}
                                              </p>

                                              <p className="mt-0.5 text-[8px] leading-3 text-white/25">
                                                {link.description}
                                              </p>

                                            </div>

                                          </Link>
                                        );
                                      })}

                                  </div>

                                </div>

                                {/* ==================================================
                                    LOGOUT
                                ================================================== */}

                                <button
                                  type="button"
                                  onClick={() => {
                                    setMobileMenuOpen(false);
                                    logout();
                                  }}
                                  className="flex min-h-[44px] w-full items-center gap-2.5 rounded-xl border border-red-400/15 bg-red-400/[0.035] px-3 py-2 text-left text-xs transition-colors hover:bg-red-400/[0.07] active:scale-[0.98]"
                                >

                                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-400/[0.06]">

                                    <LogOut className="h-4 w-4 text-red-400" />

                                  </div>

                                  <div>

                                    <p className="font-semibold text-red-400">
                                      Logout
                                    </p>


                                  </div>

                                </button>

                              </>
                            )}

                          </div>

                        </motion.div>
                      )}

                    </AnimatePresence>

                  </div>

                </section>

                {/* ==================================================
                    MOBILE FOOTER
                ================================================== */}

                <div className="order-4 pb-2 pt-6 text-center">

                  <div className="mx-auto mb-4 flex items-center justify-center gap-2">

                    <span className="h-px w-8 bg-gradient-to-r from-transparent to-amber-300/30" />

                    <Heart className="h-3 w-3 text-amber-300/40" />

                    <span className="h-px w-8 bg-gradient-to-l from-transparent to-amber-300/30" />

                  </div>

                  <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-white/20">
                    One Society • One Family
                  </p>

                  <p className="mt-1 text-[9px] text-white/15">
                    Meditiya Sathi
                  </p>

                </div>

              </div>

            </motion.div>

          </motion.div>

        )}

      </AnimatePresence>

      {/* ============================================================
          MAIN CONTENT
      ============================================================ */}

      <main className="relative z-10 min-h-[100dvh] w-full pt-16 md:pt-20">
        {children}
      </main>

      {/* ============================================================
          FOOTER
      ============================================================ */}

      <footer className="relative z-10 overflow-hidden border-t border-border bg-[color:var(--page-bg-soft)] dark:border-white/[0.08] dark:bg-[#060606]">

        <div className="pointer-events-none absolute inset-0">

          <div className="absolute left-1/2 top-0 hidden h-64 w-[480px] -translate-x-1/2 rounded-full bg-amber-400/[0.03] blur-[72px] sm:block" />

          <div
            className="absolute inset-0 opacity-[0.018]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
              backgroundSize: '50px 50px',
            }}
          />

        </div>

        <div className="relative h-px w-full bg-gradient-to-r from-transparent via-amber-300/30 to-transparent" />

        <div className="container relative mx-auto px-4 pb-8 pt-16 md:px-6">

          <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">

            {/* ========================================================
                BRAND
            ======================================================== */}

            <motion.div
              initial={{
                opacity: 0,
                y: 15,
              }}
              whileInView={{
                opacity: 1,
                y: 0,
              }}
              viewport={{
                once: true,
              }}
            >

              <Link
                href="/"
                className="group inline-flex items-center gap-3"
              >

                <div className="relative">

                  <div className="absolute inset-0 rounded-full bg-amber-400/10 blur-xl opacity-0 transition-opacity group-hover:opacity-100" />

                  <img
                    src={`${basePath}/logo.png`}
                    alt="Meditiya Sathi"
                    className="relative h-9 w-auto md:h-10"
                  />

                </div>

                <span className="font-serif text-2xl font-bold text-foreground dark:text-white">
                  Meditiya Sathi
                </span>

              </Link>

              <p className="mt-5 max-w-sm text-sm leading-7 text-muted-foreground dark:text-white/40">
                The official digital platform for Meditiya
                Nagar society. Bridging gaps, celebrating
                culture, and building a stronger community
                together.
              </p>

              <div className="mt-6 flex items-center gap-2">

                <span className="h-px w-8 bg-amber-300/30" />

                <span className="text-[9px] font-semibold uppercase tracking-[0.25em] text-amber-700/70 dark:text-amber-300/60">
                  One Society • One Family
                </span>

              </div>

            </motion.div>

            {/* ========================================================
                QUICK LINKS
            ======================================================== */}

            <FooterColumn title="Quick Links">

              <FooterLink href="/about">
                About Us
              </FooterLink>

              <FooterLink href="/events">
                Upcoming Events
              </FooterLink>

              <FooterLink href="/notices">
                Notice Board
              </FooterLink>

              <FooterLink href="/donations">
                Support & Donate
              </FooterLink>

            </FooterColumn>

            {/* ========================================================
                SERVICES
            ======================================================== */}

            <FooterColumn title="Services">

              <FooterLink href="/services">
                Service Requests
              </FooterLink>

              <FooterLink href="/marketplace">
                Marketplace
              </FooterLink>

              <FooterLink href="/lost-found">
                Lost & Found
              </FooterLink>

              <FooterLink href="/emergency">
                Emergency Contacts
              </FooterLink>

            </FooterColumn>

            {/* ========================================================
                CONTACT
            ======================================================== */}

            <motion.div
              initial={{
                opacity: 0,
                y: 15,
              }}
              whileInView={{
                opacity: 1,
                y: 0,
              }}
              viewport={{
                once: true,
              }}
              className="space-y-5"
            >

              <h4 className="font-serif text-lg font-bold text-foreground dark:text-white">
                Contact
              </h4>

              <div className="space-y-5 text-sm">

                <div className="flex items-start gap-3">

                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03]">
                    <MapPin className="h-4 w-4 text-amber-300" />
                  </div>

                  <span className="leading-6 text-muted-foreground dark:text-white/45">
                    Meditiya Nagar, Sector 4,
                    <br />
                    Mumbai, Maharashtra 401107
                  </span>

                </div>

                <div className="flex items-center gap-3">

                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03]">
                    <Radio className="h-4 w-4 text-amber-300" />
                  </div>

                  <span className="text-muted-foreground dark:text-white/45">
                    medtiyasathi@gmail.com
                  </span>

                </div>

              </div>

            </motion.div>

          </div>

          {/* ==========================================================
              FOOTER BOTTOM
          ========================================================== */}

          <div className="mt-14 flex flex-col gap-6 border-t border-white/[0.07] pt-7 md:flex-row md:items-center md:justify-between">

            {/* COPYRIGHT */}

            <p className="text-center text-[11px] text-muted-foreground dark:text-white/25 md:text-left">
              © {new Date().getFullYear()} Meditiya Nagar
              Society. All rights reserved.
            </p>

            {/* CREATOR SHOWCASE */}

<div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-3">

  <a
    href="https://palekarlabs.vercel.app/"
    aria-label="Palekar Labs"
    className="group inline-flex items-center gap-2 rounded-full border border-amber-300/15 bg-amber-300/[0.04] px-3.5 py-1.5 transition-all duration-300 hover:border-amber-300/30 hover:bg-amber-300/[0.08] hover:shadow-[0_0_20px_rgba(245,158,11,0.10)]"
  >

    <span className="text-[11px] font-semibold text-foreground transition-colors dark:text-white">
      @palekarlabs
    </span>

    <span className="h-3 w-px bg-white/10" />

    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-300/10 text-[9px] font-bold text-amber-500 transition-transform duration-300 group-hover:scale-110 dark:text-amber-300">
      PL
    </span>

    <span className="text-[10px] font-medium text-muted-foreground transition-colors group-hover:text-amber-600 dark:text-white/35 dark:group-hover:text-amber-300">
      Palekar Labs
    </span>

    <ArrowUpRight className="h-3 w-3 text-white/20 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-amber-300" />

  </a>

</div>

          </div>

        </div>

      </footer>

    </div>
  );
}

/* ==============================================================
   FOOTER COLUMN
============================================================== */

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 15,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
      }}
      viewport={{
        once: true,
      }}
      className="space-y-5"
    >

      <h4 className="font-serif text-lg font-bold text-foreground dark:text-white">
        {title}
      </h4>

      <ul className="space-y-3">
        {children}
      </ul>

    </motion.div>
  );
}

/* ==============================================================
   FOOTER LINK
============================================================== */

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <li>

      <Link
        href={href}
        className="group inline-flex items-center gap-1 text-sm text-muted-foreground transition-all duration-300 hover:translate-x-1 hover:text-foreground dark:text-white/40 dark:hover:text-white"
      >

        {children}

        <ArrowUpRight className="h-3 w-3 opacity-0 transition-all duration-300 group-hover:opacity-50" />

      </Link>

    </li>
  );
}
