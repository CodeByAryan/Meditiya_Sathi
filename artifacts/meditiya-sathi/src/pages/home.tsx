import { useEffect, useState, useRef } from 'react';
import { Link } from 'wouter';
import { motion, useInView, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
  ArrowRight, Calendar, Heart, Users, Bell, Sparkles, Shield,
  MapPin, Zap, Star, HandshakeIcon, BookOpen, Gift, AlertCircle,
  ChevronRight, Image as ImageIcon, Music, ShoppingBag, Clock,
  Building2, PartyPopper, Wrench, Phone, Mail, ChevronDown,
  Quote, Camera, Eye, ArrowUpRight
} from 'lucide-react';
import {
  useGetStatsSummary,
  useGetUpcomingEventsSummary,
  useListNotices,
  useGetDonationProgress
} from '@workspace/api-client-react';
import { GANPATI_FESTIVAL } from '@/lib/festival-countdown';

// ─── Animated Counter ───────────────────────────────────────
function AnimatedCounter({ value, prefix = '', suffix = '' }: { value: string | number; prefix?: string; suffix?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const numericValue = typeof value === 'string' && !isNaN(Number(value)) ? Number(value) : typeof value === 'number' ? value : 0;
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));
  const springConfig = { stiffness: 50, damping: 20 };
  const springValue = useSpring(count, springConfig);

  useEffect(() => {
    if (isInView && numericValue > 0) {
      count.set(numericValue);
    }
  }, [isInView, numericValue, count]);

  const displayValue = useTransform(rounded, (latest) => {
    if (numericValue >= 100000) return `${(latest / 100000).toFixed(1)}`;
    if (numericValue >= 1000) return `${(latest / 1000).toFixed(1)}K`;
    return latest.toString();
  });

  if (typeof value === 'string' && !/^\d+$/.test(value)) {
    return <span ref={ref}>{value}</span>;
  }

  return (
    <span ref={ref}>
      {prefix}
      <motion.span>{displayValue}</motion.span>
      {suffix}
    </span>
  );
}

// ─── Countdown Timer ────────────────────────────────────────
function CountdownTimer({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const target = new Date(targetDate).getTime();
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = target - now;
      if (distance < 0) { clearInterval(interval); return; }
      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000)
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <div className="flex items-center gap-3 md:gap-5 justify-center">
      {[
        { label: 'Days', value: timeLeft.days },
        { label: 'Hours', value: timeLeft.hours },
        { label: 'Minutes', value: timeLeft.minutes },
        { label: 'Seconds', value: timeLeft.seconds }
      ].map((item) => (
        <div key={item.label} className="flex flex-col items-center">
          <div className="w-[68px] h-[68px] md:w-24 md:h-24 rounded-2xl flex items-center justify-center relative overflow-hidden
                          bg-white/10 dark:bg-white/[0.06] backdrop-blur-md border border-white/20 dark:border-amber-400/20 shadow-lg shadow-orange-500/10">
            <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent dark:from-amber-500/10"></div>
            <span className="text-2xl md:text-4xl font-bold text-white drop-shadow-lg z-10 tabular-nums">
              {item.value.toString().padStart(2, '0')}
            </span>
          </div>
          <span className="text-[10px] md:text-xs font-semibold text-white/70 uppercase tracking-widest mt-2">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Floating Particle ──────────────────────────────────────
function FloatingParticle({ index }: { index: number }) {
  const size = Math.random() * 6 + 2;
  const left = Math.random() * 100;
  const delay = Math.random() * 5;
  const duration = Math.random() * 4 + 4;
  return (
    <div
      className="absolute rounded-full"
      style={{
        width: size,
        height: size,
        left: `${left}%`,
        bottom: '-10px',
        background: `hsl(${Math.random() * 60 + 220}, 80%, 60%)`,
        opacity: 0.15 + Math.random() * 0.15,
        animation: `float ${duration}s ease-in-out ${delay}s infinite`,
      }}
    />
  );
}

// ─── Feature Card ───────────────────────────────────────────
const featureCards = [
  { icon: Building2, label: 'Buildings', desc: 'Explore our well-maintained residential buildings and amenities.', href: '/services', color: 'from-blue-500 to-cyan-400' },
  { icon: Users, label: 'Residents', desc: 'Connect with your neighbours and build lasting relationships.', href: '/about', color: 'from-violet-500 to-purple-400' },
  { icon: PartyPopper, label: 'Festivals', desc: 'Celebrate vibrant festivals with the entire community.', href: '/festivals', color: 'from-amber-500 to-orange-400' },
  { icon: Calendar, label: 'Events', desc: 'Stay updated with exciting community events and activities.', href: '/events', color: 'from-emerald-500 to-teal-400' },
  { icon: Bell, label: 'Notices', desc: 'Important announcements and updates at your fingertips.', href: '/notices', color: 'from-rose-500 to-pink-400' },
  { icon: Wrench, label: 'Services', desc: 'Request maintenance and access community services.', href: '/services', color: 'from-indigo-500 to-blue-400' },
];

// ─── Emergency Contacts Data ────────────────────────────────
const emergencyContacts = [
  { name: 'Police', number: '100', icon: Shield, color: 'from-blue-600 to-blue-400' },
  { name: 'Ambulance', number: '108', icon: Heart, color: 'from-red-600 to-red-400' },
  { name: 'Fire Brigade', number: '101', icon: AlertCircle, color: 'from-orange-600 to-orange-400' },
  { name: 'Society Security', number: '+91 98765 43210', icon: Phone, color: 'from-green-600 to-green-400' },
];

// ─── Section Wrapper ────────────────────────────────────────
function SectionWrapper({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={`relative overflow-hidden ${className}`}>
      {children}
    </section>
  );
}

function SectionHeader({ badge, title, description }: { badge: string; title: string; description: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="text-center mb-16"
    >
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 dark:bg-primary/20 text-primary text-xs font-bold uppercase tracking-widest mb-5 border border-primary/20">
        <Sparkles className="w-3.5 h-3.5" />
        <span>{badge}</span>
      </div>
      <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-secondary dark:text-white mb-5 leading-tight">
        {title}
      </h2>
      <p className="text-foreground/60 dark:text-white/50 text-lg max-w-2xl mx-auto leading-relaxed">
        {description}
      </p>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  MAIN HOME COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function Home() {
  const { data: stats } = useGetStatsSummary();
  const { data: upcomingEvents } = useGetUpcomingEventsSummary();
  const { data: notices } = useListNotices({ pinned: true, limit: 3 });
  const { data: donationProgress } = useGetDonationProgress();

  const upcomingEventsList = upcomingEvents || [];
  const noticesList = notices || [];

  const festival = GANPATI_FESTIVAL;
  const festivalDate = new Date(festival.date);
  const festivalFormatted = festivalDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const isUpcoming = festivalDate.getTime() > new Date().getTime();

  const scrollToSection = () => {
    const el = document.getElementById('features');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="w-full">

      {/* ═══════════════════════════════════════════════════════
          1. HERO SECTION
          ═══════════════════════════════════════════════════════ */}
      <SectionWrapper className="min-h-[100vh] flex items-center justify-center">
        {/* Animated gradient background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#0f172a] bg-gradient-animate"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.15),transparent_50%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(168,85,247,0.12),transparent_50%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(20,184,166,0.08),transparent_50%)]"></div>
        </div>

        {/* Floating particles */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 20 }).map((_, i) => <FloatingParticle key={i} index={i} />)}
          {/* Glow orbs */}
          <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-blue-500/10 blur-[100px] animate-glow-pulse" />
          <div className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full bg-purple-500/10 blur-[120px] animate-glow-pulse" style={{ animationDelay: '1.5s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-teal-500/5 blur-[150px] animate-glow-pulse" style={{ animationDelay: '3s' }} />
        </div>

        {/* Grid overlay */}
        <div className="absolute inset-0 z-0 bg-grid opacity-40"></div>

        <div className="container relative z-10 mx-auto px-4 py-24 flex flex-col items-center text-center">
          {/* Logo + Brand */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="mb-10"
          >
            <div className="relative inline-flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/30 via-purple-500/30 to-teal-500/30 blur-3xl" />
              <div className="relative flex items-center gap-4 md:gap-6 bg-white/[0.06] backdrop-blur-xl border border-white/[0.12] rounded-2xl px-6 py-4 md:px-10 md:py-5 shadow-2xl">
                <img
                  src={`${import.meta.env.BASE_URL.replace(/\/$/, "")}/logo.png`}
                  alt="Meditiya Sathi"
                  className="h-12 md:h-16 w-auto drop-shadow-[0_0_20px_rgba(99,102,241,0.3)]"
                />
                <div className="text-left">
                  <h1 className="font-serif text-2xl md:text-4xl font-bold text-white tracking-tight">Meditiya Sathi</h1>
                  <p className="text-xs md:text-sm text-white/50 font-medium tracking-widest uppercase">One Society • One Family</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Tagline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] backdrop-blur-md border border-white/[0.10] text-white/80 text-sm font-medium mb-8 shadow-lg"
          >
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span>Connecting Meditiya Nagar Together</span>
          </motion.div>

          {/* Main heading */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-serif font-bold text-white tracking-tight leading-[1.1] max-w-5xl mb-6 drop-shadow-lg"
          >
            One Society.<br />
            <span className="text-gradient text-5xl sm:text-6xl md:text-8xl lg:text-9xl">One Family.</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-base md:text-lg text-white/60 max-w-2xl mb-10 leading-relaxed"
          >
            Experience the cultural richness and vibrant community life of Meditiya Nagar. Stay connected, participate in events, and celebrate together.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
          >
            <Link
              href="/events"
              className="group relative inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold text-base overflow-hidden
                         bg-white/[0.10] backdrop-blur-md border border-white/[0.20] text-white
                         hover:bg-white/[0.18] transition-all duration-300 shadow-lg shadow-blue-500/10 hover:shadow-blue-500/25
                         hover:-translate-y-0.5 w-full sm:w-auto justify-center"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-teal-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <span className="relative z-10 flex items-center gap-2">
                Explore Community
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 rounded-full glow-border opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>

            <Link
              href="/admin-login"
              className="group relative inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold text-base overflow-hidden
                         bg-white/[0.04] backdrop-blur-md border border-white/[0.10] text-white/80
                         hover:bg-white/[0.10] hover:text-white transition-all duration-300
                         hover:-translate-y-0.5 w-full sm:w-auto justify-center"
            >
              <Shield className="w-4 h-4" />
              <span>Admin Login</span>
              <div className="absolute inset-0 rounded-full glow-border opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          </motion.div>

          {/* Scroll indicator */}
          <motion.button
            onClick={scrollToSection}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.8 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/30 hover:text-white/60 transition-colors animate-bounce"
          >
            <ChevronDown className="w-6 h-6" />
          </motion.button>
        </div>
      </SectionWrapper>

      {/* ═══════════════════════════════════════════════════════
          2. GANPATI COUNTDOWN SECTION
          ═══════════════════════════════════════════════════════ */}
      <SectionWrapper className="py-20 md:py-28 bg-background">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-orange-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative rounded-3xl overflow-hidden"
          >
            {/* Festival gradient glass card */}
            <div className="relative bg-gradient-to-br from-amber-900/90 via-amber-950/90 to-orange-950/90 backdrop-blur-xl border border-amber-500/20 rounded-3xl p-8 md:p-12 lg:p-16 shadow-2xl shadow-amber-900/30 overflow-hidden">
              {/* Glow effects */}
              <div className="absolute -top-20 -right-20 w-60 h-60 bg-amber-500/20 rounded-full blur-[100px]" />
              <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-orange-500/20 rounded-full blur-[100px]" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(251,191,36,0.06),transparent_70%)]" />

              {/* Decorative top border */}
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

              {/* Geometric pattern overlay */}
              <div className="absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage: `radial-gradient(circle at 1px 1px, #fbbf24 1px, transparent 0)`,
                  backgroundSize: '40px 40px'
                }}
              />

              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10 md:gap-16">
                {/* Left: Text */}
                <div className="flex-1 text-center md:text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold uppercase tracking-widest mb-4 border border-amber-400/20">
                    {festival.emoji} Ganpati 2026 Celebration
                  </div>
                  <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-white mb-2 leading-tight">
                    {festival.name} is Coming
                  </h2>
                  <p className="text-amber-200/80 text-lg md:text-xl mb-2 font-medium">{festivalFormatted}</p>
                  {festival.tagline && (
                    <p className="text-amber-300/50 text-sm md:text-base italic mt-3">"{festival.tagline}"</p>
                  )}
                  <div className="flex flex-wrap gap-3 justify-center md:justify-start mt-8">
                    <Link
                      href="/festivals"
                      className="group inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm
                                 bg-gradient-to-r from-amber-500 to-orange-500 text-white
                                 hover:from-amber-400 hover:to-orange-400 transition-all duration-300 shadow-lg shadow-amber-500/30
                                 hover:shadow-xl hover:shadow-amber-500/40 hover:-translate-y-0.5"
                    >
                      Explore Festivals <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                    <Link
                      href="/donations"
                      className="group inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm
                                 bg-white/[0.08] backdrop-blur-sm border border-white/[0.15] text-white/90
                                 hover:bg-white/[0.15] transition-all duration-300 hover:-translate-y-0.5"
                    >
                      <Heart className="w-4 h-4" /> Contribute
                    </Link>
                  </div>
                </div>

                {/* Right: Countdown */}
                <div className="flex-1 w-full">
                  {isUpcoming ? (
                    <>
                      <div className="text-center mb-5">
                        <span className="text-amber-300/60 text-xs font-semibold uppercase tracking-[0.2em]">Countdown Begins</span>
                      </div>
                      <CountdownTimer targetDate={festival.date} />
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-20 h-20 mx-auto bg-amber-500/20 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm border border-amber-400/20">
                        <PartyPopper className="w-10 h-10 text-amber-400" />
                      </div>
                      <p className="text-amber-200 text-xl font-bold">Festival Celebrations Underway!</p>
                      <p className="text-amber-200/60 mt-2">Join the celebrations now.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </SectionWrapper>

      {/* ═══════════════════════════════════════════════════════
          3. FEATURE CARDS SECTION
          ═══════════════════════════════════════════════════════ */}
      <SectionWrapper id="features" className="py-20 md:py-28 bg-muted/30">
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-accent/5 rounded-full blur-3xl translate-y-1/2 translate-x-1/2"></div>

        <div className="container mx-auto px-4 relative z-10">
          <SectionHeader
            badge="Our Features"
            title="Everything at Your Fingertips"
            description="Explore the comprehensive suite of features designed to keep Meditiya Nagar residents connected and informed."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featureCards.map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="group relative"
              >
                <Link href={card.href} className="block">
                  <div className="relative h-full glass rounded-2xl p-8 hover-lift cursor-pointer overflow-hidden">
                    {/* Hover glow background */}
                    <div className={`absolute -inset-20 bg-gradient-to-br ${card.color} opacity-0 group-hover:opacity-[0.03] blur-3xl transition-opacity duration-700`} />

                    {/* Icon with gradient glow */}
                    <div className="relative mb-6">
                      <div className={`absolute inset-0 bg-gradient-to-br ${card.color} blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500`} />
                      <div className={`relative w-14 h-14 rounded-xl bg-gradient-to-br ${card.color} bg-opacity-20 flex items-center justify-center shadow-lg`}>
                        <card.icon className="w-7 h-7 text-white" />
                      </div>
                    </div>

                    <h3 className="text-xl font-bold text-secondary dark:text-white mb-3 group-hover:text-primary transition-colors">
                      {card.label}
                    </h3>
                    <p className="text-foreground/60 dark:text-white/50 text-sm leading-relaxed mb-6">
                      {card.desc}
                    </p>

                    <div className="inline-flex items-center gap-2 text-primary font-semibold text-sm group-hover:gap-3 transition-all">
                      Explore <ArrowUpRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </SectionWrapper>

      {/* ═══════════════════════════════════════════════════════
          4. COMMUNITY STATISTICS
          ═══════════════════════════════════════════════════════ */}
      <SectionWrapper className="py-20 md:py-28 bg-background">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

        <div className="container mx-auto px-4 relative z-10">
          <SectionHeader
            badge="Community Stats"
            title="Our Growing Family"
            description="Meditiya Nagar is home to a thriving community. Here's a snapshot of our society."
          />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[
              { label: 'Buildings', value: (stats as any)?.totalBuildings ?? 12, icon: Building2, color: 'from-blue-500 to-cyan-400' },
              { label: 'Total Residents', value: stats?.totalResidents ?? 500, icon: Users, color: 'from-violet-500 to-purple-400', suffix: '+' },
              { label: 'Upcoming Events', value: stats?.totalEvents ?? 24, icon: Calendar, color: 'from-emerald-500 to-teal-400', suffix: '+' },
              { label: 'Active Festivals', value: (stats as any)?.totalFestivals ?? 8, icon: PartyPopper, color: 'from-amber-500 to-orange-400', suffix: '+' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="relative group"
              >
                <div className="glass rounded-2xl p-6 md:p-8 text-center hover-lift">
                  {/* Icon */}
                  <div className={`inline-flex w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} bg-opacity-20 items-center justify-center mb-4 shadow-lg`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>

                  <h3 className="text-3xl md:text-4xl font-bold text-secondary dark:text-white mb-1">
                    <AnimatedCounter value={stat.value} suffix={stat.suffix || ''} />
                  </h3>
                  <p className="text-sm text-foreground/60 dark:text-white/50 font-medium">{stat.label}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </SectionWrapper>

      {/* ═══════════════════════════════════════════════════════
          5. EVENTS SECTION
          ═══════════════════════════════════════════════════════ */}
      <SectionWrapper className="py-20 md:py-28 bg-muted/30">
        <div className="absolute top-0 left-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2"></div>

        <div className="container mx-auto px-4 relative z-10">
          <SectionHeader
            badge="Upcoming Events"
            title="What's Happening"
            description="Stay engaged with our exciting lineup of community events, celebrations, and activities."
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {upcomingEventsList.slice(0, 3).map((event, i) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="group"
              >
                <div className="glass rounded-2xl overflow-hidden hover-lift">
                  {/* Event image / gradient placeholder */}
                  <div className="h-44 bg-gradient-to-br from-primary/30 via-purple-500/20 to-accent/30 relative overflow-hidden">
                    <div className="absolute inset-0 bg-grid opacity-20"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Calendar className="w-16 h-16 text-white/20 group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    {/* Date badge */}
                    <div className="absolute top-4 left-4 px-3 py-1.5 rounded-lg bg-white/15 backdrop-blur-md border border-white/20 text-white text-xs font-bold">
                      <Zap className="w-3 h-3 inline mr-1" />
                      {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>

                  <div className="p-6">
                    <h3 className="text-lg font-bold text-secondary dark:text-white mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                      {event.title}
                    </h3>
                    <p className="text-sm text-foreground/60 dark:text-white/50 line-clamp-2 mb-4 leading-relaxed">
                      {event.description}
                    </p>
                    <Link
                      href="/events"
                      className="inline-flex items-center gap-2 text-primary font-medium text-sm group-hover:gap-3 transition-all"
                    >
                      View Details <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
            <Link
              href="/events"
              className="group inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold
                         glass hover-lift text-secondary dark:text-white"
            >
              See All Events <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>
      </SectionWrapper>

      {/* ═══════════════════════════════════════════════════════
          6. NOTICE BOARD
          ═══════════════════════════════════════════════════════ */}
      <SectionWrapper className="py-20 md:py-28 bg-background">
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

        <div className="container mx-auto px-4 relative z-10">
          <SectionHeader
            badge="Notice Board"
            title="Announcements & Updates"
            description="Stay informed with important updates and community announcements."
          />

          <div className="max-w-3xl mx-auto space-y-5">
            {noticesList.slice(0, 4).map((notice, i) => {
              const isImportant = notice.isPinned || (notice as any).isImportant;
              return (
                <motion.div
                  key={notice.id}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  className={`group relative rounded-2xl transition-all duration-500 hover-lift
                    ${isImportant
                      ? 'glass border-l-4 border-l-primary shadow-lg shadow-primary/5'
                      : 'glass'
                    }`}
                >
                  {/* Highlight glow for important notices */}
                  {isImportant && (
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-accent/20 rounded-3xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />
                  )}

                  <div className="p-6 md:p-8">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0
                        ${isImportant
                          ? 'bg-gradient-to-br from-primary/20 to-accent/20 text-primary'
                          : 'bg-foreground/5 text-foreground/40'
                        }`}>
                        <Bell className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="text-lg font-bold text-secondary dark:text-white">{notice.title}</h3>
                          {isImportant && (
                            <span className="px-2.5 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold uppercase tracking-wider border border-primary/20">
                              Important
                            </span>
                          )}
                        </div>
                        <p className="text-foreground/60 dark:text-white/50 text-sm leading-relaxed line-clamp-2">
                          {(notice as any).description || ''}
                        </p>
                        <div className="flex items-center gap-3 mt-4">
                          <span className="text-xs text-foreground/40 dark:text-white/30 font-medium flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(notice.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                          <Link href="/notices" className="text-xs text-primary font-semibold hover:underline">
                            Read more
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
            <Link
              href="/notices"
              className="group inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold
                         glass hover-lift text-secondary dark:text-white"
            >
              View All Notices <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>
      </SectionWrapper>

      {/* ═══════════════════════════════════════════════════════
          7. FESTIVAL SHOWCASE
          ═══════════════════════════════════════════════════════ */}
      <SectionWrapper className="py-20 md:py-28 bg-muted/30">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-orange-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

        <div className="container mx-auto px-4 relative z-10">
          <SectionHeader
            badge="Festival Showcase"
            title="Celebrate Together"
            description="Meditiya Nagar comes alive during festivals. Join us in celebrating our rich cultural heritage."
          />

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative rounded-3xl overflow-hidden"
          >
            <div className="relative bg-gradient-to-br from-indigo-900/90 via-purple-900/80 to-rose-900/70 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl shadow-purple-900/30">
              {/* Decorative glow */}
              <div className="absolute -top-20 -right-20 w-80 h-80 bg-purple-500/15 rounded-full blur-[120px]" />
              <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-rose-500/15 rounded-full blur-[120px]" />

              <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 p-8 md:p-12 lg:p-16 items-center">
                {/* Left: Festival info */}
                <div className="text-center md:text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white/80 text-xs font-bold uppercase tracking-widest mb-4 border border-white/10">
                    <Star className="w-3 h-3" /> Grand Celebrations
                  </div>
                  <h3 className="text-3xl md:text-5xl font-serif font-bold text-white mb-4 leading-tight">
                    Experience the <br />
                    <span className="text-gradient-warm">Festival Spirit</span>
                  </h3>
                  <p className="text-white/60 text-base md:text-lg leading-relaxed mb-6">
                    From Ganesh Chaturthi to Diwali, our community celebrates every festival with grandeur, unity, and joy. Participate, contribute, and be a part of something beautiful.
                  </p>
                  <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                    <Link
                      href="/festivals"
                      className="group inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm
                                 bg-white text-secondary hover:bg-white/90 transition-all hover:-translate-y-0.5 shadow-xl"
                    >
                      View Festivals <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                    <Link
                      href="/gallery"
                      className="group inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm
                                 bg-white/[0.08] backdrop-blur-sm border border-white/[0.15] text-white
                                 hover:bg-white/[0.15] transition-all hover:-translate-y-0.5"
                    >
                      <Camera className="w-4 h-4" /> Gallery
                    </Link>
                  </div>
                </div>

                {/* Right: Celebration illustration */}
                <div className="relative flex items-center justify-center">
                  <div className="relative w-full max-w-sm aspect-square">
                    {/* Decorative circles */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-500/20 via-purple-500/20 to-rose-500/20 blur-2xl animate-float" />
                    <div className="absolute inset-4 rounded-full bg-gradient-to-br from-amber-500/10 via-purple-500/10 to-rose-500/10 blur-xl animate-float-delayed" />

                    {/* Center icon */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <PartyPopper className="w-20 h-20 md:w-28 md:h-28 text-white/30 mx-auto mb-4" />
                        <p className="text-white/40 text-sm font-medium">Festivals • Events • Celebrations</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </SectionWrapper>

      {/* ═══════════════════════════════════════════════════════
          8. GALLERY SECTION
          ═══════════════════════════════════════════════════════ */}
      <SectionWrapper className="py-20 md:py-28 bg-background">
        <div className="absolute top-0 left-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2"></div>

        <div className="container mx-auto px-4 relative z-10">
          <SectionHeader
            badge="Gallery"
            title="Capturing Moments"
            description="Relive the beauty of our community celebrations and everyday moments through our photo gallery."
          />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
                className="group relative aspect-square rounded-2xl overflow-hidden cursor-pointer glass hover-lift"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-purple-500/10 to-accent/20">
                  <div className="absolute inset-0 bg-grid opacity-10" />
                </div>

                {/* Hover zoom effect */}
                <div className="absolute inset-0 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                  <ImageIcon className="w-16 h-16 text-white/30 group-hover:text-white/50 transition-colors" />
                </div>

                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                  <div className="flex items-center gap-2 text-white text-xs font-medium">
                    <Camera className="w-3.5 h-3.5" />
                    View Photo
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
            <Link
              href="/gallery"
              className="group inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold
                         glass hover-lift text-secondary dark:text-white"
            >
              <Eye className="w-4 h-4" /> Explore Gallery <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>
      </SectionWrapper>

      {/* ═══════════════════════════════════════════════════════
          9. EMERGENCY CONTACTS
          ═══════════════════════════════════════════════════════ */}
      <SectionWrapper className="py-20 md:py-28 bg-muted/30">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

        <div className="container mx-auto px-4 relative z-10">
          <SectionHeader
            badge="Emergency"
            title="Quick Access Help"
            description="Important emergency numbers and contacts — always within reach."
          />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {emergencyContacts.map((contact, i) => (
              <motion.div
                key={contact.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="group"
              >
                <div className="glass rounded-2xl p-6 md:p-8 text-center hover-lift">
                  <div className={`inline-flex w-14 h-14 rounded-xl bg-gradient-to-br ${contact.color} items-center justify-center mb-4 shadow-lg`}>
                    <contact.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-secondary dark:text-white mb-1">{contact.name}</h3>
                  <p className="text-xl md:text-2xl font-bold text-primary">{contact.number}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-8"
          >
            <Link
              href="/emergency"
              className="group inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm
                         glass hover-lift text-red-500 border border-red-500/20 hover:border-red-500/40"
            >
              <AlertCircle className="w-4 h-4" /> View All Contacts <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>
      </SectionWrapper>

      {/* ═══════════════════════════════════════════════════════
          10. DONATION / CTA SECTION (BEFORE FOOTER)
          ═══════════════════════════════════════════════════════ */}
      <SectionWrapper className="py-20 md:py-28 bg-background">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 opacity-50"></div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-bold uppercase tracking-widest mb-4 border border-accent/20">
                <Heart className="w-3.5 h-3.5" /> Make a Difference
              </div>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-secondary dark:text-white mb-6 leading-tight">
                Support Our Community
              </h2>
              <p className="text-foreground/60 dark:text-white/50 text-lg mb-8 leading-relaxed">
                Your generous contributions help us organize festivals, social welfare programs, and community development initiatives that strengthen our bonds.
              </p>

              {/* Donation Progress */}
              <div className="glass rounded-2xl p-6 mb-8">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-semibold text-secondary dark:text-white">Campaign Progress</span>
                  <span className="text-sm font-bold text-primary">{donationProgress?.percentage || 65}%</span>
                </div>
                <div className="w-full h-3 bg-foreground/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${donationProgress?.percentage || 65}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.5, delay: 0.3 }}
                    className="h-full bg-gradient-to-r from-primary via-purple-500 to-accent rounded-full"
                  />
                </div>
                <p className="text-sm text-foreground/50 dark:text-white/40 mt-4">
                  Raised: <span className="font-bold text-primary">₹{donationProgress?.raised || '10'} L</span> of ₹{(donationProgress as any)?.target || '15'} L
                </p>
              </div>

              <Link
                href="/donations"
                className="group inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold text-base
                           bg-gradient-to-r from-primary via-purple-500 to-accent text-white
                           hover:opacity-90 transition-all duration-300 shadow-xl shadow-primary/20 hover:shadow-primary/30
                           hover:-translate-y-0.5"
              >
                Contribute Now <Heart className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </Link>
            </motion.div>

            {/* Right: Donation causes */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="glass rounded-3xl p-8 md:p-10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-accent/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

                <div className="relative z-10 space-y-6">
                  <h3 className="text-2xl font-bold text-secondary dark:text-white mb-6">Your Contributions Support</h3>
                  {[
                    { icon: Gift, title: 'Annual Festivals', desc: 'Supporting grand celebrations and cultural events' },
                    { icon: Users, title: 'Social Programs', desc: 'Community welfare initiatives for all residents' },
                    { icon: BookOpen, title: 'Education & Youth', desc: 'Development programs for the younger generation' },
                    { icon: HandshakeIcon, title: 'Emergency Relief', desc: 'Quick response to community crises and needs' }
                  ].map((item, i) => (
                    <div key={i} className="flex gap-4 items-start group/cause">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0 group-hover/cause:scale-110 transition-transform">
                        <item.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-bold text-secondary dark:text-white mb-1">{item.title}</h4>
                        <p className="text-sm text-foreground/60 dark:text-white/50">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </SectionWrapper>

      {/* ═══════════════════════════════════════════════════════
          FINAL CTA SECTION
          ═══════════════════════════════════════════════════════ */}
      <SectionWrapper className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-purple-500/80 to-accent/90" />
        <div className="absolute inset-0 bg-grid opacity-10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.1),transparent_70%)]" />

        <div className="container mx-auto px-4 relative z-10 py-20 md:py-28 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-serif font-bold text-white mb-6 leading-tight">
              Ready to Join the Community?
            </h2>
            <p className="text-white/80 text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
              Become part of our vibrant community and experience the warmth of one family united by culture, values, and shared dreams.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/contact"
                className="group inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold text-base
                           bg-white text-secondary hover:bg-white/90 transition-all shadow-2xl
                           hover:-translate-y-0.5"
              >
                Get in Touch <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/about"
                className="group inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold text-base
                           bg-white/[0.10] backdrop-blur-sm border border-white/[0.25] text-white
                           hover:bg-white/[0.20] transition-all hover:-translate-y-0.5"
              >
                Learn More
              </Link>
            </div>
          </motion.div>
        </div>
      </SectionWrapper>

      {/* ═══════════════════════════════════════════════════════
          FOOTER
          ═══════════════════════════════════════════════════════ */}
      <SectionWrapper className="bg-secondary dark:bg-[#0a0a1a] text-secondary-foreground">
        <div className="absolute inset-0 bg-grid opacity-[0.03]" />
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

        <div className="container mx-auto px-4 relative z-10 py-16 md:py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 md:gap-12 mb-12">
            {/* Brand */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <img
                  src={`${import.meta.env.BASE_URL.replace(/\/$/, "")}/logo.png`}
                  alt="Meditiya Sathi"
                  className="h-10 w-auto brightness-0 invert opacity-80"
                />
                <div className="flex flex-col">
                  <span className="font-serif font-bold text-xl md:text-2xl text-white leading-none">Meditiya Sathi</span>
                  <span className="text-[10px] font-bold tracking-widest text-primary leading-none mt-1">ONE SOCIETY • ONE FAMILY</span>
                </div>
              </div>
              <p className="text-secondary-foreground/60 text-sm leading-relaxed mt-2">
                The official digital platform for Meditiya Nagar society. Bridging gaps, celebrating culture, and building a stronger community together.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-serif font-bold text-lg text-primary mb-6">Quick Links</h4>
              <ul className="flex flex-col gap-3 text-sm">
                {[
                  { name: 'About Us', href: '/about' },
                  { name: 'Upcoming Events', href: '/events' },
                  { name: 'Notice Board', href: '/notices' },
                  { name: 'Support & Donate', href: '/donations' },
                ].map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-secondary-foreground/60 hover:text-white transition-colors flex items-center gap-1.5 group/footer-link">
                      <ChevronRight className="w-3 h-3 text-primary/50 group-hover/footer-link:translate-x-0.5 transition-transform" />
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Services */}
            <div>
              <h4 className="font-serif font-bold text-lg text-primary mb-6">Services</h4>
              <ul className="flex flex-col gap-3 text-sm">
                {[
                  { name: 'Service Requests', href: '/services' },
                  { name: 'Marketplace', href: '/marketplace' },
                  { name: 'Lost & Found', href: '/lost-found' },
                  { name: 'Emergency Contacts', href: '/emergency' },
                ].map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-secondary-foreground/60 hover:text-white transition-colors flex items-center gap-1.5 group/footer-link">
                      <ChevronRight className="w-3 h-3 text-primary/50 group-hover/footer-link:translate-x-0.5 transition-transform" />
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-serif font-bold text-lg text-primary mb-6">Contact</h4>
              <ul className="flex flex-col gap-4 text-sm text-secondary-foreground/60">
                <li className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>Meditiya Nagar, Sector 4,<br />Mumbai, Maharashtra 400001</span>
                </li>
                <li className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-primary shrink-0" />
                  <span>contact@meditiyanagar.com</span>
                </li>
                <li className="flex items-center gap-3">
                  <Shield className="w-4 h-4 text-primary shrink-0" />
                  <Link href="/admin-login" className="hover:text-white transition-colors">Admin Login</Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-secondary-foreground/40">
            <p>© {new Date().getFullYear()} Meditiya Nagar Society. All rights reserved.</p>
            <p className="flex items-center gap-1">
              Designed with <Heart className="w-3 h-3 inline text-primary" /> for the community.
            </p>
          </div>
        </div>
      </SectionWrapper>
    </div>
  );
}

