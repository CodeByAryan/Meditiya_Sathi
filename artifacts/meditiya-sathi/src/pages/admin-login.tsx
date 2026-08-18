import { useState, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { motion } from "framer-motion";
import {
  Shield,
  LogIn,
  Eye,
  EyeOff,
  ArrowLeft,
  Sparkles,
  LockKeyhole,
} from "lucide-react";
import { useAdminAuth } from "@/lib/AdminAuthContext";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function AdminLogin() {
  const { login, isAuthenticated, isLoading, error } = useAdminAuth();
  const [, setLocation] = useLocation();
  const urlSearch = useSearch();

  const redirectUrl = (() => {
    try {
      const qp = new URLSearchParams(urlSearch || window.location.search);
      const r = qp.get("redirect");
      if (r && r.startsWith("/")) return r;
    } catch {}
    return "/admin";
  })();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      setLocation(redirectUrl);
    }
  }, [isAuthenticated, setLocation, redirectUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const success = await login(username, password);

    if (success) {
      setLocation(redirectUrl);
    }
  };

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[var(--page-bg)] text-foreground">
      {/* =========================================================
          BACKGROUND
      ========================================================== */}

      {/* Grid */}
      <div
        className="absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)
          `,
          backgroundSize: "55px 55px",
        }}
      />

      {/* Ambient glow */}
      <motion.div
        className="absolute left-1/2 top-[20%] h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-amber-500/10 blur-[140px]"
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.25, 0.45, 0.25],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className="absolute -left-40 bottom-0 h-[400px] w-[400px] rounded-full bg-orange-500/10 blur-[120px]"
        animate={{
          x: [0, 30, 0],
          y: [0, -20, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className="absolute -right-40 top-0 h-[450px] w-[450px] rounded-full bg-purple-500/10 blur-[130px]"
        animate={{
          x: [0, -30, 0],
          y: [0, 25, 0],
        }}
        transition={{
          duration: 11,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Floating particles */}
      <div className="pointer-events-none absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <motion.span
            key={i}
            className="absolute h-1 w-1 rounded-full bg-amber-300/40"
            style={{
              left: `${5 + ((i * 17) % 90)}%`,
              top: `${8 + ((i * 23) % 85)}%`,
            }}
            animate={{
              y: [-10, -35, -10],
              opacity: [0.1, 0.7, 0.1],
            }}
            transition={{
              duration: 3 + (i % 4),
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Dark cinematic overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.65)_80%)]" />

      {/* =========================================================
          CONTENT
      ========================================================== */}

      <div className="relative z-10 flex min-h-[100dvh] items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            duration: 0.7,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="w-full max-w-md"
        >
          {/* Back button */}
          <div className="mb-6 text-center">
            <Link
              href="/"
              className="group inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-4 py-2 text-sm text-muted-foreground backdrop-blur-xl transition-all duration-300 hover:border-amber-300/30 hover:bg-amber-50 hover:text-foreground dark:hover:bg-white/[0.06] dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Back to Home
            </Link>
          </div>

          {/* =====================================================
              GLASS LOGIN CARD
          ====================================================== */}

          <div className="relative overflow-hidden rounded-[28px] border border-border bg-card/80 p-1 shadow-[0_30px_100px_rgba(0,0,0,0.12)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.055] dark:shadow-[0_30px_100px_rgba(0,0,0,0.55)]">
            {/* Card glow */}
            <div className="pointer-events-none absolute -top-32 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-amber-400/10 blur-[80px]" />

            <div className="relative rounded-[24px] border border-border bg-[color:var(--page-bg-soft)] px-7 py-8 sm:px-9 sm:py-10 dark:border-white/[0.06] dark:bg-black/30">
              {/* Logo */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="mb-7 flex justify-center"
              >
                <div className="relative">
                  <div className="absolute inset-0 rounded-2xl bg-amber-400/20 blur-xl" />

                  <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-white/80 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.07]">
                    <img
                      src={`${basePath}/logo.png`}
                      alt="Meditiya Sathi"
                      className="h-14 w-auto object-contain drop-shadow-lg"
                    />
                  </div>
                </div>
              </motion.div>

              {/* Heading */}
              <div className="mb-8 text-center">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-300/10 bg-amber-300/[0.06] px-3 py-1.5">
                  <Sparkles className="h-3 w-3 text-amber-300" />

                  <span className="text-[9px] font-semibold uppercase tracking-[0.25em] text-amber-200/70">
                    Secure Access
                  </span>
                </div>

                <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  Admin Panel
                </h1>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Sign in to manage the Meditiya Sathi community platform.
                </p>
              </div>

              {/* Shield */}
              <div className="mb-7 flex justify-center">
                <motion.div
                  animate={{
                    boxShadow: [
                      "0 0 0 rgba(251,191,36,0)",
                      "0 0 35px rgba(251,191,36,0.12)",
                      "0 0 0 rgba(251,191,36,0)",
                    ],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                  }}
                  className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-300/15 bg-amber-300/[0.07]"
                >
                  <Shield className="h-6 w-6 text-amber-300" />
                </motion.div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Username */}
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.15em] text-white/55">
                    Username or Mobile
                  </label>

                  <div className="relative">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter username or mobile number"
                      autoFocus
                      required
                      className="w-full rounded-xl border border-white/10 bg-white/[0.045] px-4 py-3.5 text-sm text-white outline-none placeholder:text-white/25 transition-all focus:border-amber-300/40 focus:bg-white/[0.07] focus:ring-4 focus:ring-amber-300/[0.06]"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.15em] text-white/55">
                    Password
                  </label>

                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      className="w-full rounded-xl border border-white/10 bg-white/[0.045] px-4 py-3.5 pr-12 text-sm text-white outline-none placeholder:text-white/25 transition-all focus:border-amber-300/40 focus:bg-white/[0.07] focus:ring-4 focus:ring-amber-300/[0.06]"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-white/35 transition-colors hover:bg-white/5 hover:text-white"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-red-400/20 bg-red-400/[0.07] px-4 py-3 text-sm text-red-300"
                  >
                    {error}
                  </motion.div>
                )}

                {/* Submit */}
                <motion.button
                  type="submit"
                  disabled={isLoading}
                  whileHover={!isLoading ? { scale: 1.015 } : undefined}
                  whileTap={!isLoading ? { scale: 0.985 } : undefined}
                  className="group relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-amber-300 via-orange-400 to-amber-400 py-3.5 text-sm font-bold text-black shadow-[0_10px_35px_rgba(245,158,11,0.2)] transition-all hover:shadow-[0_10px_45px_rgba(245,158,11,0.32)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="absolute inset-0 -translate-x-full bg-white/20 transition-transform duration-500 group-hover:translate-x-full" />

                  {isLoading ? (
                    <span className="relative h-5 w-5 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                  ) : (
                    <>
                      <LogIn className="relative h-4 w-4" />
                      <span className="relative">Sign In Securely</span>
                    </>
                  )}
                </motion.button>
              </form>

              {/* Security footer */}
              <div className="mt-7 flex items-center justify-center gap-2 text-[10px] text-white/30">
                <LockKeyhole className="h-3 w-3" />
                Secure administrator access
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-[10px] uppercase tracking-[0.2em] text-white/25">
            Authorized personnel only
          </p>
        </motion.div>
      </div>
    </div>
  );
}