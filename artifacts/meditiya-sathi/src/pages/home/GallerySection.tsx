import React from 'react';
import { ArrowRight, Image as ImageIcon } from 'lucide-react';
import { Link } from 'wouter';
import { useListAlbums } from '@workspace/api-client-react';

function AlbumCover({ src, title }: { src?: string | null; title: string }) {
  const [failed, setFailed] = React.useState(false);
  if (!src || failed) return <div className="flex h-52 items-center justify-center bg-amber-300/[0.06]"><ImageIcon className="h-10 w-10 text-amber-300/35" /></div>;
  return <img src={src} alt={title} loading="lazy" decoding="async" onError={() => setFailed(true)} className="h-52 w-full object-cover transition duration-500 group-hover:scale-105" />;
}

export default function GallerySection() {
  const { data: albums, isLoading } = useListAlbums();
  const visibleAlbums = albums?.filter((album) => Boolean(album.slug)).slice(0, 3) || [];
  if (!isLoading && !visibleAlbums.length) return null;
  return <section className="relative overflow-hidden bg-[color:var(--page-bg-soft)] px-4 py-16 sm:px-6 md:py-20">
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div><p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-300/75">Gallery</p><h2 className="mt-2 font-serif text-3xl font-bold text-foreground sm:text-4xl dark:text-white">Our community moments</h2><p className="mt-2 text-sm text-muted-foreground">Celebrating the moments we share together.</p></div>
        <Link href="/gallery" className="hidden shrink-0 items-center gap-2 text-sm font-semibold text-amber-300 sm:inline-flex">View all albums <ArrowRight className="h-4 w-4" /></Link>
      </div>
      {isLoading ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-80 animate-pulse rounded-2xl border-white/[0.08] bg-white/[0.04]" />)}</div> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{visibleAlbums.map((album) => <Link key={album.id} href={`/gallery/${encodeURIComponent(album.slug)}`} className="group overflow-hidden rounded-2xl border-white/[0.09] bg-black/[0.24] transition duration-300 hover:-translate-y-1 hover:border-amber-300/25 hover:shadow-[0_15px_45px_rgba(245,158,11,0.08)] dark:bg-white/[0.025]"><div className="overflow-hidden"><AlbumCover src={album.coverImageUrl} title={album.title} /></div><div className="p-5"><h3 className="font-serif text-xl font-semibold text-foreground group-hover:text-amber-300 dark:text-white">{album.title}</h3><p className="mt-2 text-sm text-muted-foreground">{album.photoCount || 0} photos</p><span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-amber-300">View album <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span></div></Link>)}</div>}
      <Link href="/gallery" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-amber-300 sm:hidden">View all albums <ArrowRight className="h-4 w-4" /></Link>
    </div>
  </section>;
}
