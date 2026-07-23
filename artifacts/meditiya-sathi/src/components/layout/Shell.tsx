import { ReactNode, useState, useEffect } from 'react';

import { Link, useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Home, Calendar, Image as ImageIcon, Bell, Heart, Users, MapPin, AlertCircle, ShoppingBag, Radio, Moon, Sun, ChevronDown, Shield } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { useAdminAuth } from '@/lib/AdminAuthContext';

export default function Shell({ children }: { children: ReactNode }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [location] = useLocation();
  const { isAuthenticated, logout, isSuperAdmin } = useAdminAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Events', href: '/events', icon: Calendar },
    { name: 'Festivals', href: '/festivals', icon: MapPin },
    { name: 'Notices', href: '/notices', icon: Bell },
    { name: 'Gallery', href: '/gallery', icon: ImageIcon },
    { name: 'Donations', href: '/donations', icon: Heart },
    { name: 'Services', href: '/services', icon: AlertCircle },
    { name: 'More', href: '#', isDropdown: true },
  ];

  const moreLinks = [
    { name: 'About', href: '/about' },
    { name: 'Volunteers', href: '/volunteers' },
    { name: 'Competitions', href: '/competitions' },
    { name: 'Marketplace', href: '/marketplace' },
    { name: 'Lost & Found', href: '/lost-found' },
    { name: 'Emergency', href: '/emergency' },
    { name: 'Live Stream', href: '/live' },
    { name: 'Contact', href: '/contact' },
  ];

  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  return (
    <div className="min-h-[100dvh] flex flex-col w-full overflow-x-hidden">
      <header 
        className={cn(
          "fixed top-0 inset-x-0 z-50 transition-all duration-300",
          isScrolled 
            ? "bg-white/80 dark:bg-slate-950/80 backdrop-blur-md shadow-sm border-b border-border" 
            : "bg-transparent"
        )}
      >
        <div className="container mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 z-50 relative">
            <img src={`${basePath}/logo.svg`} alt="Meditiya Sathi" className="h-8 md:h-10 w-auto drop-shadow-sm" />
            <div className="flex flex-col hidden sm:flex">
              <span className="font-serif font-bold text-xl md:text-2xl text-secondary dark:text-white leading-none">Meditiya Sathi</span>
              <span className="text-[10px] font-sans font-bold tracking-widest text-primary leading-none mt-1">ONE SOCIETY • ONE FAMILY</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            {isAuthenticated && (
              <>
                <Link
                  href="/admin"
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors text-primary bg-primary/10 hover:bg-primary/20"
                >
                  <Shield className="w-4 h-4" /> Admin
                </Link>
                {isSuperAdmin && (
                  <Link
                    href="/admin/admin-management"
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors text-amber-600 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/50"
                  >
                    <Shield className="w-4 h-4" /> Manage Admins
                  </Link>
                )}
              </>
            )}
            {navLinks.map((link) => {
              if (link.isDropdown) {
                return (
                  <div key="more" className="relative group">
                    <button className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-foreground/80 hover:text-primary transition-colors rounded-md hover:bg-muted/50">
                      More <ChevronDown className="w-4 h-4" />
                    </button>
                    <div className="absolute top-full right-0 w-48 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 translate-y-2 group-hover:translate-y-0">
                      <div className="bg-popover border border-border shadow-lg rounded-xl overflow-hidden p-2 flex flex-col gap-1">
                        {moreLinks.map(sublink => (
                          <Link 
                            key={sublink.href} 
                            href={sublink.href}
                            className={cn(
                              "px-3 py-2 text-sm rounded-md transition-colors",
                              location === sublink.href ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-foreground/80 hover:text-foreground"
                            )}
                          >
                            {sublink.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              }
              const isActive = location === link.href;
              return (
                <Link 
                  key={link.href} 
                  href={link.href}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive 
                      ? "text-primary bg-primary/10" 
                      : "text-foreground/80 hover:text-primary hover:bg-muted/50"
                  )}
                >
                  {link.icon && <link.icon className="w-4 h-4" />}
                  {link.name}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3 z-50">
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-full text-foreground/70 hover:text-primary hover:bg-muted transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {!isAuthenticated && (
              <Link
                href="/admin-login"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border border-primary/30 text-primary rounded-full hover:bg-primary/10 transition-all"
              >
                <Shield className="w-3.5 h-3.5" /> Admin
              </Link>
            )}

            {isAuthenticated && (
              <button
                onClick={logout}
                className="hidden sm:inline-flex px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
              >
                Logout
              </button>
            )}

            <button 
              className="lg:hidden p-2 text-foreground/80 hover:text-primary transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="fixed inset-x-0 top-16 md:top-20 z-40 bg-background/95 backdrop-blur-xl border-b border-border shadow-2xl lg:hidden overflow-hidden"
          >
            <div className="p-4 max-h-[calc(100vh-80px)] overflow-y-auto flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-2">
                {[...navLinks.filter(l => !l.isDropdown), ...moreLinks].map(link => (
                  <Link 
                    key={link.href} 
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                      location === link.href 
                        ? "bg-primary text-white shadow-md" 
                        : "bg-muted/50 text-foreground hover:bg-muted hover:text-primary"
                    )}
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
              
              {!isAuthenticated && (
                <div className="flex flex-col gap-3 pt-4 border-t border-border mt-2">
                  <Link
                    href="/admin-login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full py-3 text-center rounded-xl font-bold bg-primary text-white hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                  >
                    <Shield className="w-4 h-4" /> Admin Login
                  </Link>
                </div>
              )}

              {isAuthenticated && (
                <div className="flex flex-col gap-3 pt-4 border-t border-border mt-2">
                  {isSuperAdmin && (
                    <Link
                      href="/admin/admin-management"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full py-3 text-center rounded-xl font-bold bg-amber-500 text-white hover:bg-amber-600 transition-all flex items-center justify-center gap-2"
                    >
                      <Shield className="w-4 h-4" /> Admin Management
                    </Link>
                  )}
                  <button
                    onClick={() => { setMobileMenuOpen(false); logout(); }}
                    className="w-full py-3 text-center rounded-xl font-bold bg-destructive/10 text-destructive"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 w-full relative pt-16 md:pt-20">
        {children}
      </main>

      <footer className="bg-secondary text-secondary-foreground pt-16 pb-8 border-t-4 border-primary">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <img src={`${basePath}/logo.svg`} alt="Meditiya Sathi" className="h-10 w-auto brightness-0 invert" />
                <div className="flex flex-col">
                  <span className="font-serif font-bold text-2xl text-white leading-none">Meditiya Sathi</span>
                </div>
              </div>
              <p className="text-secondary-foreground/70 text-sm mt-2 leading-relaxed">
                The official digital platform for Meditiya Nagar society. Bridging gaps, celebrating culture, and building a stronger community together.
              </p>
            </div>
            
            <div>
              <h4 className="font-serif font-bold text-lg text-accent mb-6">Quick Links</h4>
              <ul className="flex flex-col gap-3 text-sm">
                <li><Link href="/about" className="text-secondary-foreground/80 hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="/events" className="text-secondary-foreground/80 hover:text-white transition-colors">Upcoming Events</Link></li>
                <li><Link href="/notices" className="text-secondary-foreground/80 hover:text-white transition-colors">Notice Board</Link></li>
                <li><Link href="/donations" className="text-secondary-foreground/80 hover:text-white transition-colors">Support & Donate</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-serif font-bold text-lg text-accent mb-6">Services</h4>
              <ul className="flex flex-col gap-3 text-sm">
                <li><Link href="/services" className="text-secondary-foreground/80 hover:text-white transition-colors">Service Requests</Link></li>
                <li><Link href="/marketplace" className="text-secondary-foreground/80 hover:text-white transition-colors">Marketplace</Link></li>
                <li><Link href="/lost-found" className="text-secondary-foreground/80 hover:text-white transition-colors">Lost & Found</Link></li>
                <li><Link href="/emergency" className="text-secondary-foreground/80 hover:text-white transition-colors">Emergency Contacts</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-serif font-bold text-lg text-accent mb-6">Contact</h4>
              <ul className="flex flex-col gap-3 text-sm text-secondary-foreground/80">
                <li className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>Meditiya Nagar, Sector 4,<br />Mumbai, Maharashtra 400001</span>
                </li>
                <li className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-primary shrink-0" />
                  <span>contact@meditiyanagar.com</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-secondary-foreground/50">
            <p>© {new Date().getFullYear()} Meditiya Nagar Society. All rights reserved.</p>
            <p>Designed with <Heart className="w-3 h-3 inline text-primary mx-1" /> for the community.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
