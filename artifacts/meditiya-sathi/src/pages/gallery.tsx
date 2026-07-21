import { useListAlbums } from '@workspace/api-client-react';
import { motion } from 'framer-motion';
import { Image as ImageIcon, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function Gallery() {
  const { data: albums, isLoading } = useListAlbums();

  return (
    <div className="w-full min-h-screen bg-background pb-20">
      <section className="pt-16 pb-12 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-secondary dark:text-white mb-4">Memory Lane</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Capturing the beautiful moments, vibrant festivals, and joyous celebrations of Meditiya Nagar.
        </p>
      </section>

      <div className="container mx-auto max-w-6xl px-4">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-64 w-full rounded-2xl" />
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            ))}
          </div>
        ) : albums?.length === 0 ? (
          <div className="text-center py-20 bg-muted/20 rounded-3xl border border-border">
            <ImageIcon className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-2xl font-serif font-bold text-foreground">No Albums Yet</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {albums?.map((album, idx) => (
              <motion.div
                key={album.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
              >
                <div className="group cursor-pointer">
                  <div className="relative h-64 rounded-2xl overflow-hidden mb-4 shadow-md bg-muted border border-border">
                    {album.coverImageUrl ? (
                      <img 
                        src={album.coverImageUrl} 
                        alt={album.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-secondary/5">
                        <ImageIcon className="w-12 h-12 text-secondary/30" />
                      </div>
                    )}
                    
                    {/* Stack effect */}
                    <div className="absolute -z-10 top-2 left-2 right-[-8px] bottom-[-8px] bg-background border border-border rounded-2xl group-hover:translate-x-1 group-hover:translate-y-1 transition-transform"></div>
                    <div className="absolute -z-20 top-4 left-4 right-[-16px] bottom-[-16px] bg-background border border-border rounded-2xl group-hover:translate-x-2 group-hover:translate-y-2 transition-transform opacity-50"></div>
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                      <span className="text-white font-medium text-sm flex items-center gap-2">
                        View {album.photoCount || 0} Photos <ArrowRightIcon className="w-4 h-4" />
                      </span>
                    </div>
                    
                    {album.festival && (
                      <Badge className="absolute top-4 right-4 bg-primary text-primary-foreground border-none">
                        {album.festival}
                      </Badge>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-bold font-serif text-foreground group-hover:text-primary transition-colors line-clamp-1">{album.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <Calendar className="w-4 h-4" /> {album.year}
                      <span className="mx-2 text-border">•</span>
                      <span>{album.photoCount || 0} photos</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ArrowRightIcon(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinelinejoin="round" {...props}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
}