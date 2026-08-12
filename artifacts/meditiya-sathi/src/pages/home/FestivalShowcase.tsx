import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { ArrowRight, CalendarDays } from 'lucide-react';
import { useListFestivals } from '@workspace/api-client-react';

export default function FestivalShowcase() {
  const { data: festivals, isLoading } = useListFestivals();

  const items = festivals || [];

  return (
    <section className="py-16 bg-muted/10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-2xl font-serif font-bold">Festival Showcase</h3>
            <p className="text-foreground/70">Highlights from upcoming and ongoing festivals.</p>
          </div>
          <Link href="/festivals" className="text-primary font-semibold">View all</Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {isLoading ? (
            [1, 2, 3].map(i => <div key={i} className="h-56 bg-muted rounded-2xl animate-pulse" />)
          ) : items.length === 0 ? (
            <div className="col-span-1 md:col-span-3 text-center py-12 text-muted-foreground">No festivals yet — check back soon.</div>
          ) : (
            items.slice(0, 3).map((festival, idx) => (
              <motion.div key={festival.id} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="group relative rounded-2xl overflow-hidden shadow-lg bg-card">
                <div className="h-56 md:h-48 relative">
                  {festival.bannerImageUrl ? (
                    <img src={festival.bannerImageUrl} alt={festival.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br from-amber-300 to-pink-400`} />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>

                <div className="p-4 md:p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <CalendarDays className="w-4 h-4 text-foreground/60" />
                    <span className="text-sm text-foreground/60">{festival.year}</span>
                  </div>
                  <h4 className="text-lg font-bold mb-1">{festival.name}</h4>
                  <p className="text-sm text-foreground/70 line-clamp-2 mb-4">{festival.description}</p>
                  <Link href={`/festivals`} className="inline-flex items-center gap-2 text-primary font-semibold">Explore <ArrowRight className="w-4 h-4" /></Link>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
