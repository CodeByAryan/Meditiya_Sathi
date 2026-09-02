import { useEffect, useState } from "react";

type Props = { targetAt: string; endAt?: string; className?: string };
type Parts = { days: number; hours: number; minutes: number; seconds: number; state: "UPCOMING" | "LIVE" | "COMPLETED" };

function remaining(targetAt: string, endAt?: string): Parts {
  const target = new Date(targetAt).getTime();
  const end = endAt ? new Date(endAt).getTime() : target;
  const now = Date.now();
  const ms = target - now;
  if (!Number.isFinite(target) || !Number.isFinite(end) || now >= end) return { days: 0, hours: 0, minutes: 0, seconds: 0, state: "COMPLETED" };
  if (ms <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, state: "LIVE" };
  const seconds = Math.floor(ms / 1000);
  return { days: Math.floor(seconds / 86400), hours: Math.floor(seconds % 86400 / 3600), minutes: Math.floor(seconds % 3600 / 60), seconds: seconds % 60, state: "UPCOMING" };
}

export default function FestivalCountdown({ targetAt, endAt, className = "" }: Props) {
  const [parts, setParts] = useState(() => remaining(targetAt, endAt));
  useEffect(() => { setParts(remaining(targetAt, endAt)); const id = window.setInterval(() => setParts(remaining(targetAt, endAt)), 1000); return () => window.clearInterval(id); }, [targetAt, endAt]);
  if (parts.state !== "UPCOMING") return <p className={`font-semibold text-amber-300 ${className}`}>{parts.state === "LIVE" ? "It's Live!" : "Completed"}</p>;
  const units = [[parts.days, "Days"], [parts.hours, "Hours"], [parts.minutes, "Minutes"], [parts.seconds, "Seconds"]];
  return <div className={`grid grid-cols-4 gap-2 ${className}`}>{units.map(([value, label]) => <div key={String(label)} className="min-w-0 text-center"><div className="rounded-lg border-amber-300/20 bg-black/25 px-1 py-2 text-lg font-bold tabular-nums text-white sm:text-2xl">{String(value).padStart(2, "0")}</div><p className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-white/45">{label}</p></div>)}</div>;
}
