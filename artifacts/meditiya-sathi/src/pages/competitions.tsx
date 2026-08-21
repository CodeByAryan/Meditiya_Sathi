import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Trophy, Calendar, Vote, UserCheck, ArrowRight, Sparkles, Search, Compass, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const api = import.meta.env.VITE_API_URL || "";

type Competition = {
  id: number;
  name: string;
  description: string;
  category: string;
  status: string;
  date: string;
  registrationStart?: string | null;
  registrationEnd?: string | null;
  votingStart?: string | null;
  votingEnd?: string | null;
};

const label = (competition: Competition) => {
  const st = competition.status.toLowerCase();
  if (st === "registration_open") {
    return "Participate Now";
  }
  if (st === "voting_open") {
    return "Vote Now";
  }
  if (st === "voting_closed" || st === "completed") {
    return "View Results";
  }
  return "View Details";
};

const getStatusBadge = (status: string) => {
  const st = status.toLowerCase();
  if (st === "registration_open") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-sm">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Registration Open
      </span>
    );
  }
  if (st === "voting_open") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 border border-purple-500/30 shadow-sm">
        <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />
        Voting Open
      </span>
    );
  }
  if (st === "registration_closed") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 border border-blue-500/30">
        Registration Closed
      </span>
    );
  }
  if (st === "voting_closed") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
        Voting Closed
      </span>
    );
  }
  if (st === "completed") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 border border-amber-500/30">
        Completed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 border border-amber-500/30">
      Coming Soon
    </span>
  );
};

export default function Competitions() {
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data = [],
    isLoading,
    isError,
  } = useQuery<Competition[]>({
    queryKey: ["competitions"],
    queryFn: async () => {
      const response = await fetch(`${api}/api/competitions`);
      if (!response.ok) {
        throw new Error("Unable to load competitions");
      }
      return response.json();
    },
  });

  const filteredCompetitions = data.filter((c) => {
    const matchesFilter =
      filter === "all"
        ? true
        : filter === "registration_open"
        ? c.status.toLowerCase() === "registration_open"
        : filter === "voting_open"
        ? c.status.toLowerCase() === "voting_open"
        : filter === "completed"
        ? c.status.toLowerCase() === "completed" || c.status.toLowerCase() === "voting_closed"
        : true;

    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const scrollToCompetitions = () => {
    document.getElementById("competition-list")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <main className="min-h-screen bg-[var(--page-bg)] text-foreground pb-24">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-28 pb-16 md:pt-36 md:pb-24 border-b border-border/50 bg-pattern">
        <div className="absolute inset-0 pointer-events-none opacity-30 bg-gradient-to-b from-primary/10 via-transparent to-transparent" />

        <div className="container mx-auto max-w-6xl px-4 relative z-10 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary backdrop-blur-md shadow-sm mb-6 animate-fade-in-up">
            <Sparkles className="h-3.5 w-3.5" />
            Community Talent & Celebrations
          </div>

          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground max-w-3xl mx-auto leading-tight">
            🏆 Community <span className="text-gradient">Competitions</span>
          </h1>

          <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Show your creativity. Participate in festive showcases, cast your vote for favorite entries, and celebrate our vibrant community talent.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={scrollToCompetitions}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Compass className="h-4 w-4" />
              Explore Competitions
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* COMPETITION LISTING SECTION */}
      <section id="competition-list" className="container mx-auto max-w-6xl px-4 pt-12">
        {/* Controls: Filter Badges & Search */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {[
              { id: "all", label: "All Competitions" },
              { id: "registration_open", label: "Registration Open" },
              { id: "voting_open", label: "Voting Open" },
              { id: "completed", label: "Results & Past" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`rounded-full px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                  filter === tab.id
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-105"
                    : "border bg-card/80 text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search competitions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border bg-card/80 pl-9 pr-4 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>

        {/* LOADING SKELETONS */}
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2">
            {[1, 2, 3, 4].map((n) => (
              <Card key={n} className="glass-card p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-5 w-28 rounded-full" />
                  <Skeleton className="h-6 w-32 rounded-full" />
                </div>
                <Skeleton className="h-8 w-3/4 rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
                <div className="space-y-2 border-t pt-4">
                  <Skeleton className="h-4 w-1/2 rounded" />
                  <Skeleton className="h-4 w-2/3 rounded" />
                </div>
                <Skeleton className="h-10 w-36 rounded-xl" />
              </Card>
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-12 text-center text-destructive">
            <Trophy className="mx-auto mb-3 h-10 w-10 text-destructive/60" />
            <h3 className="font-serif text-xl font-bold">Unable to load competitions</h3>
            <p className="mt-1 text-xs text-muted-foreground">Please check your network connection and try again.</p>
          </div>
        ) : !filteredCompetitions.length ? (
          <div className="rounded-3xl border glass-card p-16 text-center text-muted-foreground max-w-xl mx-auto my-8">
            <Trophy className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
            <h3 className="font-serif text-2xl font-bold text-foreground">No Competitions Found</h3>
            <p className="mt-2 text-sm">
              {searchQuery || filter !== "all"
                ? "No competitions match your current filter or search criteria."
                : "There are currently no public competitions available. Check back soon for upcoming community events!"}
            </p>
            {(searchQuery || filter !== "all") && (
              <button
                onClick={() => {
                  setFilter("all");
                  setSearchQuery("");
                }}
                className="mt-6 rounded-xl bg-primary/20 px-4 py-2 text-xs font-bold text-primary hover:bg-primary/30"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {filteredCompetitions.map((competition) => (
              <Card
                key={competition.id}
                className="glass-card-glow flex flex-col justify-between overflow-hidden rounded-2xl border border-border/60 p-6 shadow-sm hover-lift transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      {competition.category}
                    </span>
                    {getStatusBadge(competition.status)}
                  </div>

                  <h2 className="mt-3 font-serif text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                    {competition.name}
                  </h2>

                  <p className="mt-2 text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                    {competition.description}
                  </p>

                  {/* Dates & Schedule */}
                  <div className="mt-5 space-y-2 border-t border-border/50 pt-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>
                        <strong className="text-foreground">Event Date:</strong>{" "}
                        {new Date(competition.date).toLocaleDateString(undefined, {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>

                    {competition.registrationStart && (
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span>
                          <strong className="text-foreground">Registration:</strong>{" "}
                          {new Date(competition.registrationStart).toLocaleDateString()} –{" "}
                          {competition.registrationEnd
                            ? new Date(competition.registrationEnd).toLocaleDateString()
                            : "Open"}
                        </span>
                      </div>
                    )}

                    {competition.votingStart && (
                      <div className="flex items-center gap-2">
                        <Vote className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                        <span>
                          <strong className="text-foreground">Voting Period:</strong>{" "}
                          {new Date(competition.votingStart).toLocaleDateString()} –{" "}
                          {competition.votingEnd
                            ? new Date(competition.votingEnd).toLocaleDateString()
                            : "Open"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-border/40 flex items-center justify-between">
                  <Link
                    href={`/competitions/${competition.id}`}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-md shadow-primary/20 transition hover:bg-primary/90 hover:scale-105"
                  >
                    {label(competition)}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
