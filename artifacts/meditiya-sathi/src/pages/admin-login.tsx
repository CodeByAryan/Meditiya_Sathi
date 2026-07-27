import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Shield, LogIn, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useAdminAuth } from "@/lib/AdminAuthContext";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function AdminLogin() {
  const { login, isAuthenticated, isLoading, error } = useAdminAuth();
  const [, setLocation] = useLocation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/admin");
    }
  }, [isAuthenticated, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const success = await login(username, password);

    if (success) {
      setLocation("/admin");
    }
  };

  return (
    <div className="flex min-h-[100dvh] relative overflow-hidden bg-background">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-secondary via-secondary/95 to-secondary z-0">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-accent/15 rounded-full blur-3xl" />
      </div>

      {/* Login Card */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
{/* Header */}
          <div className="text-center mb-8">
            {/* Back to Home button */}
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.08] backdrop-blur-sm border border-white/[0.15] text-white/80 hover:text-white hover:bg-white/[0.15] transition-all duration-300 text-sm font-medium mb-6 group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              Back to Home
            </Link>

            <img
              src={`${basePath}/logo.png`}
              alt="Meditiya Sathi"
              className="h-16 w-auto mx-auto brightness-0 invert drop-shadow-md mb-4"
            />

            <h1 className="text-4xl font-serif font-bold text-white mb-2">
              Admin Panel
            </h1>

            <p className="text-white/70">
              Sign in to manage the society platform
            </p>
          </div>

          {/* Card */}
          <div className="bg-card rounded-2xl shadow-2xl border border-border overflow-hidden p-8">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="w-8 h-8 text-primary" />
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Username or Mobile Number
                </label>

                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username or mobile number"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                  required
                  autoFocus
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Password
                </label>

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter admin password"
                    className="w-full px-4 py-3 pr-12 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                    required
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-bold text-lg hover:bg-primary/90 transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    Sign In
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="text-center mt-6 text-xs text-white/40">
            Authorized personnel only. Unauthorized access is prohibited.
          </p>
        </motion.div>
      </div>
    </div>
  );
}