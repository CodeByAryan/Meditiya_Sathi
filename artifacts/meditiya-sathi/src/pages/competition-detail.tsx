import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { Trophy, Upload, Vote, AlertCircle, ArrowLeft, CheckCircle2, Medal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const api = () => import.meta.env.VITE_API_URL || "";

type Competition = {
  id: number;
  name: string;
  category: string;
  description: string;
  rules?: string | null;
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

type ResultItem = {
  entryId: number;
  title: string;
  description?: string;
  participantName: string;
  buildingName: string;
  wingName?: string | null;
  position: number;
  votes: number;
  images: { imageUrl: string }[];
};

export default function CompetitionDetail() {
  const [, params] = useRoute("/competitions/:id");
  const [, setLocation] = useLocation();
  const client = useQueryClient();

  const [form, setForm] = useState<Record<string, string>>({
    fullName: "",
    mobile: "",
    buildingId: "",
    wingId: "",
    flatNo: "",
    title: "",
    description: "",
  });

  const [files, setFiles] = useState<File[]>([]);

  const [votingEntryId, setVotingEntryId] = useState<number | null>(null);
  const [submittingEntry, setSubmittingEntry] = useState(false);
  const [castingVote, setCastingVote] = useState(false);

  const buildingsQuery = useQuery<{ id: number; buildingName: string; hasWings: boolean }[]>({
    queryKey: ["public-buildings"],
    queryFn: async () => {
      const response = await fetch(`${api()}/api/buildings`);
      if (!response.ok) return [];
      return response.json();
    },
  });

  const wingsQuery = useQuery<{ id: number; buildingId: number; wingName: string }[]>({
    queryKey: ["public-wings", form.buildingId],
    enabled: !!form.buildingId,
    queryFn: async () => {
      const response = await fetch(`${api()}/api/buildings/${form.buildingId}/wings`);
      if (!response.ok) return [];
      return response.json();
    },
  });

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

  const isPublished =
    competition &&
    (competition.status.toLowerCase() === "completed" || competition.resultsPublished === 1);

  const results = useQuery<ResultItem[]>({
    queryKey: ["competition-results", params?.id],
    enabled: !!competition && !!isPublished,
    queryFn: async () => {
      const response = await fetch(
        `${api()}/api/competitions/${params!.id}/results`,
      );

      if (!response.ok) {
        return [];
      }

      return response.json();
    },
  });

  if (isLoading) {
    return (
      <main className="container mx-auto px-4 py-28 text-center text-muted-foreground">
        Loading competition details...
      </main>
    );
  }

  if (isError || !competition) {
    return (
      <main className="container mx-auto px-4 py-28 text-center">
        <AlertCircle className="mx-auto mb-3 h-10 w-10 text-destructive" />
        <p className="text-lg font-semibold">Competition not found.</p>
        <button
          onClick={() => setLocation("/competitions")}
          className="mt-4 text-sm font-semibold text-primary hover:underline"
        >
          ← Back to all competitions
        </button>
      </main>
    );
  }

  const isRegOpen = competition.registrationOpen || competition.status.toLowerCase() === "registration_open";
  const isVoteOpen = competition.votingOpen || competition.status.toLowerCase() === "voting_open";

  const submitEntry = async () => {
    if (!form.fullName || form.fullName.trim().length < 2) {
      toast.error("Please enter your Full Name.");
      return;
    }

    if (!form.mobile || form.mobile.trim().length < 7) {
      toast.error("Please enter a valid Mobile Number.");
      return;
    }

    if (!form.buildingId) {
      toast.error("Please select your Building.");
      return;
    }

    if (!form.flatNo || !form.flatNo.trim()) {
      toast.error("Please enter your Flat Number.");
      return;
    }

    if (!form.title || form.title.trim().length < 2) {
      toast.error("Please enter an Entry Title.");
      return;
    }

    if (!form.description || form.description.trim().length < 10) {
      toast.error("Please enter a description (at least 10 characters).");
      return;
    }

    if (!files.length) {
      toast.error("Please select at least one photo for your entry.");
      return;
    }

    setSubmittingEntry(true);
    try {
      const formData = new FormData();

      Object.entries(form).forEach(([key, value]) => {
        if (value) formData.append(key, value);
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

      if (response.ok) {
        toast.success(
          data.message ||
            "Your entry has been submitted successfully. Our Admin team will verify your details and approve your entry before it becomes visible publicly.",
        );
        setFiles([]);
        setForm({
          fullName: "",
          mobile: "",
          buildingId: "",
          wingId: "",
          flatNo: "",
          title: "",
          description: "",
        });
        client.invalidateQueries({
          queryKey: ["competition-entries", String(competition.id)],
        });
      } else {
        toast.error(data.error || "Unable to submit entry.");
      }
    } catch {
      toast.error("Unable to submit your competition entry.");
    } finally {
      setSubmittingEntry(false);
    }
  };

  const confirmVote = async () => {
    if (!votingEntryId) return;

    setCastingVote(true);
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
            entryId: votingEntryId,
          }),
        },
      );

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        toast.success(data.message || "Your vote has been recorded successfully.");
        setVotingEntryId(null);
        client.invalidateQueries({
          queryKey: ["competition-entries", String(competition.id)],
        });
      } else {
        toast.error(data.error || "Unable to record vote.");
      }
    } catch {
      toast.error("Unable to record your vote.");
    } finally {
      setCastingVote(false);
    }
  };

  return (
    <main className="container mx-auto max-w-6xl px-4 py-24">
      <button
        onClick={() => setLocation("/competitions")}
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        All competitions
      </button>

      {/* Header Banner */}
      <Card className="border-primary/20 bg-card shadow-lg">
        <CardContent className="p-8 text-center">
          <Trophy className="mx-auto mb-3 h-12 w-12 text-primary" />

          <p className="text-xs font-bold uppercase tracking-wider text-primary">
            {competition.category}
          </p>

          <h1 className="mt-2 font-serif text-4xl font-bold">
            {competition.name}
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            {competition.description}
          </p>

          {competition.rules && (
            <div className="mx-auto mt-4 max-w-xl rounded-xl border bg-accent/30 p-3 text-xs text-muted-foreground">
              <strong className="block text-foreground mb-1 font-semibold">Rules:</strong>
              {competition.rules}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
            <span>
              <strong>Date:</strong> {new Date(competition.date).toLocaleDateString()}
            </span>
            <span className="capitalize font-bold text-primary">
              Status: {competition.status.replaceAll("_", " ")}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* PUBLISHED RESULTS SECTION */}
      {isPublished && results.data && results.data.length > 0 && (
        <section className="mt-10 rounded-2xl border bg-card p-6 shadow-md">
          <div className="text-center mb-6">
            <Trophy className="mx-auto h-8 w-8 text-amber-500 mb-2" />
            <h2 className="font-serif text-3xl font-bold">Official Winners & Results</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Congratulations to all our talented participants!
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {results.data.slice(0, 3).map((item) => (
              <div
                key={item.entryId}
                className={`relative overflow-hidden rounded-2xl border p-5 text-center shadow-md flex flex-col justify-between ${
                  item.position === 1
                    ? "border-amber-500/60 bg-amber-500/10 dark:bg-amber-500/15"
                    : item.position === 2
                    ? "border-slate-400/60 bg-slate-400/10 dark:bg-slate-400/15"
                    : "border-amber-700/60 bg-amber-700/10 dark:bg-amber-700/15"
                }`}
              >
                <div>
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-2xl font-bold shadow-inner">
                    {item.position === 1 ? "🏆" : item.position === 2 ? "🥈" : "🥉"}
                  </div>

                  {item.images?.[0]?.imageUrl && (
                    <img
                      src={item.images[0].imageUrl}
                      alt={item.title}
                      className="mx-auto h-40 w-full rounded-xl object-cover mb-3"
                    />
                  )}

                  <h3 className="font-serif text-xl font-bold">{item.title}</h3>
                  <p className="mt-1 text-sm font-semibold text-primary">{item.participantName}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.buildingName}{item.wingName ? ` / ${item.wingName}` : ""}
                  </p>
                </div>

                <div className="mt-4 border-t pt-3">
                  <span className="font-serif text-2xl font-bold text-primary">{item.votes}</span>
                  <span className="block text-[10px] uppercase font-semibold text-muted-foreground">Total Votes</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8 grid gap-8 lg:grid-cols-3">
        {/* PARTICIPATION FORM */}
        {isRegOpen ? (
          <Card className="lg:col-span-1 border-primary/20 shadow-sm">
            <CardContent className="p-6">
              <h2 className="font-serif text-2xl font-bold">Participate Now</h2>

              <p className="mt-1 text-xs text-muted-foreground">
                Fill in your details and submit up to {competition.maxImages} photos of your entry. Your entry will be reviewed by Admin before becoming visible publicly.
              </p>

              <div className="mt-4 space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold">Full Name</label>
                  <input
                    value={form.fullName ?? ""}
                    placeholder="Resident Full Name"
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    className="w-full rounded-lg border bg-background p-2.5 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold">Mobile Number</label>
                  <input
                    value={form.mobile ?? ""}
                    placeholder="Registered Mobile"
                    onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                    className="w-full rounded-lg border bg-background p-2.5 text-sm"
                  />
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Building</label>
                    <select
                      value={form.buildingId ?? ""}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          buildingId: e.target.value,
                          wingId: "",
                        }))
                      }
                      className="w-full rounded-lg border bg-background p-2.5 text-sm"
                    >
                      <option value="">Select Building</option>
                      {(buildingsQuery.data || []).map((b) => (
                        <option key={b.id} value={String(b.id)}>
                          {b.buildingName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {form.buildingId && (wingsQuery.data?.length ?? 0) > 0 && (
                    <div>
                      <label className="mb-1 block text-xs font-semibold">Wing</label>
                      <select
                        value={form.wingId ?? ""}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, wingId: e.target.value }))
                        }
                        className="w-full rounded-lg border bg-background p-2.5 text-sm"
                      >
                        <option value="">Select Wing</option>
                        {(wingsQuery.data || []).map((w) => (
                          <option key={w.id} value={String(w.id)}>
                            {w.wingName}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="mb-1 block text-xs font-semibold">Flat No</label>
                    <input
                      value={form.flatNo ?? ""}
                      placeholder="101"
                      onChange={(e) => setForm({ ...form, flatNo: e.target.value })}
                      className="w-full rounded-lg border bg-background p-2.5 text-sm"
                    />
                  </div>
                </div>

                <div className="border-t pt-3 space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Entry Title</label>
                    <input
                      value={form.title ?? ""}
                      placeholder="e.g. Eco-Friendly Clay Ganpati"
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      className="w-full rounded-lg border bg-background p-2.5 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold">Description</label>
                    <textarea
                      rows={3}
                      value={form.description ?? ""}
                      placeholder="Describe materials used, theme, etc."
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      className="w-full rounded-lg border bg-background p-2.5 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold">Select Photos (Max {competition.maxImages})</label>
                    <input
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(event) =>
                        setFiles(
                          Array.from(event.target.files || []).slice(0, competition.maxImages)
                        )
                      }
                      className="w-full text-xs text-muted-foreground file:mr-2 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary-foreground"
                    />
                  </div>

                  <Button
                    disabled={submittingEntry}
                    onClick={submitEntry}
                    className="w-full font-bold shadow"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {submittingEntry ? "Submitting..." : "Submit Entry"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="lg:col-span-1 border-muted bg-accent/10">
            <CardContent className="p-6 text-center text-muted-foreground">
              <Trophy className="mx-auto mb-2 h-8 w-8 text-muted-foreground/60" />
              <h3 className="font-serif text-lg font-bold text-foreground">Registration Closed</h3>
              <p className="mt-1 text-xs">
                Entry submissions for this competition are currently closed.
              </p>
            </CardContent>
          </Card>
        )}

        {/* PUBLIC ENTRY GALLERY */}
        <div className="lg:col-span-2">
          <h2 className="font-serif text-2xl font-bold mb-4">Approved Entries</h2>

          {entries.isLoading ? (
            <p className="py-12 text-center text-muted-foreground">Loading gallery entries...</p>
          ) : !entries.data || !entries.data.length ? (
            <div className="rounded-2xl border bg-card p-10 text-center text-muted-foreground">
              No entries have been approved for public display yet.
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              {entries.data.map((entry) => (
                <Card key={entry.id} className="overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md transition">
                  <div>
                    {entry.images?.[0]?.imageUrl ? (
                      <img
                        src={entry.images[0].imageUrl}
                        alt={entry.title}
                        className="h-52 w-full object-cover"
                      />
                    ) : (
                      <div className="grid h-52 w-full place-items-center bg-muted text-sm text-muted-foreground">
                        No Photo
                      </div>
                    )}

                    <CardContent className="p-5">
                      <h3 className="font-serif text-xl font-bold">{entry.title}</h3>

                      <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                        {entry.description}
                      </p>

                      <p className="mt-3 text-xs font-semibold text-primary">
                        By {entry.residentName} · {entry.buildingName}
                        {entry.wingName ? ` / Wing ${entry.wingName}` : ""}
                      </p>
                    </CardContent>
                  </div>

                  <div className="p-5 border-t flex items-center justify-between bg-accent/10">
                    <span className="text-sm font-bold">
                      {entry.votes} {entry.votes === 1 ? "Vote" : "Votes"}
                    </span>

                    {isVoteOpen ? (
                      <Button
                        size="sm"
                        onClick={() => setVotingEntryId(entry.id)}
                        className="font-bold shadow"
                      >
                        <Vote className="mr-1.5 h-4 w-4" />
                        Vote
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">
                        Voting closed
                      </span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* VOTE CONFIRMATION MODAL */}
      {votingEntryId !== null && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-sm shadow-2xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 text-primary mb-2">
                <Vote className="h-6 w-6 shrink-0" />
                <h3 className="font-serif text-xl font-bold text-foreground">Confirm Your Vote</h3>
              </div>

              <p className="mt-2 text-sm text-muted-foreground">
                Are you sure you want to vote for this entry?
              </p>

              <div className="mt-3 rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-600 dark:text-amber-400 font-semibold">
                ⚠️ Note: You can vote ONLY ONCE for this entire competition.
              </div>

              <div className="mt-6 flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setVotingEntryId(null)}
                >
                  Cancel
                </Button>

                <Button
                  onClick={confirmVote}
                  disabled={castingVote}
                  className="font-bold shadow"
                >
                  {castingVote ? "Recording..." : "Confirm Vote"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}
