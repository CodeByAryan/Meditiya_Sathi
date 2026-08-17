import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

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
  if (competition.status === "registration_open") {
    return "Participate Now";
  }

  if (competition.status === "voting_open") {
    return "Vote Now";
  }

  if (
    competition.status === "voting_closed" ||
    competition.status === "completed"
  ) {
    return "View Results";
  }

  return "Coming Soon";
};

export default function Competitions() {
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

  return (
    <main className="container mx-auto max-w-6xl px-4 py-24">
      <header className="mb-8 text-center">
        <Trophy className="mx-auto mb-3 h-10 w-10 text-primary" />

        <h1 className="font-serif text-4xl font-bold">
          Competitions
        </h1>

        <p className="mt-2 text-muted-foreground">
          Celebrate creativity and community spirit.
        </p>
      </header>

      {isLoading ? (
        <p className="py-16 text-center text-muted-foreground">
          Loading competitions...
        </p>
      ) : isError ? (
        <p className="py-16 text-center text-destructive">
          Unable to load competitions. Please try again.
        </p>
      ) : !data.length ? (
        <p className="rounded-2xl border bg-card p-10 text-center text-muted-foreground">
          No public competitions are currently available.
        </p>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {data.map((competition) => (
            <Card key={competition.id}>
              <CardContent className="p-6">
                <p className="text-xs font-bold uppercase tracking-wider text-primary">
                  {competition.category}
                </p>

                <h2 className="mt-2 font-serif text-2xl font-semibold">
                  {competition.name}
                </h2>

                <p className="mt-2 text-sm text-muted-foreground">
                  {competition.description}
                </p>

                <div className="mt-4 grid gap-1 text-xs text-muted-foreground">
                  <span>
                    Competition:{" "}
                    {new Date(competition.date).toLocaleString()}
                  </span>

                  {competition.registrationStart && (
                    <span>
                      Registration:{" "}
                      {new Date(
                        competition.registrationStart,
                      ).toLocaleDateString()}{" "}
                      –{" "}
                      {competition.registrationEnd
                        ? new Date(
                            competition.registrationEnd,
                          ).toLocaleDateString()
                        : "Open"}
                    </span>
                  )}

                  {competition.votingStart && (
                    <span>
                      Voting:{" "}
                      {new Date(
                        competition.votingStart,
                      ).toLocaleDateString()}{" "}
                      –{" "}
                      {competition.votingEnd
                        ? new Date(
                            competition.votingEnd,
                          ).toLocaleDateString()
                        : "Open"}
                    </span>
                  )}
                </div>

                <Link
                  href={`/competitions/${competition.id}`}
                  className="mt-5 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
                >
                  {label(competition)}
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}