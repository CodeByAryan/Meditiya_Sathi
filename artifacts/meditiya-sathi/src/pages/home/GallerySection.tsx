import React, { useEffect, useState } from "react";
import { ArrowRight, Calendar, Image as ImageIcon, Images } from "lucide-react";
import { Link } from "wouter";
import { getApiUrl } from "@/lib/utils";

type Album = {
  id: number;
  title: string;
  slug: string;
  description?: string | null;
  year?: number;
  festival?: string | null;
  coverImageUrl?: string | null;
  photoCount?: number;
};

function AlbumCard({ album }: { album: Album }) {
  const [failed, setFailed] = useState(false);
  const showCover = Boolean(album.coverImageUrl && !failed);

  return (
    <Link
      href={`/gallery/${encodeURIComponent(album.slug)}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.09] bg-black/[0.24] shadow-[0_10px_30px_rgba(0,0,0,0.18)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-amber-300/35 hover:shadow-[0_20px_50px_rgba(245,158,11,0.12)] dark:bg-white/[0.025]"
    >
      {/* Cover Image */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-black/40">
        {showCover ? (
          <img
            src={album.coverImageUrl!}
            alt={album.title}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
            className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-amber-300/[0.05]">
            <ImageIcon className="h-10 w-10 text-amber-300/35" />
          </div>
        )}

        {/* Ambient shadow gradient */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        {/* Badges on Cover */}
        <div className="pointer-events-none absolute inset-x-2.5 top-2.5 flex items-center justify-between gap-1.5">
          {album.festival ? (
            <span className="truncate max-w-[65%] rounded-full border border-amber-300/30 bg-black/65 px-2.5 py-0.5 text-[10px] font-semibold text-amber-300 backdrop-blur-md">
              {album.festival}
            </span>
          ) : (
            <span />
          )}

          {album.photoCount !== undefined && album.photoCount > 0 && (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/65 px-2.5 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-md">
              <Images className="h-3 w-3 text-amber-300" />
              <span>{album.photoCount}</span>
            </span>
          )}
        </div>
      </div>

      {/* Album Info */}
      <div className="flex flex-1 flex-col justify-between p-3.5 sm:p-4">
        <div>
          <h3
            className="font-serif text-sm font-bold text-foreground transition-colors duration-300 group-hover:text-amber-300 sm:text-base line-clamp-1 dark:text-white"
            title={album.title}
          >
            {album.title}
          </h3>

          {album.description && (
            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
              {album.description}
            </p>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          {album.year ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/80">
              <Calendar className="h-3 w-3 text-amber-300/70" />
              {album.year}
            </span>
          ) : (
            <span />
          )}

          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300 transition-transform duration-200 group-hover:translate-x-0.5">
            View Album
            <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function GallerySection() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`${getApiUrl()}/api/gallery/albums`)
      .then((response) => (response.ok ? response.json() : []))
      .then((data: Album[]) => {
        if (!cancelled) {
          const publishedWithPhotos = (Array.isArray(data) ? data : []).filter(
            (album) => (album.photoCount || 0) > 0
          );
          setAlbums(publishedWithPhotos.slice(0, 8));
        }
      })
      .catch(() => {
        if (!cancelled) setAlbums([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="relative overflow-hidden bg-[color:var(--page-bg-soft)] px-4 py-16 sm:px-6 md:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-300/75">
              Gallery
            </p>
            <h2 className="mt-2 font-serif text-3xl font-bold text-foreground sm:text-4xl dark:text-white">
              Our community moments
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Moments from our community, captured together.
            </p>
          </div>
          <Link
            href="/gallery"
            className="hidden shrink-0 items-center gap-2 text-sm font-semibold text-amber-300 transition-colors hover:text-amber-200 sm:inline-flex"
          >
            View Meditiya Nagar community gallery <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] animate-pulse"
              >
                <div className="aspect-[4/3] w-full bg-white/[0.05]" />
                <div className="space-y-2 p-3.5 sm:p-4">
                  <div className="h-4 w-3/4 rounded bg-white/[0.06]" />
                  <div className="h-3 w-1/2 rounded bg-white/[0.04]" />
                </div>
              </div>
            ))}
          </div>
        ) : albums.length ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
            {albums.map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center text-sm text-muted-foreground">
            Gallery albums will appear here soon.
          </div>
        )}

        <Link
          href="/gallery"
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-amber-300 transition-colors hover:text-amber-200 sm:hidden"
        >
          View Meditiya Nagar community gallery <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
