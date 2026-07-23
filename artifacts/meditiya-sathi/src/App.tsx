import { Switch, Route, Router as WouterRouter, Redirect } from 'wouter';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from 'sonner';
import { ThemeProvider } from 'next-themes';

import Shell from '@/components/layout/Shell';
import Home from '@/pages/home';
import About from '@/pages/about';
import Events from '@/pages/events';
import Festivals from '@/pages/festivals';
import Notices from '@/pages/notices';
import Gallery from '@/pages/gallery';
import Donations from '@/pages/donations';
import Volunteers from '@/pages/volunteers';
import Competitions from '@/pages/competitions';
import Services from '@/pages/services';
import Emergency from '@/pages/emergency';
import Marketplace from '@/pages/marketplace';
import LostFound from '@/pages/lost-found';
import Live from '@/pages/live';
import Contact from '@/pages/contact';
import Admin from '@/pages/admin';
import AdminResidents from '@/pages/admin/residents';
import AdminResidentsList from '@/pages/admin/residents-list';
import AdminBuildings from '@/pages/admin/buildings';
import AdminEventsCrud from '@/pages/admin/events-crud';
import AdminNoticesCrud from '@/pages/admin/notices-crud';
import AdminGalleryCrud from '@/pages/admin/gallery-crud';
import AdminFestivalsList from '@/pages/admin/festivals-list';
import AdminFestivalCreate from '@/pages/admin/festival-create';
import AdminFestivalDetail from '@/pages/admin/festival-detail';
import AdminManagement from '@/pages/admin/admin-management';
import AdminLogin from '@/pages/admin-login';
import NotFound from '@/pages/not-found';
import { AdminAuthProvider, useAdminAuth } from '@/lib/AdminAuthContext';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function ProtectedAdmin({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAdminAuth();
  if (isAuthenticated) return <>{children}</>;
  return <Redirect to="/admin-login" />;
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
      <Switch>
        <Route path="/admin-login" component={AdminLogin} />
        
        <Route path="/">
          <Shell><Home /></Shell>
        </Route>
        
        <Route path="/about"><Shell><About /></Shell></Route>
        <Route path="/events"><Shell><Events /></Shell></Route>
        <Route path="/festivals"><Shell><Festivals /></Shell></Route>
        <Route path="/notices"><Shell><Notices /></Shell></Route>
        <Route path="/gallery"><Shell><Gallery /></Shell></Route>
        <Route path="/donations"><Shell><Donations /></Shell></Route>
        <Route path="/volunteers"><Shell><Volunteers /></Shell></Route>
        <Route path="/competitions"><Shell><Competitions /></Shell></Route>
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
        <Route path="/admin/admin-management">
          <AdminShell><AdminManagement /></AdminShell>
        </Route>

        <Route>
          <Shell><NotFound /></Shell>
        </Route>
      </Switch>
      <Toaster position="top-center" richColors />
    </AdminAuthProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <AppRoutes />
        </ThemeProvider>
      </QueryClientProvider>
    </WouterRouter>
  );
}

export default App;
