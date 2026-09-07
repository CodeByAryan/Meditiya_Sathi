import React from "react";
import { ArrowRight, Image as ImageIcon } from "lucide-react";
import { Link } from "wouter";
import { getApiUrl } from "@/lib/utils";

type FeaturedPhoto = { id: number; imageUrl: string; caption?: string | null; albumSlug: string; albumTitle: string };

function PhotoCard({ photo }: { photo: FeaturedPhoto }) {
  const [failed, setFailed] = React.useState(false);
  return <Link href={`/gallery/${encodeURIComponent(photo.albumSlug)}`} className="group relative block aspect-square overflow-hidden rounded-2xl border-white/[0.09] bg-black/[0.24] transition duration-300 hover:-translate-y-1 hover:border-amber-300/25 hover:shadow-[0_15px_45px_rgba(245,158,11,0.08)] dark:bg-white/[0.025]">
    {failed || !photo.imageUrl ? <div className="flex h-full items-center justify-center bg-amber-300/[0.06]"><ImageIcon className="h-10 w-10 text-amber-300/35" /></div> : <img src={photo.imageUrl} alt={photo.caption || photo.albumTitle} loading="lazy" decoding="async" onError={() => setFailed(true)} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />}
    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-4 pt-10 text-sm font-medium text-white">{photo.albumTitle}</span>
  </Link>;
}

export default function GallerySection() {
  const [photos, setPhotos] = React.useState<FeaturedPhoto[]>([]);
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => { let cancelled = false; fetch(`${getApiUrl()}/api/gallery/featured`).then((response) => response.ok ? response.json() : []).then((data: FeaturedPhoto[]) => { if (!cancelled) setPhotos(data.slice(0, 6)); }).catch(() => { if (!cancelled) setPhotos([]); }).finally(() => { if (!cancelled) setLoading(false); }); return () => { cancelled = true; }; }, []);

  return <section className="relative overflow-hidden bg-[color:var(--page-bg-soft)] px-4 py-16 sm:px-6 md:py-20"><div className="mx-auto max-w-6xl"><div className="mb-8 flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-300/75">Gallery</p><h2 className="mt-2 font-serif text-3xl font-bold text-foreground sm:text-4xl dark:text-white">Our community moments</h2><p className="mt-2 text-sm text-muted-foreground">Moments from our community, captured together.</p></div><Link href="/gallery" className="hidden shrink-0 items-center gap-2 text-sm font-semibold text-amber-300 sm:inline-flex">View Meditiya Nagar community gallery <ArrowRight className="h-4 w-4" /></Link></div>{loading ? <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">{[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="aspect-square animate-pulse rounded-2xl border-white/[0.08] bg-white/[0.04]" />)}</div> : photos.length ? <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">{photos.map((photo) => <PhotoCard key={photo.id} photo={photo} />)}</div> : <div className="rounded-2xl border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center text-sm text-muted-foreground">Gallery photos will appear here soon.</div>}<Link href="/gallery" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-amber-300 sm:hidden">View Meditiya Nagar community gallery <ArrowRight className="h-4 w-4" /></Link></div></section>;
}
