import { useListCompetitions } from '@workspace/api-client-react';
import { motion } from 'framer-motion';
import { Trophy, Medal, MapPin, Calendar, Users, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';

export default function Competitions() {
  const { data: competitions, isLoading } = useListCompetitions();

  return (
    <div className="w-full min-h-screen bg-background pb-20">
      <section className="bg-primary/10 pt-16 pb-12 px-4 border-b border-primary/20">
        <div className="container mx-auto max-w-5xl text-center">
          <Trophy className="w-16 h-16 text-primary mx-auto mb-6 drop-shadow-md" />
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4">Competitions</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Showcase your talent, compete with friends, and win exciting prizes in our society competitions.
          </p>
        </div>
      </section>

      <div className="container mx-auto max-w-5xl px-4 py-16">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-64 bg-muted rounded-2xl animate-pulse"></div>
            ))}
          </div>
        ) : competitions?.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-2xl border border-border shadow-sm">
            <h3 className="text-xl font-medium text-foreground">No upcoming competitions</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {competitions?.map((comp, idx) => (
              <motion.div
                key={comp.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className="h-full flex flex-col border-border shadow-md hover:shadow-xl transition-all overflow-hidden bg-card relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                  
                  <CardHeader className="pb-4 relative z-10">
                    <div className="flex justify-between items-start mb-2">
                      <Badge className="bg-primary/10 text-primary border-primary/20 uppercase tracking-widest text-xs font-bold">
                        {comp.category}
                      </Badge>
                      <Badge variant="outline" className={
                        comp.status === 'upcoming' ? 'border-primary text-primary' :
                        comp.status === 'ongoing' ? 'border-accent text-accent-foreground bg-accent/10' :
                        'border-muted-foreground text-muted-foreground'
                      }>
                        {comp.status}
                      </Badge>
                    </div>
                    <CardTitle className="text-2xl font-serif leading-tight">{comp.name}</CardTitle>
                  </CardHeader>
                  
                  <CardContent className="flex-1 pb-2 relative z-10">
                    <p className="text-muted-foreground text-sm line-clamp-3 mb-6">
                      {comp.description}
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm bg-muted/50 p-4 rounded-xl border border-border/50">
                      <div className="flex items-center gap-2 text-foreground/80">
                        <Calendar className="w-4 h-4 text-primary shrink-0" />
                        <span className="truncate">{formatDate(comp.date)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-foreground/80">
                        <MapPin className="w-4 h-4 text-primary shrink-0" />
                        <span className="truncate">{comp.venue || 'TBD'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-foreground/80">
                        <Users className="w-4 h-4 text-primary shrink-0" />
                        <span className="truncate">{comp.ageGroup || 'All Ages'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-foreground/80">
                        <Medal className="w-4 h-4 text-primary shrink-0" />
                        <span className="truncate">{comp.prizes || 'Exciting Prizes'}</span>
                      </div>
                    </div>
                  </CardContent>
                  
                  <CardFooter className="pt-4 border-t border-border mt-auto relative z-10 bg-card">
                    <Button className="w-full font-bold group" variant={comp.status === 'upcoming' ? 'default' : 'outline'} disabled={comp.status !== 'upcoming'}>
                      {comp.status === 'upcoming' ? 'Register Now' : comp.status === 'ongoing' ? 'In Progress' : 'Completed'}
                      {comp.status === 'upcoming' && <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />}
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}