import { ReactNode, useEffect, useState } from 'react';
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
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useAdminAuth } from '@/lib/AdminAuthContext';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export default function Shell({
  children,
}: {
  children: ReactNode;
}) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const [location] = useLocation();

  const {
    isAuthenticated,
    logout,
    isSuperAdmin,
  } = useAdminAuth();

  const shouldReduceMotion = useReducedMotion();

  // ============================================================
  // SCROLL DETECTION
  // ============================================================

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    handleScroll();

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // ============================================================
  // CLOSE MOBILE MENU WHEN ROUTE CHANGES
  // ============================================================

  useEffect(() => {
    setMobileMenuOpen(false);
    setMoreOpen(false);
  }, [location]);

  // ============================================================
  // NAVIGATION
  // ============================================================

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

  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

  // ============================================================
  // ACTIVE ROUTE
  // ============================================================

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

  // ============================================================
  // ANIMATION
  // ============================================================

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

      {/* ======================================================
          AMBIENT BACKGROUND
      ====================================================== */}

      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">

        <div className="absolute -left-40 top-20 h-[500px] w-[500px] rounded-full bg-amber-500/15 blur-[140px] dark:bg-amber-500/[0.035]" />

        <div className="absolute -right-40 top-[35%] h-[500px] w-[500px] rounded-full bg-orange-500/10 blur-[140px] dark:bg-orange-500/[0.025]" />

        <div className="absolute bottom-0 left-[40%] h-[350px] w-[350px] rounded-full bg-yellow-400/10 blur-[120px] dark:bg-yellow-400/[0.015]" />

        <div
          className="absolute inset-0 opacity-[0.04] dark:opacity-[0.02]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(120,86,30,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(120,86,30,0.18) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      {/* ======================================================
          HEADER
      ====================================================== */}

      <motion.header
        initial={false}
        animate={{
          paddingTop: isScrolled ? 10 : 16,
          paddingBottom: isScrolled ? 10 : 16,
        }}
        transition={{
          duration: shouldReduceMotion ? 0 : 0.3,
          ease: [0.22, 1, 0.36, 1],
        }}
        className={cn(
          'fixed inset-x-0 top-0 z-50 transition-colors duration-300',
          isScrolled
            ? 'bg-[color:var(--page-bg)]/80 backdrop-blur-2xl'
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

            {/* ==================================================
                LOGO
            ================================================== */}

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

            {/* ==================================================
                DESKTOP NAVIGATION
            ================================================== */}

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

              {/* ==================================================
                  MORE DROPDOWN
              ================================================== */}

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
                    transition={{ duration: 0.2 }}
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
                      transition={{
                        duration: shouldReduceMotion
                          ? 0
                          : 0.2,
                      }}
                      className="absolute right-0 top-full w-64 pt-3"
                    >
                      <div className="overflow-hidden rounded-2xl border border-border bg-[color:var(--surface-strong)] p-2 shadow-[0_25px_80px_rgba(0,0,0,0.12)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#0c0c0c]/95 dark:shadow-[0_25px_80px_rgba(0,0,0,0.55)]">

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

            {/* ==================================================
                RIGHT ACTIONS
            ================================================== */}

            <div className="relative z-50 flex items-center gap-1.5">

              {/* Desktop Admin */}

              {!isAuthenticated && (
                <Link
                  href="/admin-login"
                  className="group hidden items-center gap-1.5 rounded-xl border border-amber-300/30 bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-700 transition-all duration-300 hover:border-amber-300/50 hover:bg-amber-200 hover:shadow-[0_0_25px_rgba(245,158,11,0.1)] dark:border-amber-300/20 dark:bg-amber-300/[0.045] dark:text-amber-300 dark:hover:bg-amber-300/10 sm:flex"
                >
                  <Shield className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />

                  Admin Login
                </Link>
              )}

              {isAuthenticated && (
                <>
                  <Link
                    href="/admin"
                    className="hidden items-center gap-1.5 rounded-xl border border-amber-300/30 bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-700 transition-all duration-300 hover:border-amber-300/50 hover:bg-amber-200 dark:border-amber-300/20 dark:bg-amber-300/[0.06] dark:text-amber-300 dark:hover:border-amber-300/40 dark:hover:bg-amber-300/10 sm:flex"
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

              {/* Mobile Menu Button */}

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
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-[#f7f2eb] text-muted-foreground transition-colors hover:text-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 dark:border-white/[0.07] dark:bg-white/[0.035] dark:text-white/70 dark:hover:text-amber-300 lg:hidden"
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
      </motion.header>

      {/* ======================================================
          MOBILE MENU
      ====================================================== */}

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-[rgba(247,242,234,0.8)] backdrop-blur-2xl dark:bg-[#050505]/95 lg:hidden"
          >

            {/* Ambient Glow */}

            <div className="pointer-events-none absolute -right-32 top-10 h-80 w-80 rounded-full bg-amber-400/[0.06] blur-[100px]" />

            <div className="pointer-events-none absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-orange-500/[0.04] blur-[100px]" />

            <motion.div
              initial={{
                opacity: 0,
                y: -15,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                y: -15,
              }}
              transition={{
                duration: shouldReduceMotion
                  ? 0
                  : 0.25,
              }}
              className="absolute inset-x-0 bottom-0 top-16 overflow-y-auto border-t border-border bg-[rgba(247,242,234,0.82)] dark:border-white/[0.07] dark:bg-[#080808]/90 md:top-20"
            >
              <div className="container mx-auto px-4 py-6">

                {/* ==================================================
                    MOBILE HEADER
                ================================================== */}

                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-300/70">
                      Navigation
                    </p>

                    <h2 className="mt-1 font-serif text-2xl font-semibold text-foreground">
                      Explore Meditiya
                    </h2>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-300/10 bg-amber-300/[0.05]">
                    <Sparkles className="h-4 w-4 text-amber-300" />
                  </div>
                </div>

                {/* ==================================================
                    MAIN NAVIGATION
                ================================================== */}

                <div>
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-white/30">
                    Main Navigation
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    {navLinks.map((link, index) => {
                      const Icon = link.icon;
                      const active = isActive(link.href);

                      return (
                        <motion.div
                          key={link.href}
                          initial={{
                            opacity: 0,
                            y: 10,
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
                            className={cn(
                              'group flex items-center gap-3 rounded-2xl border p-4 transition-all duration-300',
                              active
                                ? 'border-amber-300/30 bg-amber-100 text-amber-700 dark:border-amber-300/20 dark:bg-amber-300/[0.08] dark:text-amber-300'
                                : 'border-border bg-white/80 text-muted-foreground hover:bg-amber-50 hover:text-foreground dark:border-white/[0.06] dark:bg-white/[0.025] dark:text-white/60 dark:hover:bg-white/[0.06] dark:hover:text-white'
                            )}
                          >
                            <div
                              className={cn(
                                'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                                active
                                  ? 'bg-amber-300/10'
                                  : 'bg-white/[0.05]'
                              )}
                            >
                              <Icon className="h-4 w-4" />
                            </div>

                            <span className="text-sm font-medium">
                              {link.name}
                            </span>
                          </Link>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* ==================================================
                    ACCORDION SECTIONS
                ================================================== */}

                <div className="mt-5">
                  <Accordion
                    type="multiple"
                    defaultValue={['more']}
                    className="space-y-3"
                  >

                    {/* MORE ACCORDION */}

                    <AccordionItem
                      value="more"
                      className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025]"
                    >
                      <AccordionTrigger className="px-4 py-4 text-sm font-semibold text-white hover:no-underline">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-300/[0.07]">
                            <Sparkles className="h-4 w-4 text-amber-300" />
                          </div>

                          <div className="text-left">
                            <p className="text-sm font-semibold text-white">
                              More
                            </p>

                            <p className="mt-0.5 text-[10px] font-normal text-white/30">
                              Community features
                            </p>
                          </div>
                        </div>
                      </AccordionTrigger>

                      <AccordionContent className="px-3 pb-3">
                        <div className="grid grid-cols-2 gap-2">
                          {moreLinks.map((link) => {
                            const Icon = link.icon;
                            const active = isActive(link.href);

                            return (
                              <Link
                                key={link.href}
                                href={link.href}
                                className={cn(
                                  'flex items-center gap-2 rounded-xl border px-3 py-3 text-xs transition-all',
                                  active
                                    ? 'border-amber-300/30 bg-amber-100 text-amber-700 dark:border-amber-300/15 dark:bg-amber-300/[0.08] dark:text-amber-300'
                                    : 'border-border bg-white/85 text-muted-foreground hover:bg-amber-50 hover:text-foreground dark:border-white/[0.05] dark:bg-white/[0.02] dark:text-white/50 dark:hover:bg-white/[0.05] dark:hover:text-white'
                                )}
                              >
                                <Icon className="h-3.5 w-3.5 shrink-0" />

                                <span>
                                  {link.name}
                                </span>
                              </Link>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* ADMINISTRATION ACCORDION */}

                    <AccordionItem
                      value="administration"
                      className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025]"
                    >
                      <AccordionTrigger className="px-4 py-4 text-sm font-semibold text-white hover:no-underline">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-300/[0.07]">
                            <Shield className="h-4 w-4 text-amber-300" />
                          </div>

                          <div className="text-left">
                            <p className="text-sm font-semibold text-white">
                              Administration
                            </p>

                            <p className="mt-0.5 text-[10px] font-normal text-white/30">
                              Admin access
                            </p>
                          </div>
                        </div>
                      </AccordionTrigger>

                      <AccordionContent className="px-3 pb-3">
                        {!isAuthenticated ? (
                          <Link
                            href="/admin-login"
                            className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-300/20 bg-amber-300/[0.07] py-4 text-sm font-bold text-amber-300 transition-all hover:bg-amber-300/10"
                          >
                            <Shield className="h-4 w-4" />

                            Admin Login
                          </Link>
                        ) : (
                          <div className="space-y-2">
                            <Link
                              href="/admin"
                              className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-300/20 bg-amber-300/[0.07] py-4 text-sm font-bold text-amber-300 transition-all hover:bg-amber-300/10"
                            >
                              <Shield className="h-4 w-4" />

                              Admin Panel
                            </Link>

                            {isSuperAdmin && (
                              <Link
                                href="/admin/admin-management"
                                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] py-4 text-sm font-semibold text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
                              >
                                <Users className="h-4 w-4" />

                                Manage Admins
                              </Link>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setMobileMenuOpen(false);
                                logout();
                              }}
                              className="w-full rounded-xl border border-red-400/10 bg-red-400/[0.04] py-4 text-sm font-semibold text-red-400 transition-colors hover:bg-red-400/10"
                            >
                              Logout
                            </button>
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>

                {/* ==================================================
                    MOBILE FOOTER
                ================================================== */}

                <div className="pb-8 pt-10 text-center">
                  <div className="mx-auto mb-3 h-px w-16 bg-gradient-to-r from-transparent via-amber-300/30 to-transparent" />

                  <p className="text-[10px] uppercase tracking-[0.25em] text-white/20">
                    One Society • One Family
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ======================================================
          MAIN CONTENT
      ====================================================== */}

      <main className="relative z-10 min-h-[100dvh] w-full pt-16 md:pt-20">
        {children}
      </main>

      {/* ======================================================
          FOOTER
      ====================================================== */}

      <footer className="relative z-10 overflow-hidden border-t border-border bg-[color:var(--page-bg-soft)] dark:border-white/[0.08] dark:bg-[#060606]">

        {/* Footer Glow */}

        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-72 w-[600px] -translate-x-1/2 rounded-full bg-amber-400/[0.035] blur-[120px]" />

          <div
            className="absolute inset-0 opacity-[0.018]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
              backgroundSize: '50px 50px',
            }}
          />
        </div>

        {/* Accent Line */}

        <div className="relative h-px w-full bg-gradient-to-r from-transparent via-amber-300/30 to-transparent" />

        <div className="container relative mx-auto px-4 pb-8 pt-16 md:px-6">

          <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">

            {/* ==================================================
                BRAND
            ================================================== */}

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
                  className="relative h-9 w-auto drop-shadow-[0_0_12px_rgba(245,158,11,0.15)] md:h-10"
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

            {/* ==================================================
                QUICK LINKS
            ================================================== */}

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

            {/* ==================================================
                SERVICES
            ================================================== */}

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

            {/* ==================================================
                CONTACT
            ================================================== */}

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

          {/* ==================================================
              BOTTOM FOOTER
          ================================================== */}

          <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/[0.07] pt-7 text-center md:flex-row md:text-left">

            <p className="text-[11px] text-muted-foreground dark:text-white/25">
              © {new Date().getFullYear()} Meditiya Nagar
              Society. All rights reserved.
            </p>

            <p className="text-[11px] text-muted-foreground dark:text-white/25">
              Designed with{' '}

              <Heart className="mx-1 inline h-3 w-3 text-amber-500 dark:text-amber-400" />

              for the community.
            </p>
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