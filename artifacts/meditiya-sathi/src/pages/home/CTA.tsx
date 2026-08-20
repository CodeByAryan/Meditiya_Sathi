import React from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export default function CTA() {
  return (
    <section className="py-20 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5">
      <div className="container mx-auto px-4 text-center">
        <h3 className="text-3xl md:text-4xl font-serif font-bold mb-4">Be part of the community.</h3>
        <p className="text-foreground/70 max-w-2xl mx-auto mb-8">Stay connected with Meditiya Nagar, participate in celebrations, and never miss what's happening around you.</p>

        <div className="flex items-center justify-center gap-4">
          <Button variant="default" size="lg" asChild>
            <Link href="/festivals" className="inline-flex items-center gap-2">Explore Festivals <ArrowRight className="w-4 h-4" /></Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/events">View Events</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
