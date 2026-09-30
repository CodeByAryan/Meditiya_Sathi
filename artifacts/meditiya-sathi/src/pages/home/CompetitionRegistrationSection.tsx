import { useQuery } from "@tanstack/react-query";
import { Mail, Phone, Trophy, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getApiUrl } from "@/lib/utils";

type CompetitionRuleSection = { key: string; title: string; eventId: number | null; content: string; displayOrder: number; enabled: boolean };
type CompetitionContent = {
  title: string;
  introduction: string;
  generalRules: string;
  ruleSections: CompetitionRuleSection[];
  googleFormUrl: string | null;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
};

function RuleBlock({ title, content }: { title: string; content: string }) {
  return <article className="mt-6 rounded-2xl border-white/[0.08] bg-white/[0.03] p-5 sm:p-6"><h4 className="font-serif text-lg font-bold uppercase tracking-wide text-amber-200">{title}</h4><div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-white/75">{content}</div></article>;
}

export default function CompetitionRegistrationSection() {
  const contentQuery = useQuery<CompetitionContent>({
    queryKey: ["navratri-competition-content"],
    queryFn: async () => {
      const response = await fetch(`${getApiUrl()}/api/navratri-competition`);
      if (!response.ok) throw new Error("Unable to load competition information");
      return response.json();
    },
  });
  const content = contentQuery.data;

  return (
    <section id="homepage-competitions" className="relative overflow-hidden bg-[var(--page-bg)] py-16 sm:py-20 md:py-24">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-amber-400/[0.05] via-transparent to-transparent" />
      <div className="container relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border-amber-300/25 bg-amber-300/[0.08] text-amber-300 shadow-lg shadow-amber-950/20"><Trophy className="h-6 w-6" /></div>
          <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.3em] text-amber-300/80">Competitions</p>
          <h2 className="mt-3 font-serif text-3xl font-bold uppercase text-white sm:text-4xl md:text-5xl">{content?.title || "Navratri 2026 Competition"}</h2>
          <p className="mt-4 text-sm leading-7 text-white/65 sm:text-base">{content?.introduction || "Discover the official Navratri 2026 competition details, rules and registration information."}</p>
        </div>

        <Card className="mx-auto mt-8 max-w-3xl overflow-hidden border-white/10 bg-black/35 shadow-2xl shadow-amber-950/10 backdrop-blur-2xl">
          <CardContent className="p-5 sm:p-8">
            {contentQuery.isLoading ? <p className="py-8 text-center text-sm text-white/55">Loading competition information...</p> : contentQuery.isError ? <p role="alert" className="py-8 text-center text-sm text-red-200">Unable to load competition information.</p> : (
              <>
                <div>
                  <h3 className="font-serif text-xl font-bold uppercase tracking-wide text-amber-200 sm:text-2xl">Rules &amp; Regulations</h3>
                  {content?.generalRules?.trim() ? <RuleBlock title="General Rules" content={content.generalRules} /> : null}
                  {content?.ruleSections?.filter((section) => section.enabled && section.content.trim()).sort((a, b) => a.displayOrder - b.displayOrder).map((section) => <RuleBlock key={section.key} title={section.title} content={section.content} />)}
                  {!content?.generalRules?.trim() && !content?.ruleSections?.some((section) => section.enabled && section.content.trim()) ? <p className="mt-4 text-sm text-white/55">Rules &amp; regulations will be announced soon.</p> : null}
                </div>
                <div className="mt-8 border-t border-white/[0.08] pt-7">
                  <h3 className="font-serif text-xl font-bold uppercase tracking-wide text-amber-200 sm:text-2xl">Contact</h3>
                  <div className="mt-4 grid gap-3 text-sm text-white/75 sm:grid-cols-2">
                    <p className="flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-300" />{content?.contactName}</p>
                    <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-amber-300" />{content?.contactPhone}</p>
                    <p className="flex items-center gap-2 sm:col-span-2"><Mail className="h-4 w-4 text-amber-300" />{content?.contactEmail}</p>
                  </div>
                </div>
                <div className="mt-8">
                  {content?.googleFormUrl ? <a href={content.googleFormUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#E5C158] to-[#D4AF37] px-5 text-center text-sm font-bold text-black shadow-lg shadow-amber-950/20 transition hover:brightness-110 sm:text-base"><ExternalLink className="h-5 w-5" /> Open Registration Form</a> : <p className="rounded-xl border-amber-300/20 bg-amber-300/[0.07] px-4 py-4 text-center text-sm text-amber-100">Registration form will be available soon.</p>}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
