export type EventStatus = "upcoming" | "ongoing" | "completed" | "cancelled";

export function optimizedEventImage(url: string, width: number) {
  if (!url) return url;
  try {
    const imageUrl = new URL(url);
    if (imageUrl.hostname !== "res.cloudinary.com") return url;
    const marker = "/upload/";
    const index = imageUrl.pathname.indexOf(marker);
    if (index === -1) return url;
    imageUrl.pathname = `${imageUrl.pathname.slice(0, index + marker.length)}f_auto,q_auto,w_${width},c_fill/${imageUrl.pathname.slice(index + marker.length)}`;
    return imageUrl.toString();
  } catch { return url; }
}

export function eventDateTime(date: Date | string, eventTime?: string | null) {
  const formattedDate = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric" }).format(new Date(date));
  if (!eventTime) return { date: formattedDate, time: "Time to be announced" };
  const [hour, minute] = eventTime.split(":").map(Number);
  return { date: formattedDate, time: new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(new Date(2000, 0, 1, hour, minute)) };
}

export function statusLabel(status: EventStatus | string) {
  return status === "completed" ? "Completed" : status.charAt(0).toUpperCase() + status.slice(1);
}
