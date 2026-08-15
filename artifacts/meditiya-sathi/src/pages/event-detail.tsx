import { Link, useParams } from "wouter";
import { ArrowLeft, CalendarDays, Clock3, MapPin } from "lucide-react";
import { useGetEvent } from "@workspace/api-client-react";
import { eventDateTime, optimizedEventImage, statusLabel } from "@/lib/event-utils";

export default function EventDetail() {
  const { id } = useParams<{ id: string }>(); const eventId = Number(id);
  const { data: event, isLoading, isError } = useGetEvent(eventId, { query: { queryKey: ["event-detail", eventId], enabled: Number.isInteger(eventId) && eventId > 0 } });
  if (isLoading) return <main className="min-h-screen pt-32 text-center text-muted-foreground">Loading event...</main>;
  if (isError || !event) return <main className="min-h-screen pt-32 text-center"><p className="font-semibold">Unable to load this event.</p><Link href="/events" className="mt-4 inline-flex text-primary">Back to Events</Link></main>;
  const { date, time } = eventDateTime(event.date, (event as any).eventTime);
  return <main className="min-h-screen bg-[var(--page-bg)] pb-16 pt-28 sm:pt-32"><article className="mx-auto max-w-4xl px-4 sm:px-6"><Link href="/events" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Back to Events</Link><div className="overflow-hidden rounded-2xl border bg-card shadow-sm">{event.imageUrl && <img src={optimizedEventImage(event.imageUrl, 1440)} alt={event.title} width="1440" height="810" fetchPriority="high" decoding="async" className="aspect-video w-full object-cover" />}<div className="space-y-6 p-6 sm:p-10"><span className="inline-flex rounded-full bg-primary/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">{statusLabel(event.status)}</span><h1 className="font-serif text-4xl font-semibold sm:text-5xl">{event.title}</h1><div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3"><p className="flex gap-2"><CalendarDays className="h-4 w-4 text-primary" />{date}</p><p className="flex gap-2"><Clock3 className="h-4 w-4 text-primary" />{time}</p><p className="flex gap-2"><MapPin className="h-4 w-4 text-primary" />{event.location}</p></div><p className="whitespace-pre-wrap leading-8 text-muted-foreground">{event.description}</p></div></div></article></main>;
}
