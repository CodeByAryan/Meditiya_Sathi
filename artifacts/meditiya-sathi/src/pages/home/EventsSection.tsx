import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { Link } from 'wouter';
import { useGetUpcomingEventsSummary } from '@workspace/api-client-react';

export default function EventsSection() {
  const { data: events } = useGetUpcomingEventsSummary();
  const list = events || [];

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-serif font-bold">Upcoming Events</h3>
            <p className="text-foreground/70">Don't miss what's happening around the neighbourhood.</p>
          </div>
          <Link href="/events" className="text-primary font-semibold">See all</Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {list.length === 0 ? (
            <div className="col-span-1 md:col-span-3 text-center py-12 text-muted-foreground">No upcoming events.</div>
          ) : (
            list.slice(0, 3).map((ev: any, idx: number) => (
              <motion.div key={ev.id} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="group rounded-2xl overflow-hidden shadow-lg bg-card hover-lift">
                <div className="p-4 md:p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-lg">{ev.title}</h4>
                    <span className="text-sm text-foreground/60">{new Date(ev.date).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-foreground/70 line-clamp-2 mb-4">{ev.description}</p>
                  <div className="flex items-center gap-3">
                    <Link href="/events" className="text-primary font-semibold inline-flex items-center gap-2">View <ChevronRight className="w-4 h-4" /></Link>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
