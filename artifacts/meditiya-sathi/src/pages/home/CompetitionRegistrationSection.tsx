import { useMemo, useState } from "react";
import { Check, Instagram, Mail, Phone, Trophy, UserRound } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getApiUrl } from "@/lib/utils";

type Competition = {
  id: number;
  name: string;
  category: string;
  status: string;
};

type CompetitionOption = {
  key: "photography" | "reels" | "videography";
  label: string;
  icon: string;
  matcher: RegExp;
};

const options: CompetitionOption[] = [
  { key: "photography", label: "Photography", icon: "📸", matcher: /photo/i },
  { key: "reels", label: "Reels Competition", icon: "🎥", matcher: /reel/i },
  { key: "videography", label: "Videography", icon: "🎬", matcher: /video|cinema|film/i },
];

const normalizePhone = (value: string) => value.replace(/[\s-]/g, "");
const validPhone = (value: string) => /^(?:\+91|91)?[6-9]\d{9}$/.test(normalizePhone(value));
const validInstagram = (value: string) => /^[A-Za-z0-9._]{1,30}$/.test(value.trim().replace(/^@/, ""));
const categoryName = (key: string) => options.find((option) => option.key === key)?.label || key;

export default function CompetitionRegistrationSection() {
  const api = getApiUrl();
  const [selected, setSelected] = useState<string[]>([]);
  const [form, setForm] = useState({ participantName: "", phone: "", email: "", instagramUsername: "" });
  const [submitted, setSubmitted] = useState<{ entryId?: string; participantName: string; events: string[] } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const competitionsQuery = useQuery<Competition[]>({
    queryKey: ["homepage-competitions"],
    queryFn: async () => {
      const response = await fetch(`${api}/api/competitions`);
      if (!response.ok) throw new Error("Unable to load competitions");
      return response.json();
    },
  });

  const openCompetitions = useMemo(() => {
    const competitions = competitionsQuery.data || [];
    return options.reduce<Record<string, Competition | undefined>>((result, option) => {
      result[option.key] = competitions.find((competition) => {
        const text = `${competition.name} ${competition.category}`;
        return option.matcher.test(text) && competition.status.toLowerCase() === "registration_open";
      });
      return result;
    }, {});
  }, [competitionsQuery.data]);

  const toggleCompetition = (key: string) => {
    setSelected((current) => current.includes(key) ? current.filter((value) => value !== key) : [...current, key]);
  };

  const validate = () => {
    if (form.participantName.trim().length < 2) return "Please enter your name.";
    if (!validPhone(form.phone)) return "Please enter a valid Indian mobile number.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return "Please enter a valid email address.";
    if (!validInstagram(form.instagramUsername)) return "Please enter your Instagram username.";
    if (!selected.length) return "Please select at least one competition.";
    if (selected.some((key) => !openCompetitions[key])) return "One or more selected competitions are not currently open.";
    return "";
  };

  const submit = async () => {
    const error = validate();
    if (error) {
      setFormError(error);
      toast.error(error);
      return;
    }
    setFormError("");
    setSubmitting(true);
    try {
      const response = await fetch(`${api}/api/competitions/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantName: form.participantName.trim(),
          phone: normalizePhone(form.phone),
          email: form.email.trim(),
          instagramUsername: form.instagramUsername.trim(),
          competitionIds: selected.map((key) => openCompetitions[key]!.id),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Unable to register. Please try again.");
      setSubmitted({ entryId: result.entryId, participantName: form.participantName.trim(), events: [...selected] });
      toast.success("Registration successful.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to register. Please try again.";
      setFormError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setSubmitted(null);
    setFormError("");
    setSelected([]);
    setForm({ participantName: "", phone: "", email: "", instagramUsername: "" });
  };

  return (
    <section id="homepage-competitions" className="relative overflow-hidden bg-[var(--page-bg)] py-16 sm:py-20 md:py-28">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-amber-400/[0.035] via-transparent to-transparent" />
      <div className="container relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border-amber-300/25 bg-amber-300/[0.08] text-amber-300 shadow-lg shadow-amber-950/20">
            <Trophy className="h-6 w-6" />
          </div>
          <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.3em] text-amber-300/80">Competitions</p>
          <h2 className="mt-3 font-serif text-3xl font-bold text-white sm:text-4xl md:text-5xl">Medtiya Mitra Mandal</h2>
          <p className="mt-2 bg-gradient-to-r from-amber-200 via-orange-300 to-amber-400 bg-clip-text font-serif text-2xl font-bold text-transparent sm:text-3xl">Aagman Sohala 2026</p>
          <p className="mt-4 text-sm leading-7 text-white/55 sm:text-base">Register yourself for the competitions and be a part of our celebration.</p>
        </div>

        <Card className="mx-auto mt-8 max-w-2xl overflow-hidden border-white/10 bg-black/35 shadow-2xl shadow-amber-950/10 backdrop-blur-2xl">
          <CardContent className="p-5 sm:p-8">
            {submitted ? (
              <div className="py-4 text-center sm:py-7">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300"><Check className="h-7 w-7" /></div>
                <h3 className="mt-5 font-serif text-2xl font-bold text-white">🎉 Registration Successful!</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/60">Thank you for registering for Medtiya Mitra Mandal Aagman Sohala 2026.</p>
                <div className="mt-6 rounded-2xl border-amber-300/20 bg-amber-300/[0.07] p-4 text-left text-sm">
                  <p><span className="text-white/50">Name:</span> <strong className="text-white">{submitted.participantName}</strong></p>
                  <p className="mt-2"><span className="text-white/50">Participating In:</span> <strong className="text-white">{submitted.events.map(categoryName).join(", ")}</strong></p>
                  {submitted.entryId && <p className="mt-2"><span className="text-white/50">Entry ID:</span> <strong className="font-mono text-amber-200">{submitted.entryId}</strong></p>}
                </div>
                <Button type="button" variant="outline" className="mt-6 min-h-11" onClick={reset}>Register Another Participant</Button>
              </div>
            ) : (
              <form onSubmit={(event) => { event.preventDefault(); void submit(); }} noValidate>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Participant Information</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-semibold text-white/90 sm:col-span-2">Full Name *<div className="relative mt-2"><UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-300/70" /><input value={form.participantName} onChange={(event) => setForm({ ...form, participantName: event.target.value })} className="min-h-12 w-full rounded-xl border-white/10 bg-white/[0.04] px-4 pl-10 text-white outline-none placeholder:text-white/30 focus:border-amber-300/60 focus:ring-2 focus:ring-amber-300/20" placeholder="Your full name" /></div></label>
                  <label className="text-sm font-semibold text-white/90">WhatsApp / Phone Number *<div className="relative mt-2"><Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-300/70" /><input type="tel" inputMode="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="min-h-12 w-full rounded-xl border-white/10 bg-white/[0.04] px-4 pl-10 text-white outline-none placeholder:text-white/30 focus:border-amber-300/60 focus:ring-2 focus:ring-amber-300/20" placeholder="+91 9876543210" /></div></label>
                  <label className="text-sm font-semibold text-white/90">Email ID *<div className="relative mt-2"><Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-300/70" /><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="min-h-12 w-full rounded-xl border-white/10 bg-white/[0.04] px-4 pl-10 text-white outline-none placeholder:text-white/30 focus:border-amber-300/60 focus:ring-2 focus:ring-amber-300/20" placeholder="you@example.com" /></div></label>
                  <label className="text-sm font-semibold text-white/90 sm:col-span-2">Instagram ID *<div className="relative mt-2"><Instagram className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-300/70" /><input value={form.instagramUsername} onChange={(event) => setForm({ ...form, instagramUsername: event.target.value })} className="min-h-12 w-full rounded-xl border-white/10 bg-white/[0.04] px-4 pl-10 text-white outline-none placeholder:text-white/30 focus:border-amber-300/60 focus:ring-2 focus:ring-amber-300/20" placeholder="@yourusername" /></div></label>
                </div>

                <fieldset className="mt-7 border-t border-white/[0.08] pt-6"><legend className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Participate In *</legend><div className="mt-4 grid gap-3 sm:grid-cols-3">{options.map((option) => { const competition = openCompetitions[option.key]; const isSelected = selected.includes(option.key); return <label key={option.key} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 text-sm font-semibold transition ${isSelected ? "border-amber-300/60 bg-amber-300/10 text-amber-100" : "border-white/10 bg-white/[0.03] text-white/80 hover:border-amber-300/30"} ${!competition ? "cursor-not-allowed opacity-50" : ""}`}><input type="checkbox" disabled={!competition} checked={isSelected} onChange={() => toggleCompetition(option.key)} className="h-5 w-5 accent-amber-400" /><span>{option.icon} {option.label}</span></label>; })}</div>{competitionsQuery.isLoading && <p className="mt-3 text-xs text-white/45">Loading available competitions...</p>}{!competitionsQuery.isLoading && !selected.length && <p className="mt-3 text-xs text-white/45">Select one or more competitions.</p>}</fieldset>
                {formError && <p role="alert" className="mt-5 rounded-xl border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{formError}</p>}
                <Button type="submit" size="lg" disabled={submitting || competitionsQuery.isLoading} className="mt-7 min-h-14 w-full rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#E5C158] to-[#D4AF37] text-base font-bold text-black shadow-[0_4px_25px_rgba(212,175,55,0.25)] hover:brightness-105">{submitting ? "Registering..." : <><Trophy className="h-5 w-5" /> Register Now</>}</Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
