import { useListServiceRequests } from '@workspace/api-client-react';
import { motion } from 'framer-motion';
import { Tool, Wrench, Zap, Droplets, ShieldAlert, CheckCircle2, Clock, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function Services() {
  const { data: requests, isLoading } = useListServiceRequests();

  const categories = [
    { id: 'electrician', name: 'Electrician', icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    { id: 'plumber', name: 'Plumber', icon: Droplets, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { id: 'maintenance', name: 'Maintenance', icon: Wrench, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { id: 'security', name: 'Security', icon: ShieldAlert, color: 'text-red-500', bg: 'bg-red-500/10' },
  ];

  return (
    <div className="w-full min-h-screen bg-muted/10 pb-20">
      <section className="bg-secondary text-secondary-foreground pt-20 pb-16 px-4">
        <div className="container mx-auto max-w-5xl text-center">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-4">Community Services</h1>
          <p className="text-white/80 text-lg max-w-2xl mx-auto mb-8">
            Need help with a leaky faucet or a faulty wire? Raise a service request and the society management will assist you.
          </p>
          <Button className="bg-primary hover:bg-primary/90 text-white font-bold px-8 py-6 text-lg rounded-full shadow-xl">
            Raise New Request
          </Button>
        </div>
      </section>

      <div className="container mx-auto max-w-5xl px-4 py-12">
        <h2 className="text-2xl font-bold font-serif mb-6 text-foreground">Service Categories</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {categories.map((cat, idx) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer bg-card">
                <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                  <div className={`w-14 h-14 rounded-full ${cat.bg} ${cat.color} flex items-center justify-center`}>
                    <cat.icon className="w-7 h-7" />
                  </div>
                  <span className="font-bold text-foreground">{cat.name}</span>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold font-serif text-foreground">Recent Requests</h2>
        </div>

        <Card className="border-border bg-card overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading requests...</div>
          ) : requests?.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="font-medium text-foreground">No active service requests.</p>
              <p className="text-sm text-muted-foreground">Everything is running smoothly.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {requests?.map((req) => (
                <div key={req.id} className="p-6 flex flex-col md:flex-row md:items-center gap-4 hover:bg-muted/30 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant="outline" className="capitalize border-border font-medium">
                        {req.category.replace('_', ' ')}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {formatDate(req.createdAt)}
                      </span>
                    </div>
                    <p className="font-medium text-foreground text-lg mb-1">{req.description}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <span className="font-semibold text-foreground/80">{req.requesterName}</span> 
                      {req.flatNumber && `• Flat ${req.flatNumber}`}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <Badge className={
                      req.status === 'resolved' ? 'bg-green-500/10 text-green-600 border-green-200' :
                      req.status === 'in_progress' ? 'bg-blue-500/10 text-blue-600 border-blue-200' :
                      'bg-orange-500/10 text-orange-600 border-orange-200'
                    } variant="outline">
                      {req.status === 'resolved' ? <CheckCircle2 className="w-3 h-3 mr-1" /> :
                       req.status === 'in_progress' ? <Zap className="w-3 h-3 mr-1" /> :
                       <Clock className="w-3 h-3 mr-1" />}
                      {req.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}