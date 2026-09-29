import { useMemo, useState } from "react";
import { Check, Instagram, Mail, Phone, Trophy, UserRound } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getApiUrl } from "@/lib/utils";

type NavratriEvent = { id: number; title: string; category?: string | null };

type RegistrationOptions = {
  festival: { id: number; name: string } | null;
  events: NavratriEvent[];
};

const normalizePhone = (value: string) => value.replace(/[\s-]/g, "");
const validPhone = (value: string) => /^(?:\+91|91)?[6-9]\d{9}$/.test(normalizePhone(value));
const validInstagram = (value: string) => /^[A-Za-z0-9._]{1,30}$/.test(value.trim().replace(/^@/, ""));


export default function CompetitionRegistrationSection() {
  const api = getApiUrl();
  const [selected, setSelected] = useState<number[]>([]);
  const [form, setForm] = useState({ name: "", phone: "", email: "", instagramUsername: "" });
  const [submitted, setSubmitted] = useState<{ registrationId?: number; name: string; events: string[] } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const eventsQuery = useQuery<RegistrationOptions>({
    queryKey: ["navratri-2026-registration-options"],
    queryFn: async () => {
      const response = await fetch(`${api}/api/events/navratri-2026/registration-options`);
      if (!response.ok) throw new Error("Unable to load Navratri events");
      return response.json();
    },
  });
  const events = eventsQuery.data?.events || [];
  const selectedNames = useMemo(() => events.filter((event) => selected.includes(event.id)).map((event) => event.title), [events, selected]);
  const toggleCompetition = (id: number) => setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);

  const validate = () => {
    if (form.name.trim().length < 2) return "Please enter your name.";
    if (!validPhone(form.phone)) return "Please enter a valid Indian mobile number.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return "Please enter a valid email address.";
    if (!validInstagram(form.instagramUsername)) return "Please enter your Instagram username.";
    if (!selected.length) return "Please select at least one event.";
    return "";
  };

  const submit = async () => {
    const validationError = validate();
    if (validationError) { setFormError(validationError); toast.error(validationError); return; }
    setFormError("");
    setSubmitting(true);
    try {
      const response = await fetch(`${api}/api/events/navratri-2026/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.name.trim(), phone: normalizePhone(form.phone), email: form.email.trim(), instagramUsername: form.instagramUsername.trim(), eventIds: selected }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Unable to register. Please try again.");
      setSubmitted({ registrationId: result.registrationId, name: form.name.trim(), events: selectedNames });
      toast.success("Registration successful.");
    } catch (submissionError) { const message = submissionError instanceof Error ? submissionError.message : "Unable to register. Please try again."; setFormError(message); toast.error(message); }
    finally { setSubmitting(false); }
  };

  const reset = () => { setSubmitted(null); setFormError(""); setSelected([]); setForm({ name: "", phone: "", email: "", instagramUsername: "" }); };

  return (
    <section id="homepage-competitions" className="relative overflow-hidden bg-[var(--page-bg)] py-16 sm:py-20 md:py-28">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-amber-400/[0.035] via-transparent to-transparent" />
      <div className="container relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border-amber-300/25 bg-amber-300/[0.08] text-amber-300 shadow-lg shadow-amber-950/20">
            <Trophy className="h-6 w-6" />
          </div>
          <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.3em] text-amber-300/80">Competitions</p>
          <h2 className="mt-3 font-serif text-3xl font-bold text-white sm:text-4xl md:text-5xl">NAVRATRI 2026</h2>
          <p className="mt-2 bg-gradient-to-r from-amber-200 via-orange-300 to-amber-400 bg-clip-text font-serif text-2xl font-bold text-transparent sm:text-3xl">Competition Registration</p>
          <p className="mt-4 text-sm leading-7 text-white/55 sm:text-base">Register for one or more Navratri events.</p>
        </div>

        <Card className="mx-auto mt-8 max-w-2xl overflow-hidden border-white/10 bg-black/35 shadow-2xl shadow-amber-950/10 backdrop-blur-2xl">
          <CardContent className="p-5 sm:p-8">
            {submitted ? (
              <div className="py-4 text-center sm:py-7">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300"><Check className="h-7 w-7" /></div>
                <h3 className="mt-5 font-serif text-2xl font-bold text-white">🎉 Registration Successful!</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/60">Thank you for registering for Navratri 2026.</p>
                <div className="mt-6 rounded-2xl border-amber-300/20 bg-amber-300/[0.07] p-4 text-left text-sm">
                  <p><span className="text-white/50">Selected Events:</span> <strong className="text-white">{submitted.events.join(", ")}</strong></p>
                  {submitted.registrationId && <p className="mt-3"><span className="text-white/50">Registration ID:</span> <strong className="font-mono text-amber-200">{submitted.registrationId}</strong></p>}
                </div>
                <Button type="button" variant="outline" className="mt-6 min-h-11" onClick={reset}>Register Another Participant</Button>
              </div>
            ) : (
              <form onSubmit={(event) => { event.preventDefault(); void submit(); }} noValidate>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Participant Information</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-semibold text-white/90 sm:col-span-2">Name *<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-2 min-h-12 w-full rounded-xl border-white/10 bg-white/[0.04] px-4 text-white outline-none placeholder:text-white/30 focus:border-amber-300/60" placeholder="Your full name" /></label>
                  <label className="text-sm font-semibold text-white/90">Contact / WhatsApp Number *<input type="tel" inputMode="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="mt-2 min-h-12 w-full rounded-xl border-white/10 bg-white/[0.04] px-4 text-white outline-none placeholder:text-white/30 focus:border-amber-300/60" placeholder="+91 9876543210" /></label>
                  <label className="text-sm font-semibold text-white/90">Email ID *<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="mt-2 min-h-12 w-full rounded-xl border-white/10 bg-white/[0.04] px-4 text-white outline-none placeholder:text-white/30 focus:border-amber-300/60" placeholder="you@example.com" /></label>
                  <label className="text-sm font-semibold text-white/90 sm:col-span-2">Instagram Username *<input value={form.instagramUsername} onChange={(event) => setForm({ ...form, instagramUsername: event.target.value })} className="mt-2 min-h-12 w-full rounded-xl border-white/10 bg-white/[0.04] px-4 text-white outline-none placeholder:text-white/30 focus:border-amber-300/60" placeholder="@yourusername" /></label>
                </div>
                <fieldset className="mt-7 border-t border-white/[0.08] pt-6"><legend className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Select Events *</legend>{eventsQuery.isLoading ? <p className="mt-4 text-sm text-white/55">Loading Navratri events...</p> : eventsQuery.isError ? <p role="alert" className="mt-4 text-sm text-red-200">Unable to load Navratri events.</p> : !events.length ? <p className="mt-4 text-sm text-white/55">No Navratri 2026 events are currently available.</p> : <div className="mt-4 grid gap-3 sm:grid-cols-2">{events.map((event) => <label key={event.id} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 text-sm font-semibold transition ${selected.includes(event.id) ? "border-amber-300/60 bg-amber-300/10 text-amber-100" : "border-white/10 bg-white/[0.03] text-white/80 hover:border-amber-300/30"}`}><input type="checkbox" checked={selected.includes(event.id)} onChange={() => toggleCompetition(event.id)} className="h-5 w-5 accent-amber-400" /><span>{event.title}</span></label>)}</div>}</fieldset>
                {formError && <p role="alert" className="mt-5 rounded-xl border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{formError}</p>}
                <Button type="submit" size="lg" disabled={submitting || eventsQuery.isLoading || !events.length} className="mt-7 min-h-14 w-full rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#E5C158] to-[#D4AF37] text-base font-bold text-black">{submitting ? "Registering..." : <><Trophy className="h-5 w-5" /> Register Now</>}</Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
