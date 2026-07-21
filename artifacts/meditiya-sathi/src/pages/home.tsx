import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { ArrowRight, Calendar, Heart, Users, Bell, Sparkles, Shield } from 'lucide-react';
import { 
  useGetStatsSummary, 
  useGetUpcomingEventsSummary, 
  useListNotices,
  useGetDonationProgress
} from '@workspace/api-client-react';

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

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Background Image & Overlay */}
        <div className="absolute inset-0 z-0 bg-secondary">
          {/* We'll use the generated image when available, for now placeholder gradient */}
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
            <Link href="/admin-login" className="px-6 py-3 border border-primary/40 text-primary rounded-full font-bold text-sm hover:bg-primary/10 transition-all flex items-center gap-2">
              <Shield className="w-4 h-4" /> Admin
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Countdown Section */}
      <section className="py-20 relative bg-background overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="bg-secondary rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-12 border border-secondary/20">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10"></div>
            
            <div className="flex-1 text-center md:text-left z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/20 text-accent text-xs font-bold uppercase tracking-widest mb-4">
                Upcoming Grand Festival
              </div>
              <h2 className="text-4xl md:text-5xl font-serif font-bold text-white mb-4">Ganesh Utsav 2025</h2>
              <p className="text-white/70 text-lg mb-8 max-w-md mx-auto md:mx-0">Join us for the most spectacular celebration of the year. Let's make it memorable together.</p>
              <Link href="/donations" className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-secondary font-bold rounded-full hover:bg-accent/90 transition-all">
                Contribute Now <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            
            <div className="flex-1 w-full z-10">
              {/* Sep 1 2025 */}
              <CountdownTimer targetDate="2025-09-01T00:00:00" />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
            {[
              { label: 'Active Residents', value: stats?.totalResidents || '500+', icon: Users, color: 'text-blue-500' },
              { label: 'Events Hosted', value: stats?.totalEvents || '120+', icon: Calendar, color: 'text-primary' },
              { label: 'Donations Raised', value: `₹${stats?.totalDonations ? (stats.totalDonations/100000).toFixed(1) : '15.5'}L`, icon: Heart, color: 'text-red-500' },
              { label: 'Volunteers', value: stats?.totalVolunteers || '85+', icon: Users, color: 'text-accent' },
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
                <h3 className="text-3xl font-bold text-foreground mb-1">{stat.value}</h3>
                <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Rest of the homepage to be implemented */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-serif font-bold text-foreground mb-4">Discover More</h2>
          <p className="text-muted-foreground text-lg mb-12">More homepage sections coming soon...</p>
        </div>
      </section>
    </div>
  );
}