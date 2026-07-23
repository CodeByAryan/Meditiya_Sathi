import { Building2, Users, Calendar, Bell, Image as ImageIcon, Heart, Trophy, Wrench, ShoppingBag, Package, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'wouter';

export default function Admin() {
  const sections = [
    { name: 'Buildings', icon: Building2, count: 0, color: 'text-amber-500' },
    { name: 'Residents', icon: Users, count: 0, color: 'text-blue-500' },
    { name: 'Events', icon: Calendar, count: 0, color: 'text-primary' },
    { name: 'Festivals', icon: MapPin, count: 0, color: 'text-purple-500' },
    { name: 'Notices', icon: Bell, count: 0, color: 'text-orange-500' },
    { name: 'Gallery', icon: ImageIcon, count: 0, color: 'text-pink-500' },
    { name: 'Donations', icon: Heart, count: 0, color: 'text-red-500' },
    { name: 'Volunteers', icon: Users, count: 0, color: 'text-teal-500' },
    { name: 'Competitions', icon: Trophy, count: 0, color: 'text-yellow-500' },
    { name: 'Complaints', icon: Wrench, count: 0, color: 'text-slate-500' },
    { name: 'Marketplace', icon: ShoppingBag, count: 0, color: 'text-indigo-500' },
    { name: 'Lost & Found', icon: Package, count: 0, color: 'text-emerald-500' },
  ];

  return (
    <div className="w-full min-h-screen bg-muted/10 pb-20">
      <div className="bg-secondary text-secondary-foreground py-8 px-4 border-b border-border shadow-sm">
        <div className="container mx-auto max-w-6xl">
          <h1 className="text-3xl font-serif font-bold text-white">Admin Dashboard</h1>
          <p className="text-white/70">Manage society operations and data</p>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {sections.map((section: any) => {
            const href =
              section.name === 'Buildings'
                ? '/admin/buildings'
                : section.name === 'Residents'
                  ? '/admin/residents-list'
                  : section.name === 'Festivals'
                    ? '/admin/festivals'
                    : section.name === 'Events'
                      ? '/admin/events'
                      : section.name === 'Notices'
                        ? '/admin/notices'
                        : section.name === 'Gallery'
                          ? '/admin/gallery'
                          : null;

            const card = (
              <Card
                key={section.name}
                className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer bg-card group"
              >
                <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-full bg-muted flex items-center justify-center group-hover:scale-110 transition-transform ${section.color}`}
                  >
                    <section.icon className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-foreground text-sm">{section.name}</span>
                </CardContent>
              </Card>
            );

            if (!href) return card;

            return (
              <Link key={section.name} href={href} className="block">
                {card}
              </Link>
            );
          })}
        </div>

        <Card className="mt-8 bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="p-4 border border-border rounded-xl text-left hover:bg-muted/50 transition-colors">
              <h4 className="font-bold text-foreground">Post New Notice</h4>
              <p className="text-xs text-muted-foreground mt-1">Broadcast important information to all residents.</p>
            </button>
            <button className="p-4 border border-border rounded-xl text-left hover:bg-muted/50 transition-colors">
              <h4 className="font-bold text-foreground">Create Event</h4>
              <p className="text-xs text-muted-foreground mt-1">Schedule a new society gathering or festival.</p>
            </button>
            <button className="p-4 border border-border rounded-xl text-left hover:bg-muted/50 transition-colors">
              <h4 className="font-bold text-foreground">Review Complaints</h4>
              <p className="text-xs text-muted-foreground mt-1">Check and update status of service requests.</p>
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

