import { Building2, Users, Calendar, Bell, Image as ImageIcon, Heart, Trophy, Wrench, ShoppingBag, Package, MapPin, Shield, Home, UserCheck, ClipboardList } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'wouter';
import { useAdminAuth } from '@/lib/AdminAuthContext';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Admin() {
  const { isSuperAdmin, isAdmin, isVolunteer, canManageBuildings, canManageResidents, canManageFestivals, canManageEvents, canManageVolunteers, canManageAdmins } = useAdminAuth();

  const sections = [
    // Super Admin specific
    ...(canManageAdmins ? [{ name: 'Admin Management', icon: Shield, count: 0, color: 'text-amber-500', href: '/admin/admin-management' }] : []),

    // Building Setup - Super Admin & Admin
    ...(canManageBuildings ? [{ name: 'Buildings', icon: Building2, count: 0, color: 'text-amber-500', href: '/admin/buildings' }] : []),

    // Resident Management - Super Admin & Admin
    ...(canManageResidents ? [
      { name: 'Residents', icon: Users, count: 0, color: 'text-blue-500', href: '/admin/residents-list' },
      { name: 'Add Resident', icon: UserCheck, count: 0, color: 'text-blue-500', href: '/admin/residents' },
    ] : []),

    // Festival Management - Super Admin & Admin
    ...(canManageFestivals ? [
      { name: 'Festivals', icon: MapPin, count: 0, color: 'text-purple-500', href: '/admin/festivals' },
    ] : []),

    // Volunteer - Festival Collection (assigned festivals)
    ...(isVolunteer ? [
      { name: 'Festival Collection', icon: Heart, count: 0, color: 'text-red-500', href: '/admin/festivals' },
    ] : []),

    // Events - All roles (but Volunteer only sees assigned)
    { name: 'Events', icon: Calendar, count: 0, color: 'text-primary', href: '/admin/events' },

    // Donations - Super Admin & Admin
    ...(canManageFestivals ? [{ name: 'Add Donation', icon: Heart, count: 0, color: 'text-red-500', href: '/admin/donations/add' }] : []),

    // Volunteer specific - Collection Tasks
    ...(isVolunteer ? [{ name: 'Collection Tasks', icon: ClipboardList, count: 0, color: 'text-teal-500', href: '/admin/festivals' }] : []),

    // Common modules for Super Admin & Admin
    ...(!isVolunteer ? [
      { name: 'Gallery', icon: ImageIcon, count: 0, color: 'text-pink-500', href: '/admin/gallery' },
      { name: 'Notices', icon: Bell, count: 0, color: 'text-orange-500', href: '/admin/notices' },
      { name: 'Committee Members', icon: Shield, count: 0, color: 'text-cyan-500', href: '/admin/committee' },
    ] : []),

    // Volunteer Management - Super Admin & Admin
    ...(canManageVolunteers ? [{ name: 'Volunteers', icon: Users, count: 0, color: 'text-teal-500', href: '/admin/admin-management' }] : []),

    // Other Modules - Super Admin & Admin only
    ...(!isVolunteer ? [
      { name: 'Competitions', icon: Trophy, count: 0, color: 'text-yellow-500', href: null },
      { name: 'Complaints', icon: Wrench, count: 0, color: 'text-slate-500', href: null },
      { name: 'Marketplace', icon: ShoppingBag, count: 0, color: 'text-indigo-500', href: null },
      { name: 'Lost & Found', icon: Package, count: 0, color: 'text-emerald-500', href: null },
    ] : []),
  ];

  return (
    <div className="w-full min-h-screen bg-muted/10 pb-20">
      <div className="bg-secondary text-secondary-foreground py-8 px-4 border-b border-border shadow-sm">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-center gap-4 mb-3">
            <img
              src={`${basePath}/logo.png`}
              alt="Meditiya Sathi"
              className="h-12 w-auto brightness-0 invert drop-shadow-md"
            />
            <div>
              <h1 className="text-3xl font-serif font-bold text-white">
                {isSuperAdmin ? 'Super Admin Dashboard' : isAdmin ? 'Admin Dashboard' : 'Volunteer Dashboard'}
              </h1>
              <p className="text-white/70 text-sm">
                <span className="font-semibold text-accent">Meditiya Sathi</span>
                <span className="text-white/30 mx-2">•</span>
                {isSuperAdmin ? 'Full platform control' : isAdmin ? 'Manage society operations' : 'Manage assigned tasks'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {sections.map((section: any) => {
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

            if (!section.href) return card;

            return (
              <Link key={section.name} href={section.href} className="block">
                {card}
              </Link>
            );
          })}
        </div>

        {!isVolunteer && (
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
        )}

        {isVolunteer && (
          <Card className="mt-8 bg-card border-border shadow-sm">
            <CardHeader>
              <CardTitle>Your Tasks</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link href="/admin/festivals" className="block">
                <button className="w-full p-4 border border-border rounded-xl text-left hover:bg-muted/50 transition-colors">
                  <h4 className="font-bold text-foreground">View Assigned Festivals</h4>
                  <p className="text-xs text-muted-foreground mt-1">Manage festival collections for your assigned festivals.</p>
                </button>
              </Link>
              <Link href="/admin/events" className="block">
                <button className="w-full p-4 border border-border rounded-xl text-left hover:bg-muted/50 transition-colors">
                  <h4 className="font-bold text-foreground">View Assigned Events</h4>
                  <p className="text-xs text-muted-foreground mt-1">Manage events assigned to you by the admin.</p>
                </button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
