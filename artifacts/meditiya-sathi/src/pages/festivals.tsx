import { useListFestivals } from '@workspace/api-client-react';
import { motion } from 'framer-motion';
import { CalendarDays, ArrowRight } from 'lucide-react';
import { Link } from 'wouter';

export default function Festivals() {
  const { data: festivals, isLoading } = useListFestivals();

  // Fallback beautiful gradients for festivals without banners
  const getGradient = (index: number) => {
    const gradients = [
      'from-orange-500 to-red-500',
      'from-blue-500 to-indigo-600',
      'from-emerald-500 to-teal-600',
      'from-pink-500 to-rose-600',
      'from-amber-400 to-orange-500',
      'from-violet-500 to-fuchsia-600',
    ];
    return gradients[index % gradients.length];
  };

  return (
    <div className="w-full min-h-screen bg-background">
      {/* Hero */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-secondary">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--tw-gradient-stops))] from-primary/40 via-secondary to-slate-950 opacity-90"></div>
          <div className="absolute inset-0 bg-pattern opacity-30"></div>
        </div>
        
        <div className="container relative z-10 mx-auto px-4 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-serif font-bold text-white mb-6 tracking-tight drop-shadow-md"
          >
            Festivals of<br className="md:hidden"/> Meditiya
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-white/80 max-w-2xl mx-auto"
          >
            A vibrant tapestry of culture, tradition, and togetherness. Explore our grand celebrations throughout the year.
          </motion.p>
        </div>
      </section>

      {/* Grid */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-6xl">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-80 bg-muted rounded-3xl animate-pulse"></div>
              ))}
            </div>
          ) : festivals?.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">No festivals found.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {festivals?.map((festival, idx) => (
                <motion.div
                  key={festival.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                >
                  {/* For now we just make them beautiful cards, actual detailed view could be a modal or separate page */}
                  <div className="group relative h-80 md:h-96 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 cursor-pointer flex flex-col justify-end p-8 border border-border">
                    {/* Background */}
                    {festival.bannerImageUrl ? (
                      <div className="absolute inset-0 z-0">
                        <img src={festival.bannerImageUrl} alt={festival.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
                      </div>
                    ) : (
                      <div className={`absolute inset-0 z-0 bg-gradient-to-br ${getGradient(idx)} opacity-90`}>
                        <div className="absolute inset-0 bg-pattern mix-blend-overlay opacity-50"></div>
                      </div>
                    )}
                    
                    {/* Content */}
                    <div className="relative z-10 text-white transform group-hover:-translate-y-2 transition-transform duration-300">
                      {festival.isActive && (
                        <div className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-white/30">
                          Current Festival
                        </div>
                      )}
                      <h3 className="text-3xl md:text-4xl font-serif font-bold mb-2 drop-shadow-sm">{festival.name}</h3>
                      <div className="flex items-center gap-2 text-white/80 mb-4 font-medium">
                        <CalendarDays className="w-4 h-4" />
                        {festival.year}
                      </div>
                      <p className="text-white/90 line-clamp-2 mb-6 max-w-md drop-shadow-sm">
                        {festival.description}
                      </p>
                      
                      <div className="flex items-center text-white font-bold group-hover:text-gold transition-colors">
                        Explore Festival <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}