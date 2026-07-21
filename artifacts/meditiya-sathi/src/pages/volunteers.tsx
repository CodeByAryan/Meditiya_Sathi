import { useListVolunteers } from '@workspace/api-client-react';
import { motion } from 'framer-motion';
import { Users, Heart, Star, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function Volunteers() {
  const { data: volunteers, isLoading } = useListVolunteers();

  return (
    <div className="w-full min-h-screen bg-muted/10 pb-20">
      <section className="bg-secondary text-secondary-foreground pt-20 pb-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-pattern opacity-10"></div>
        <div className="container mx-auto max-w-5xl relative z-10 flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-accent/20 rounded-full flex items-center justify-center mb-6">
            <Heart className="w-10 h-10 text-accent" />
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-6">Our Volunteers</h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto leading-relaxed mb-8">
            The unsung heroes who make our community thrive. Join the volunteer force and make a difference.
          </p>
          <Button className="bg-accent hover:bg-accent/90 text-secondary font-bold px-8 py-6 rounded-full text-lg shadow-xl hover:-translate-y-1 transition-all">
            Join as Volunteer
          </Button>
        </div>
      </section>

      <div className="container mx-auto max-w-5xl px-4 py-16">
        <div className="flex items-center gap-3 mb-8">
          <Star className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-serif font-bold text-foreground">Active Volunteers</h2>
        </div>

        {isLoading ? (
          <div className="text-center py-10">Loading volunteers...</div>
        ) : volunteers?.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-2xl border border-border">
            <p className="text-lg text-muted-foreground">No volunteers registered yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {volunteers?.map((vol, idx) => (
              <motion.div
                key={vol.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="border-border bg-card hover:border-primary/30 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-lg">
                        {vol.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-foreground">{vol.name}</h3>
                        <p className="text-sm font-medium text-primary mb-1">{vol.role}</p>
                        {vol.flatNumber && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> Flat {vol.flatNumber}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}