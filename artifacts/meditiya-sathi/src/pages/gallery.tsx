import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { ChevronLeft, ChevronRight, Image as ImageIcon, X } from 'lucide-react';
import { getApiUrl } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

type Photo = { id: number; imageUrl: string; title?: string | null; caption?: string | null; albumSlug: string; albumName: string };
type Album = { id: number; slug: string; title: string; photoCount?: number; photos?: Photo[]; festival?: string | null; year?: number };

export default function Gallery() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const load = async () => { setLoading(true); setFailed(false); try { const [albumsResponse, photosResponse] = await Promise.all([fetch(`${getApiUrl()}/api/gallery/albums`), fetch(`${getApiUrl()}/api/gallery/featured`)]); if (!albumsResponse.ok || !photosResponse.ok) throw new Error(); const albumsData = await albumsResponse.json() as Album[]; const photosData = await photosResponse.json() as Array<Photo & { albumTitle?: string | null }>; setAlbums(albumsData); setPhotos(photosData.map((photo) => ({ ...photo, albumName: photo.albumName || photo.albumTitle || 'Community moments' }))); } catch { setFailed(true); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  const current = active === null ? null : photos[active];

  return (
    <div className="w-full min-h-screen bg-background pb-20">
      <section className="pt-16 pb-12 px-4 text-center"><p className="text-xs font-semibold uppercase tracking-[.28em] text-primary">Gallery</p><h1 className="mt-3 text-4xl font-serif font-bold text-foreground md:text-5xl">Festival &amp; Community Moments</h1><p className="mx-auto mt-4 max-w-2xl text-muted-foreground">Capturing the beautiful moments, vibrant festivals, and joyous celebrations of Medtiya Nagar.</p></section>

      <div className="container mx-auto max-w-6xl px-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="aspect-square rounded-2xl" />)}
          </div>
        ) : failed ? (
          <div className="rounded-3xl border-destructive/30 bg-destructive/5 py-16 text-center"><p className="text-lg font-semibold">Unable to load gallery</p><button onClick={() => void load()} className="mt-4 rounded-lg bg-primary px-4 py-2 text-primary-foreground">Retry</button></div>
        ) : !photos.length ? (
          <div className="text-center py-20 bg-muted/20 rounded-3xl border border-border">
            <ImageIcon className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-lg font-semibold">No gallery photos available yet.</p>
          </div>
        ) : (
          <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
            {photos.map((photo, index) => <button key={photo.id} onClick={() => setActive(index)} className="group relative aspect-square overflow-hidden rounded-2xl border-border bg-muted text-left"><img src={photo.imageUrl} alt={photo.title || photo.caption || photo.albumName} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /><span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-8 text-xs font-medium text-white">{photo.albumName}</span></button>)}
          </div>
          <div className="mt-12 flex-wrap gap-3">{albums.filter((album) => (album.photoCount || 0) > 0).map((album) => <Link key={album.id} href={`/gallery/${encodeURIComponent(album.slug)}`} className="rounded-xl border-border bg-card px-4 py-3 text-sm transition hover:border-primary">{album.title} <span className="text-muted-foreground">· {album.photoCount} photos</span></Link>)}</div>
          </>
        )}
      </div>
      {current && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setActive(null)}><button aria-label="Close" className="absolute right-4 top-4 rounded-full bg-white/10 p-3 text-white" onClick={() => setActive(null)}><X /></button><button aria-label="Previous" className="absolute left-2 rounded-full bg-white/10 p-3 text-white sm:left-8" onClick={(e) => { e.stopPropagation(); setActive((active! - 1 + photos.length) % photos.length); }}><ChevronLeft /></button><img src={current.imageUrl} alt={current.title || current.albumName} className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain" onClick={(e) => e.stopPropagation()} /><button aria-label="Next" className="absolute right-2 rounded-full bg-white/10 p-3 text-white sm:right-8" onClick={(e) => { e.stopPropagation(); setActive((active! + 1) % photos.length); }}><ChevronRight /></button></div>}
    </div>
  );
}
