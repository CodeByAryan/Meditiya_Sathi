import { lazy, Suspense } from 'react';
import { Switch, Route, Router as WouterRouter, Redirect } from 'wouter';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from 'sonner';
import { ThemeProvider } from 'next-themes';

import Shell from '@/components/layout/Shell';
import { AdminAuthProvider, useAdminAuth } from '@/lib/AdminAuthContext';

const Home = lazy(() => import('@/pages/home'));
const Countdown = lazy(() => import('@/pages/countdown'));
const About = lazy(() => import('@/pages/about'));
const Events = lazy(() => import('@/pages/events'));
const EventDetail = lazy(() => import('@/pages/event-detail'));
const Festivals = lazy(() => import('@/pages/festivals'));
const Notices = lazy(() => import('@/pages/notices'));
const Gallery = lazy(() => import('@/pages/gallery'));
const Donations = lazy(() => import('@/pages/donations'));
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
const AdminGalleryCrud = lazy(() => import('@/pages/admin/gallery-crud'));
const AdminFestivalsList = lazy(() => import('@/pages/admin/festivals-list'));
const AdminFestivalCreate = lazy(() => import('@/pages/admin/festival-create'));
const AdminFestivalDetail = lazy(() => import('@/pages/admin/festival-detail'));
const AdminAddDonation = lazy(() => import('@/pages/admin/add-donation'));
const AdminOutsiderDonations = lazy(() => import('@/pages/admin/outsider-donations'));
const AdminTshirtRegistrations = lazy(() => import('@/pages/admin/tshirt-registrations'));
const TshirtCollectionCash = lazy(() => import('@/pages/tshirt-collection-cash'));
const AdminManagement = lazy(() => import('@/pages/admin/admin-management'));
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
    <Shell>
      <ProtectedAdmin>{children}</ProtectedAdmin>
    </Shell>
  );
}

function AppRoutes() {
  return (
    <AdminAuthProvider>
      <Suspense fallback={<div className="min-h-[100dvh] bg-[var(--page-bg)]" />}>
      <Switch>
        <Route path="/admin-login" component={AdminLogin} />

        <Route path="/">
          <Shell><Home /></Shell>
        </Route>
        <Route path="/countdown"><Shell><Countdown /></Shell></Route>

        <Route path="/about"><Shell><About /></Shell></Route>
        <Route path="/events"><Shell><Events /></Shell></Route>
        <Route path="/events/:id"><Shell><EventDetail /></Shell></Route>
        <Route path="/festivals"><Shell><Festivals /></Shell></Route>
        <Route path="/notices"><Shell><Notices /></Shell></Route>
        <Route path="/gallery"><Shell><Gallery /></Shell></Route>
        <Route path="/donations"><Shell><Donations /></Shell></Route>
        <Route path="/volunteers"><Shell><Volunteers /></Shell></Route>
        <Route path="/competitions"><Shell><Competitions /></Shell></Route>
        <Route path="/competitions/:id"><Shell><CompetitionDetail /></Shell></Route>
        <Route path="/services"><Shell><Services /></Shell></Route>
        <Route path="/emergency"><Shell><Emergency /></Shell></Route>
        <Route path="/marketplace"><Shell><Marketplace /></Shell></Route>
        <Route path="/lost-found"><Shell><LostFound /></Shell></Route>
        <Route path="/live"><Shell><Live /></Shell></Route>
        <Route path="/contact"><Shell><Contact /></Shell></Route>

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
        <Route path="/admin/gallery">
          <AdminShell><AdminGalleryCrud /></AdminShell>
        </Route>
        <Route path="/admin/festivals">
          <AdminShell><AdminFestivalsList /></AdminShell>
        </Route>
        <Route path="/admin/festivals/create">
          <AdminShell><AdminFestivalCreate /></AdminShell>
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
