import { useState } from 'react';
import { useListEvents } from '@workspace/api-client-react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Clock, Users, ArrowRight, Filter } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function Events() {
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');
  const { data: events, isLoading } = useListEvents({ status: statusFilter as any });

  return (
    <div className="w-full min-h-screen bg-muted/10 pb-20">
      {/* Header */}
      <section className="pt-12 pb-8 px-4 bg-white dark:bg-slate-950 border-b border-border shadow-sm">
        <div className="container mx-auto max-w-6xl text-center">
          <h1 className="text-4xl font-serif font-bold text-secondary dark:text-white mb-4">Society Events</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Stay updated with the latest happenings, celebrations, and gatherings in Meditiya Nagar.
          </p>
        </div>
      </section>

      <div className="container mx-auto max-w-6xl px-4 py-12">
        <Tabs defaultValue="upcoming" className="w-full" onValueChange={(val) => setStatusFilter(val as any)}>
          <div className="flex justify-center mb-10">
            <TabsList className="bg-muted/50 p-1 rounded-full border border-border shadow-sm">
              <TabsTrigger value="upcoming" className="rounded-full px-8 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">Upcoming Events</TabsTrigger>
              <TabsTrigger value="past" className="rounded-full px-8 py-2.5 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground transition-all">Past Events</TabsTrigger>
              <TabsTrigger value="all" className="rounded-full px-8 py-2.5 data-[state=active]:bg-background data-[state=active]:text-foreground transition-all">All Events</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value={statusFilter} className="mt-0 outline-none">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i} className="overflow-hidden border-border">
                    <Skeleton className="h-48 w-full" />
                    <CardContent className="p-6">
                      <Skeleton className="h-6 w-3/4 mb-4" />
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-5/6" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : events?.length === 0 ? (
              <div className="text-center py-20 bg-card border border-border rounded-3xl shadow-sm">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                  <Calendar className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-2xl font-serif font-bold text-foreground mb-2">No Events Found</h3>
                <p className="text-muted-foreground">There are currently no {statusFilter !== 'all' ? statusFilter : ''} events scheduled.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events?.map((event, idx) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card className="h-full flex flex-col border-border hover:shadow-xl hover:border-primary/30 transition-all duration-300 overflow-hidden group bg-card">
                      <div className="relative h-48 overflow-hidden bg-muted">
                        {event.imageUrl ? (
                          <img 
                            src={event.imageUrl} 
                            alt={event.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-secondary/10">
                            <Calendar className="w-12 h-12 text-secondary/40" />
                          </div>
                        )}
                        <div className="absolute top-4 left-4">
                          <Badge className={
                            event.status === 'upcoming' ? 'bg-primary text-primary-foreground' : 
                            event.status === 'ongoing' ? 'bg-accent text-accent-foreground' : 
                            'bg-secondary text-secondary-foreground'
                          }>
                            {event.status.toUpperCase()}
                          </Badge>
                        </div>
                        {event.category && (
                          <div className="absolute top-4 right-4">
                            <Badge variant="outline" className="bg-background/80 backdrop-blur-sm">
                              {event.category}
                            </Badge>
                          </div>
                        )}
                      </div>
                      
                      <CardContent className="flex-1 p-6">
                        <h3 className="text-xl font-bold font-serif text-foreground mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                          {event.title}
                        </h3>
                        
                        <div className="space-y-2 mb-4">
                          <div className="flex items-start gap-2 text-sm text-muted-foreground">
                            <Clock className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                            <span>
                              {formatDate(event.date)}
                              {event.endDate && ` - ${formatDate(event.endDate)}`}
                            </span>
                          </div>
                          <div className="flex items-start gap-2 text-sm text-muted-foreground">
                            <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                            <span className="line-clamp-1">{event.location}</span>
                          </div>
                          {event.maxParticipants && (
                            <div className="flex items-start gap-2 text-sm text-muted-foreground">
                              <Users className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                              <span>{event.registrationCount || 0} / {event.maxParticipants} Registered</span>
                            </div>
                          )}
                        </div>
                        
                        <p className="text-muted-foreground text-sm line-clamp-3">
                          {event.description}
                        </p>
                      </CardContent>
                      
                      <CardFooter className="p-6 pt-0 border-t border-border mt-auto">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button className="w-full group" variant={event.status === 'upcoming' ? 'default' : 'outline'}>
                              {event.status === 'upcoming' ? 'Register Now' : 'View Details'}
                              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[500px]">
                            <DialogHeader>
                              <DialogTitle className="text-2xl font-serif">{event.title}</DialogTitle>
                              <DialogDescription>
                                {formatDate(event.date)} at {event.location}
                              </DialogDescription>
                            </DialogHeader>
                            {event.imageUrl && (
                              <img src={event.imageUrl} alt={event.title} className="w-full h-48 object-cover rounded-md my-4" />
                            )}
                            <div className="py-4">
                              <p className="text-foreground/90">{event.description}</p>
                            </div>
                            {event.status === 'upcoming' && (
                              <div className="flex justify-end gap-3 mt-4">
                                <Button className="w-full bg-primary hover:bg-primary/90 text-white font-bold">
                                  Confirm Registration
                                </Button>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </CardFooter>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}