import { lazy, Suspense } from 'react';
import { Switch, Route, Router as WouterRouter, Redirect } from 'wouter';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from 'sonner';
import { ThemeProvider } from 'next-themes';

import Shell from '@/components/layout/Shell';
import SEO from '@/components/SEO';
import { AdminAuthProvider, useAdminAuth } from '@/lib/AdminAuthContext';

const Home = lazy(() => import('@/pages/home'));
const Countdown = lazy(() => import('@/pages/countdown'));
const About = lazy(() => import('@/pages/about'));
const Events = lazy(() => import('@/pages/events'));
const EventDetail = lazy(() => import('@/pages/event-detail'));
const Festivals = lazy(() => import('@/pages/festivals'));
const Notices = lazy(() => import('@/pages/notices'));
const Gallery = lazy(() => import('@/pages/gallery'));
const GalleryAlbum = lazy(() => import('@/pages/gallery-album'));
const DonationShowcase = lazy(() => import('@/pages/donation-showcase'));
const Volunteers = lazy(() => import('@/pages/volunteers'));
const Competitions = lazy(() => import('@/pages/competitions'));
const CompetitionDetail = lazy(() => import('@/pages/competition-detail'));
const Services = lazy(() => import('@/pages/services'));
const Emergency = lazy(() => import('@/pages/emergency'));
const Marketplace = lazy(() => import('@/pages/marketplace'));
const LostFound = lazy(() => import('@/pages/lost-found'));
const Live = lazy(() => import('@/pages/live'));
const Contact = lazy(() => import('@/pages/contact'));
const Admin = lazy(() => import('@/pages/admin'));
const AdminResidents = lazy(() => import('@/pages/admin/residents'));
const AdminResidentsList = lazy(() => import('@/pages/admin/residents-list'));
const AdminBuildings = lazy(() => import('@/pages/admin/buildings'));
const AdminEventsCrud = lazy(() => import('@/pages/admin/events-crud'));
const AdminNoticesCrud = lazy(() => import('@/pages/admin/notices-crud'));
const AdminGalleryCrud = lazy(() => import('@/pages/admin/gallery-albums'));
const AdminGalleryAlbumCrud = lazy(() => import('@/pages/admin/gallery-album-crud'));
const AdminFestivalsList = lazy(() => import('@/pages/admin/festivals-list'));
const AdminFestivalCreate = lazy(() => import('@/pages/admin/festival-create'));
const AdminFestivalDetail = lazy(() => import('@/pages/admin/festival-detail'));
const AdminFestivalExpenses = lazy(() => import('@/pages/admin/festival-expenses'));
const AdminFestivalCountdowns = lazy(() => import('@/pages/admin/festival-countdowns'));
const AdminAddDonation = lazy(() => import('@/pages/admin/add-donation'));
const AdminOutsiderDonations = lazy(() => import('@/pages/admin/outsider-donations'));
const AdminTshirtRegistrations = lazy(() => import('@/pages/admin/tshirt-registrations'));
const TshirtCollectionCash = lazy(() => import('@/pages/tshirt-collection-cash'));
const AdminManagement = lazy(() => import('@/pages/admin/admin-management'));
const AdminVolunteersCrud = lazy(() => import('@/pages/admin/volunteers-crud'));
const AdminCompetitions = lazy(() => import('@/pages/admin/competitions'));
const AdminLogin = lazy(() => import('@/pages/admin-login'));
const NotFound = lazy(() => import('@/pages/not-found'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function ProtectedAdmin({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAdminAuth();
  if (isAuthenticated) return <>{children}</>;
  const currentPath = window.location.pathname + window.location.search;
  return <Redirect to={`/admin-login?redirect=${encodeURIComponent(currentPath)}`} />;
}

function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SEO title="Admin | Meditiya Sathi" robots="noindex, nofollow" />
      <Shell>
        <ProtectedAdmin>{children}</ProtectedAdmin>
      </Shell>
    </>
  );
}

function PublicPage({
  children,
  title,
  description,
  path,
  robots,
}: {
  children: React.ReactNode;
  title: string;
  description: string;
  path: string;
  robots?: string;
}) {
  return (
    <>
      <SEO title={title} description={description} path={path} robots={robots} />
      {children}
    </>
  );
}

function AppRoutes() {
  return (
    <AdminAuthProvider>
      <Suspense fallback={<div className="min-h-[100dvh] bg-[var(--page-bg)]" />}>
      <Switch>
        <Route path="/admin-login">
          <SEO title="Admin Login | Meditiya Sathi" robots="noindex, nofollow" />
          <AdminLogin />
        </Route>

        <Route path="/">
          <PublicPage title="Meditiya Sathi | Meditiya Nagar Community Platform" description="Connect with Meditiya Nagar through community events, notices, festivals, donations, volunteers, and local services." path="/"><Shell><Home /></Shell></PublicPage>
        </Route>
        <Route path="/countdown"><PublicPage title="Festival Countdown | Meditiya Sathi" description="See the latest festival countdowns and celebrations for the Meditiya Nagar community." path="/countdown"><Shell><Countdown /></Shell></PublicPage></Route>

        <Route path="/about"><PublicPage title="About Meditiya Sathi | Meditiya Nagar" description="Learn about Meditiya Sathi and its mission to connect the Meditiya Nagar society community." path="/about"><Shell><About /></Shell></PublicPage></Route>
        <Route path="/events"><PublicPage title="Community Events | Meditiya Sathi" description="Discover upcoming celebrations, activities, and community events in Meditiya Nagar." path="/events"><Shell><Events /></Shell></PublicPage></Route>
        <Route path="/events/:id"><Shell><EventDetail /></Shell></Route>
        <Route path="/festivals"><PublicPage title="Festivals | Meditiya Sathi" description="Explore festivals, celebrations, and community participation at Meditiya Nagar." path="/festivals"><Shell><Festivals /></Shell></PublicPage></Route>
        <Route path="/notices"><PublicPage title="Community Notices | Meditiya Sathi" description="Read the latest notices and important updates for the Meditiya Nagar community." path="/notices"><Shell><Notices /></Shell></PublicPage></Route>
        <Route path="/gallery"><PublicPage title="Community Gallery | Meditiya Sathi" description="Browse photos and memories from Meditiya Nagar community events and celebrations." path="/gallery"><Shell><Gallery /></Shell></PublicPage></Route>
        <Route path="/gallery/:slug"><Shell><GalleryAlbum /></Shell></Route>
        <Route path="/donations"><Redirect to="/donation-showcase" /></Route>
        <Route path="/leaderboard"><Redirect to="/donation-showcase" /></Route>
        <Route path="/festival-leaderboard"><Redirect to="/donation-showcase" /></Route>
        <Route path="/donation-showcase"><PublicPage title="Community Donations | Meditiya Sathi" description="See how community donations support Meditiya Nagar initiatives and celebrations." path="/donation-showcase"><Shell><DonationShowcase /></Shell></PublicPage></Route>
        <Route path="/volunteers"><PublicPage title="Community Volunteers | Meditiya Sathi" description="Meet the volunteers helping build a connected and active Meditiya Nagar community." path="/volunteers"><Shell><Volunteers /></Shell></PublicPage></Route>
        <Route path="/competitions"><PublicPage title="Community Competitions | Meditiya Sathi" description="Participate in community competitions and discover creative activities at Meditiya Nagar." path="/competitions"><Shell><Competitions /></Shell></PublicPage></Route>
        <Route path="/competitions/:id"><Shell><CompetitionDetail /></Shell></Route>
        <Route path="/services"><PublicPage title="Community Services | Meditiya Sathi" description="Find useful community services and support available to Meditiya Nagar residents." path="/services"><Shell><Services /></Shell></PublicPage></Route>
        <Route path="/emergency"><PublicPage title="Emergency Contacts | Meditiya Sathi" description="Find important emergency contacts and assistance information for the Meditiya Nagar community." path="/emergency"><Shell><Emergency /></Shell></PublicPage></Route>
        <Route path="/marketplace"><PublicPage title="Community Marketplace | Meditiya Sathi" description="Explore the Meditiya Nagar community marketplace and local listings." path="/marketplace"><Shell><Marketplace /></Shell></PublicPage></Route>
        <Route path="/lost-found"><PublicPage title="Lost and Found | Meditiya Sathi" description="View and share lost and found items within the Meditiya Nagar community." path="/lost-found"><Shell><LostFound /></Shell></PublicPage></Route>
        <Route path="/live"><PublicPage title="Live Community Updates | Meditiya Sathi" description="Follow live updates and current community activity from Meditiya Nagar." path="/live" robots="noindex, follow"><Shell><Live /></Shell></PublicPage></Route>
        <Route path="/contact"><PublicPage title="Contact Meditiya Sathi" description="Get in touch with the Meditiya Sathi community platform and Meditiya Nagar society." path="/contact"><Shell><Contact /></Shell></PublicPage></Route>

        <Route path="/admin">
          <AdminShell><Admin /></AdminShell>
        </Route>
<Route path="/admin/residents">
          <AdminShell><AdminResidents /></AdminShell>
        </Route>
        <Route path="/admin/residents-list">
          <AdminShell><AdminResidentsList /></AdminShell>
        </Route>
        <Route path="/admin/buildings">
          <AdminShell><AdminBuildings /></AdminShell>
        </Route>
        <Route path="/admin/events">
          <AdminShell><AdminEventsCrud /></AdminShell>
        </Route>
        <Route path="/admin/notices">
          <AdminShell><AdminNoticesCrud /></AdminShell>
        </Route>
        <Route path="/admin/gallery/:slug">
          <AdminShell><AdminGalleryAlbumCrud /></AdminShell>
        </Route>
        <Route path="/admin/gallery">
          <AdminShell><AdminGalleryCrud /></AdminShell>
        </Route>
        <Route path="/admin/festivals">
          <AdminShell><AdminFestivalsList /></AdminShell>
        </Route>
        <Route path="/admin/festival-countdowns">
          <AdminShell><AdminFestivalCountdowns /></AdminShell>
        </Route>
        <Route path="/admin/festivals/create">
          <AdminShell><AdminFestivalCreate /></AdminShell>
        </Route>
        <Route path="/admin/festivals/:festivalId/expenses">
          <AdminShell><AdminFestivalExpenses /></AdminShell>
        </Route>
        <Route path="/admin/festivals/:id/edit">
          <AdminShell><AdminFestivalCreate /></AdminShell>
        </Route>
<Route path="/admin/festivals/:id">
          <AdminShell><AdminFestivalDetail /></AdminShell>
        </Route>
        <Route path="/admin/donations/add">
          <AdminShell><AdminAddDonation /></AdminShell>
        </Route>
<Route path="/admin/outsider-donations">
          <AdminShell><AdminOutsiderDonations /></AdminShell>
        </Route>
        <Route path="/admin/tshirt-registrations">
          <AdminShell><AdminTshirtRegistrations /></AdminShell>
        </Route>
        <Route path="/tshirt-distribution/:tshirtId">
          <AdminShell><TshirtCollectionCash /></AdminShell>
        </Route>
        <Route path="/tshirt-distribution">
          <AdminShell><TshirtCollectionCash /></AdminShell>
        </Route>
        <Route path="/admin/tshirt-distribution/:tshirtId">
          <AdminShell><TshirtCollectionCash /></AdminShell>
        </Route>
        <Route path="/admin/tshirt-distribution">
          <AdminShell><TshirtCollectionCash /></AdminShell>
        </Route>
        <Route path="/tshirt-collection-cash/:tshirtId">
          <AdminShell><TshirtCollectionCash /></AdminShell>
        </Route>
        <Route path="/tshirt-collection-cash">
          <AdminShell><TshirtCollectionCash /></AdminShell>
        </Route>
        <Route path="/admin/tshirt-collection/:tshirtId">
          <AdminShell><TshirtCollectionCash /></AdminShell>
        </Route>
        <Route path="/admin/tshirt-collection">
          <AdminShell><TshirtCollectionCash /></AdminShell>
        </Route>
        <Route path="/admin/admin-management">
          <AdminShell><AdminManagement /></AdminShell>
        </Route>
        <Route path="/admin/volunteers">
          <AdminShell><AdminVolunteersCrud /></AdminShell>
        </Route>
        <Route path="/admin/competitions">
          <AdminShell><AdminCompetitions /></AdminShell>
        </Route>

        <Route>
          <Shell><NotFound /></Shell>
        </Route>
      </Switch>
      </Suspense>
      <Toaster position="top-center" richColors />
    </AdminAuthProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" forcedTheme="dark" enableSystem={false}>
          <AppRoutes />
        </ThemeProvider>
      </QueryClientProvider>
    </WouterRouter>
  );
}

export default App;
