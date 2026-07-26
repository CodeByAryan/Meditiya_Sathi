import { useEffect, useState, useRef } from 'react';
import { Link } from 'wouter';
import { motion, useInView, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { 
  ArrowRight, Calendar, Heart, Users, Bell, Sparkles, Shield, 
  MapPin, Zap, Star, HandshakeIcon, BookOpen, Gift, AlertCircle, 
  ChevronRight, Image as ImageIcon, Music, ShoppingBag 
} from 'lucide-react';
import { 
  useGetStatsSummary, 
  useGetUpcomingEventsSummary, 
  useListNotices,
  useGetDonationProgress
} from '@workspace/api-client-react';

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

  // For string values like '500+' or '85+', just display them directly
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

function CountdownTimer({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const target = new Date(targetDate).getTime();
    
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = target - now;
      
      if (distance < 0) {
        clearInterval(interval);
        return;
      }
      
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
    <div className="flex items-center gap-3 md:gap-6 justify-center">
      {[
        { label: 'Days', value: timeLeft.days },
        { label: 'Hours', value: timeLeft.hours },
        { label: 'Minutes', value: timeLeft.minutes },
        { label: 'Seconds', value: timeLeft.seconds }
      ].map((item, i) => (
        <div key={item.label} className="flex flex-col items-center">
          <div className="w-16 h-16 md:w-24 md:h-24 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-xl mb-2 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent"></div>
            <span className="text-2xl md:text-4xl font-bold text-white tracking-tighter drop-shadow-md z-10">{item.value.toString().padStart(2, '0')}</span>
          </div>
          <span className="text-xs md:text-sm font-medium text-white/80 uppercase tracking-widest">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const { data: stats } = useGetStatsSummary();
  const { data: upcomingEvents } = useGetUpcomingEventsSummary();
  const { data: notices } = useListNotices({ pinned: true, limit: 3 });
  const { data: donationProgress } = useGetDonationProgress();

  const upcomingEventsList = upcomingEvents || [];
  const noticesList = notices || [];

  return (
    <div className="w-full">
      {/* SLIDE 1: Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0 bg-secondary">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] from-primary/30 via-secondary to-slate-950 opacity-90"></div>
          <div className="absolute inset-0 bg-pattern opacity-20"></div>
          <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-background to-transparent"></div>
        </div>

        <div className="container relative z-10 mx-auto px-4 py-20 flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white/90 text-sm font-medium mb-8 shadow-lg"
          >
            <Sparkles className="w-4 h-4 text-accent" />
            <span>Welcome to the Meditiya Nagar Digital Portal</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-5xl md:text-7xl lg:text-8xl font-serif font-bold text-white tracking-tight leading-tight max-w-4xl mb-6 drop-shadow-lg"
          >
            One Society.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-primary">One Family.</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg md:text-xl text-white/80 max-w-2xl mb-12 leading-relaxed"
          >
            Experience the cultural richness and vibrant community life of Meditiya Nagar. Stay connected, participate in events, and celebrate together.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center gap-4"
          >
            <Link href="/events" className="px-8 py-4 bg-primary text-white rounded-full font-bold text-lg hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(255,122,0,0.4)] hover:shadow-[0_0_30px_rgba(255,122,0,0.6)] hover:-translate-y-1 w-full sm:w-auto">
              Explore Events
            </Link>
            <Link href="/about" className="px-8 py-4 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-full font-bold text-lg hover:bg-white/20 transition-all w-full sm:w-auto">
              Our Community
            </Link>
          </motion.div>
        </div>
      </section>

      {/* SLIDE 2: Countdown / Festival Section */}
      <section className="py-20 relative bg-background overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="bg-secondary rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-12 border border-secondary/20"
          >
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10"></div>
            
            <div className="flex-1 text-center md:text-left z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/20 text-accent text-xs font-bold uppercase tracking-widest mb-4">
                🎉 Upcoming Grand Festival
              </div>
              <h2 className="text-4xl md:text-5xl font-serif font-bold text-white mb-4">Ganesh Utsav 2025</h2>
              <p className="text-white/70 text-lg mb-8 max-w-md mx-auto md:mx-0">Join us for the most spectacular celebration of the year. Let's make it memorable together.</p>
              <Link href="/donations" className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-secondary font-bold rounded-full hover:bg-accent/90 transition-all">
                Contribute Now <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            
            <div className="flex-1 w-full z-10">
              <CountdownTimer targetDate="2025-09-01T00:00:00" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* SLIDE 3: Stats Section */}
      <section className="py-16 bg-muted/30 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
            {[
              { label: 'Active Residents', value: stats?.totalResidents ?? 500, icon: Users, color: 'text-blue-500', prefix: '', suffix: '+' },
              { label: 'Events Hosted', value: stats?.totalEvents ?? 120, icon: Calendar, color: 'text-primary', prefix: '', suffix: '+' },
              { label: 'Donations Raised', value: stats?.totalDonations ?? 1550000, icon: Heart, color: 'text-red-500', prefix: '₹', suffix: 'L' },
              { label: 'Volunteers', value: stats?.totalVolunteers ?? 85, icon: Users, color: 'text-accent', prefix: '', suffix: '+' },
            ].map((stat, i) => (
              <motion.div 
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-card border border-border rounded-2xl p-6 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow"
              >
                <div className={`w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4 ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <h3 className="text-3xl font-bold text-foreground mb-1">
                  <AnimatedCounter value={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
                </h3>
                <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SLIDE 4: About Community */}
      <section className="py-24 relative bg-background overflow-hidden">
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl translate-y-1/2 translate-x-1/2"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold uppercase tracking-widest mb-4">
                ✨ About Us
              </div>
              <h2 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-6">
                Building a Vibrant Community
              </h2>
              <p className="text-foreground/70 text-lg mb-6 leading-relaxed">
                Meditiya Nagar is more than just a society—it's a thriving community of families united by shared values, cultural heritage, and a commitment to collective growth. Together, we create experiences that strengthen bonds and celebrate our diversity.
              </p>
              <ul className="space-y-4">
                {[
                  'Inclusive Community Programs',
                  'Cultural & Festival Celebrations',
                  'Social Welfare Initiatives',
                  'Youth Engagement & Development'
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">✓</div>
                    <span className="text-foreground font-medium">{item}</span>
                  </li>
                ))}
              </ul>
              <Link href="/about" className="inline-flex items-center gap-2 mt-8 px-6 py-3 bg-primary text-white rounded-full font-bold hover:bg-primary/90 transition-all">
                Learn More <ChevronRight className="w-4 h-4" />
              </Link>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-3xl p-8 relative overflow-hidden border border-primary/20"
            >
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/asfalt-light.png')] opacity-10"></div>
              <div className="relative z-10">
                <div className="aspect-video bg-muted rounded-2xl flex items-center justify-center mb-6">
                  <Music className="w-16 h-16 text-primary/30" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-3">Our Vision</h3>
                <p className="text-foreground/70">
                  To foster a thriving, inclusive community where every resident feels connected, valued, and empowered to contribute to collective well-being and cultural preservation.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SLIDE 5: Upcoming Events */}
      <section className="py-24 relative bg-muted/50 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2"></div>
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/20 text-accent text-xs font-bold uppercase tracking-widest mb-4">
              📅 What's Happening
            </div>
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4">
              Upcoming Events
            </h2>
            <p className="text-foreground/70 text-lg max-w-2xl mx-auto">
              Stay engaged with our exciting lineup of community events, celebrations, and activities.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {upcomingEventsList.slice(0, 3).map((event, i) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow group"
              >
                <div className="h-40 bg-gradient-to-br from-primary/20 to-accent/20 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Calendar className="w-16 h-16 text-primary/30 group-hover:scale-110 transition-transform" />
                  </div>
                </div>
                <div className="p-6">
                  <div className="text-sm text-accent font-bold mb-2 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2 line-clamp-2">{event.title}</h3>
                  <p className="text-sm text-foreground/60 line-clamp-2 mb-4">{event.description}</p>
                  <Link href="/events" className="inline-flex items-center gap-2 text-primary font-medium hover:gap-3 transition-all">
                    View Details <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link href="/events" className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-full font-bold hover:bg-primary/90 transition-all">
              See All Events <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* SLIDE 6: Latest Announcements */}
      <section className="py-24 relative bg-background overflow-hidden">
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold uppercase tracking-widest mb-4">
              📢 Latest News
            </div>
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4">
              Announcements & Notices
            </h2>
            <p className="text-foreground/70 text-lg max-w-2xl mx-auto">
              Stay informed with important updates and community announcements.
            </p>
          </motion.div>

          <div className="space-y-4">
            {noticesList.slice(0, 4).map((notice, i) => (
              <motion.div
                key={notice.id}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-card border-2 border-primary/20 rounded-2xl p-6 hover:border-primary/40 hover:shadow-lg transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bell className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-foreground mb-2">{notice.title}</h3>
                    <p className="text-foreground/60 text-sm mb-4 line-clamp-2">{(notice as any).description || ''}</p>
                    <div className="text-xs text-foreground/40 font-medium">
                      {new Date(notice.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link href="/notices" className="inline-flex items-center gap-2 px-8 py-4 bg-primary/10 text-primary rounded-full font-bold border border-primary/30 hover:bg-primary/20 transition-all">
              View All Notices <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* SLIDE 7: Gallery Highlights */}
      <section className="py-24 relative bg-muted/50 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/20 text-accent text-xs font-bold uppercase tracking-widest mb-4">
              🖼️ Gallery
            </div>
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4">
              Capturing Moments
            </h2>
            <p className="text-foreground/70 text-lg max-w-2xl mx-auto">
              Relive the beauty of our community celebrations and memories.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="aspect-square bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl overflow-hidden cursor-pointer group relative"
              >
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10"></div>
                <div className="absolute inset-0 flex items-center justify-center group-hover:bg-black/20 transition-all">
                  <ImageIcon className="w-12 h-12 text-white/50 group-hover:scale-110 transition-transform" />
                </div>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link href="/gallery" className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-full font-bold hover:bg-primary/90 transition-all">
              Explore Gallery <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* SLIDE 8: Donation Campaign */}
      <section className="py-24 relative bg-background overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10 opacity-50"></div>
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2"></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="absolute -top-4 -left-4 w-24 h-24 bg-primary/10 rounded-2xl blur-xl"></div>
              <div className="relative">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/20 text-accent text-xs font-bold uppercase tracking-widest mb-4">
                  ❤️ Make a Difference
                </div>
                <h2 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-6">
                  Support Our Community
                </h2>
                <p className="text-foreground/70 text-lg mb-8 leading-relaxed">
                  Your generous contributions help us organize festivals, social welfare programs, and community development initiatives that strengthen our bonds.
                </p>
                
                <div className="bg-card border border-border rounded-2xl p-6 mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-medium text-foreground">Campaign Progress</span>
                    <span className="text-sm font-bold text-accent">{donationProgress?.percentage || 65}%</span>
                  </div>
                  <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-1000"
                      style={{ width: `${donationProgress?.percentage || 65}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-foreground/60 mt-4">
                    Raised: <span className="font-bold text-accent">₹{donationProgress?.raised || '10'} L</span> of ₹{(donationProgress as any)?.target || '15'} L
                  </p>
                </div>

                <Link href="/donations" className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-white rounded-full font-bold hover:bg-accent/90 transition-all shadow-lg hover:shadow-xl">
                  Contribute Now <Heart className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="bg-card border border-border rounded-3xl p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-accent/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative z-10 space-y-6">
                  {[
                    { icon: Gift, title: 'Annual Festivals', desc: 'Supporting grand celebrations' },
                    { icon: Users, title: 'Social Programs', desc: 'Community welfare initiatives' },
                    { icon: BookOpen, title: 'Education', desc: 'Youth development programs' },
                    { icon: HandshakeIcon, title: 'Emergency Relief', desc: 'Quick response to crises' }
                  ].map((item, i) => (
                    <div key={i} className="flex gap-4 items-start">
                      <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-6 h-6 text-accent" />
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground mb-1">{item.title}</h3>
                        <p className="text-sm text-foreground/60">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SLIDE 9: Services & CTA */}
      <section className="py-24 relative bg-muted/30 overflow-hidden">
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl translate-y-1/2 translate-x-1/2"></div>
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold uppercase tracking-widest mb-4">
              ⚡ Our Services
            </div>
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4">
              Everything You Need
            </h2>
            <p className="text-foreground/70 text-lg max-w-2xl mx-auto">
              Explore the comprehensive services available to Meditiya Nagar residents.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Calendar, label: 'Events Management', href: '/events', desc: 'Upcoming events and registrations' },
              { icon: Bell, label: 'Notices & Updates', href: '/notices', desc: 'Important announcements' },
              { icon: Heart, label: 'Donations', href: '/donations', desc: 'Support community initiatives' },
              { icon: Users, label: 'Volunteers', href: '/volunteers', desc: 'Join our volunteer team' },
              { icon: ShoppingBag, label: 'Marketplace', href: '/marketplace', desc: 'Buy and sell locally' },
              { icon: AlertCircle, label: 'Emergency Services', href: '/emergency', desc: 'Quick access to help' },
            ].map((service, i) => (
              <motion.div
                key={service.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-card border border-border rounded-2xl p-6 hover:shadow-lg hover:border-primary/40 transition-all group"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-all">
                  <service.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">{service.label}</h3>
                <p className="text-sm text-foreground/60 mb-6">{service.desc}</p>
                <Link href={service.href} className="inline-flex items-center gap-2 text-primary font-medium hover:gap-3 transition-all">
                  Explore <ChevronRight className="w-4 h-4" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-16 relative bg-gradient-to-r from-primary/90 to-accent/90 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10"></div>
        <div className="container mx-auto px-4 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-white mb-6">
              Ready to Join the Community?
            </h2>
            <p className="text-white/90 text-lg mb-8 max-w-2xl mx-auto">
              Become part of our vibrant community and experience the warmth of one family united by culture, values, and shared dreams.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/contact" className="px-8 py-4 bg-white text-primary rounded-full font-bold hover:bg-white/90 transition-all">
                Get in Touch
              </Link>
              <Link href="/about" className="px-8 py-4 bg-white/20 backdrop-blur-sm border border-white/30 text-white rounded-full font-bold hover:bg-white/30 transition-all">
                Learn More
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}