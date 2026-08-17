import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { Trophy, Upload, Vote } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const api = () => import.meta.env.VITE_API_URL || "";

type Competition = {
  id: number;
  name: string;
  category: string;
  description: string;
  status: string;
  date: string;
  registrationStart?: string | null;
  registrationEnd?: string | null;
  votingStart?: string | null;
  votingEnd?: string | null;
  maxImages: number;
  resultsPublished: number;
  registrationOpen: boolean;
  votingOpen: boolean;
};

type Entry = {
  id: number;
  title: string;
  description: string;
  residentName: string;
  buildingName: string;
  wingName?: string | null;
  images: { imageUrl: string }[];
  votes: number;
};

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        options: Record<string, unknown>,
      ) => string;
    };
  }
}

export default function CompetitionDetail() {
  const [, params] = useRoute("/competitions/:id");
  const [, setLocation] = useLocation();
  const client = useQueryClient();

  const [form, setForm] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<File[]>([]);
  const [verified, setVerified] = useState(false);
  const [voting, setVoting] = useState<number | null>(null);
  const cap = useRef<HTMLDivElement>(null);

  const {
    data: competition,
    isLoading,
    isError,
  } = useQuery<Competition>({
    queryKey: ["competition", params?.id],
    enabled: !!params?.id,
    queryFn: async () => {
      const response = await fetch(
        `${api()}/api/competitions/${params!.id}`,
      );

      if (!response.ok) {
        throw new Error("Competition not found");
      }

      return response.json();
    },
  });

  const entries = useQuery<Entry[]>({
    queryKey: ["competition-entries", params?.id],
    enabled: !!competition,
    queryFn: async () => {
      const response = await fetch(
        `${api()}/api/competitions/${params!.id}/entries`,
      );

      if (!response.ok) {
        throw new Error("Unable to load entries");
      }

      return response.json();
    },
  });

  useEffect(() => {
    if (!voting || !cap.current) {
      return;
    }

    const renderTurnstile = () => {
      if (!window.turnstile || !cap.current) {
        return;
      }

      cap.current.innerHTML = "";

      window.turnstile.render(cap.current, {
        sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY,
        theme: "auto",
      });
    };

    if (window.turnstile) {
      renderTurnstile();
      return;
    }

    const script = document.createElement("script");
    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.onload = renderTurnstile;

    document.head.appendChild(script);

    return () => {
      script.onload = null;
    };
  }, [voting]);

  if (isLoading) {
    return (
      <main className="container mx-auto px-4 py-28 text-center">
        Loading competition...
      </main>
    );
  }

  if (isError || !competition) {
    return (
      <main className="container mx-auto px-4 py-28 text-center">
        Competition not found.
      </main>
    );
  }

  const verify = async () => {
    try {
      const response = await fetch(
        `${api()}/api/competitions/${competition.id}/verify-resident`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        },
      );

      const data = await response.json().catch(() => ({}));

      setVerified(response.ok);

      toast[response.ok ? "success" : "error"](
        response.ok
          ? "Resident details verified."
          : data.error || "Resident verification failed.",
      );
    } catch {
      setVerified(false);
      toast.error("Unable to verify resident details.");
    }
  };

  const submit = async () => {
    if (!verified) {
      toast.error("Please verify your resident details first.");
      return;
    }

    if (!files.length) {
      toast.error("Please select at least one image.");
      return;
    }

    try {
      const formData = new FormData();

      Object.entries(form).forEach(([key, value]) => {
        formData.append(key, value);
      });

      files.forEach((file) => {
        formData.append("images", file);
      });

      const response = await fetch(
        `${api()}/api/competitions/${competition.id}/register`,
        {
          method: "POST",
          body: formData,
        },
      );

      const data = await response.json().catch(() => ({}));

      toast[response.ok ? "success" : "error"](
        response.ok
          ? "Your entry has been submitted and is awaiting verification."
          : data.error || "Unable to submit entry.",
      );

      if (response.ok) {
        setVerified(false);
        setFiles([]);
        setForm({});
        client.invalidateQueries({
          queryKey: ["competition-entries", String(competition.id)],
        });
      }
    } catch {
      toast.error("Unable to submit your competition entry.");
    }
  };

  const voteForEntry = async () => {
    if (!voting) {
      return;
    }

    const token = (
      document.querySelector(
        "textarea[name='cf-turnstile-response']",
      ) as HTMLTextAreaElement | null
    )?.value;

    if (!token) {
      toast.error("Please complete the verification before voting.");
      return;
    }

    try {
      const response = await fetch(
        `${api()}/api/competitions/${competition.id}/vote`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            entryId: voting,
            turnstileToken: token,
          }),
        },
      );

      const data = await response.json().catch(() => ({}));

      toast[response.ok ? "success" : "error"](
        response.ok
          ? "Your vote has been recorded successfully."
          : data.error || "Unable to record vote.",
      );

      if (response.ok) {
        setVoting(null);
        client.invalidateQueries({
          queryKey: ["competition-entries", String(competition.id)],
        });
      }
    } catch {
      toast.error("Unable to record your vote.");
    }
  };

  return (
    <main className="container mx-auto max-w-6xl px-4 py-24">
      <button
        onClick={() => setLocation("/competitions")}
        className="mb-5 text-sm text-primary"
      >
        ← All competitions
      </button>

      <Card className="border-primary/20 bg-primary/10">
        <CardContent className="p-8 text-center">
          <Trophy className="mx-auto mb-3 h-10 w-10 text-primary" />

          <p className="text-xs font-bold uppercase tracking-wider text-primary">
            {competition.category}
          </p>

          <h1 className="mt-2 font-serif text-4xl font-bold">
            {competition.name}
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            {competition.description}
          </p>

          <p className="mt-4 text-sm text-muted-foreground">
            Competition date:{" "}
            {new Date(competition.date).toLocaleString()}
          </p>

          <p className="mt-1 text-sm font-semibold text-primary">
            {competition.status.replaceAll("_", " ")}
          </p>
        </CardContent>
      </Card>

      <section className="mt-8 grid gap-6 lg:grid-cols-3">
        {competition.registrationOpen && (
          <Card>
            <CardContent className="p-5">
              <h2 className="font-serif text-xl">Participate Now</h2>

              <p className="mt-2 text-sm text-muted-foreground">
                Verify your active resident details, then submit up to{" "}
                {competition.maxImages} images.
              </p>

              <div className="mt-4 grid gap-2">
                {[
                  "fullName",
                  "mobile",
                  "buildingId",
                  "wingId",
                  "flatNo",
                  "title",
                  "description",
                ].map((key) => (
                  <input
                    key={key}
                    value={form[key] ?? ""}
                    placeholder={key.replace(/([A-Z])/g, " $1")}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        [key]: event.target.value,
                      })
                    }
                    className="rounded-lg border bg-background p-2 text-sm"
                  />
                ))}

                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) =>
                    setFiles(
                      Array.from(event.target.files || []).slice(
                        0,
                        competition.maxImages,
                      ),
                    )
                  }
                />

                <Button onClick={verify}>Verify resident</Button>

                <Button
                  disabled={!verified || !files.length}
                  onClick={submit}
                >
                  <Upload />
                  Submit entry
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-5 sm:grid-cols-2 lg:col-span-2">
          {(entries.data || []).map((entry) => (
            <Card key={entry.id} className="overflow-hidden">
              {entry.images[0]?.imageUrl ? (
                <img
                  src={entry.images[0].imageUrl}
                  alt={entry.title}
                  className="h-48 w-full object-cover"
                />
              ) : (
                <div className="grid h-48 w-full place-items-center bg-muted text-sm text-muted-foreground">
                  No image
                </div>
              )}

              <CardContent className="p-4">
                <h2 className="font-semibold">{entry.title}</h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  {entry.description}
                </p>

                <p className="mt-2 text-xs text-muted-foreground">
                  {entry.residentName} · {entry.buildingName}
                  {entry.wingName ? ` / ${entry.wingName}` : ""}
                </p>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm font-semibold">
                    {entry.votes} votes
                  </span>

                  {competition.votingOpen ? (
                    <Button
                      size="sm"
                      onClick={() => setVoting(entry.id)}
                    >
                      <Vote />
                      Vote
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Voting closed
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {voting !== null && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <Card className="w-full max-w-sm">
            <CardContent className="p-6">
              <h2 className="font-serif text-xl">Confirm your vote</h2>

              <div ref={cap} className="mt-4" />

              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setVoting(null)}
                >
                  Cancel
                </Button>

                <Button onClick={voteForEntry}>
                  Record vote
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}