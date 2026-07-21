import { useState } from 'react';
import { useListNotices } from '@workspace/api-client-react';
import { motion } from 'framer-motion';
import { Pin, Search, FileText, Download, Calendar, Filter, BellRing } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Notices() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  
  // Realistically we'd debounce search, but for simplicity here
  const { data: notices, isLoading } = useListNotices({ 
    search: search || undefined, 
    category: category !== "all" ? category : undefined 
  });

  const categories = ["all", "General", "Maintenance", "Festival", "Emergency"];

  return (
    <div className="w-full min-h-screen bg-muted/10 pb-20">
      <section className="bg-secondary text-secondary-foreground py-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-pattern opacity-10"></div>
        <div className="container mx-auto max-w-5xl relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-4 flex items-center gap-3 justify-center md:justify-start">
              <BellRing className="w-10 h-10 text-primary" />
              Notice Board
            </h1>
            <p className="text-white/80 text-lg max-w-xl">
              Important updates, maintenance schedules, and official announcements from the managing committee.
            </p>
          </div>
          
          <div className="w-full md:w-96">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input 
                placeholder="Search notices..." 
                className="w-full pl-10 h-12 rounded-full bg-white/10 border-white/20 text-white placeholder:text-white/50 focus-visible:ring-primary focus-visible:border-primary"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto max-w-5xl px-4 py-8">
        <Tabs value={category} onValueChange={setCategory} className="mb-8">
          <TabsList className="bg-background border border-border flex flex-wrap h-auto p-1">
            {categories.map(c => (
              <TabsTrigger 
                key={c} 
                value={c}
                className="capitalize data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                {c}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="space-y-6">
          {isLoading ? (
            [1, 2, 3].map(i => (
              <Card key={i} className="p-6">
                <Skeleton className="h-6 w-1/3 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </Card>
            ))
          ) : notices?.length === 0 ? (
            <div className="text-center py-20 bg-card rounded-2xl border border-border shadow-sm">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-medium text-foreground">No notices found</h3>
              <p className="text-muted-foreground mt-2">Try adjusting your search or filters.</p>
            </div>
          ) : (
            notices?.map((notice, idx) => (
              <motion.div
                key={notice.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className={`overflow-hidden border-border hover:shadow-md transition-shadow relative ${notice.isPinned ? 'border-primary/50 shadow-[0_0_15px_rgba(255,122,0,0.1)]' : ''}`}>
                  {notice.isPinned && (
                    <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden">
                      <div className="absolute top-6 -right-6 bg-primary text-white text-[10px] font-bold py-1 px-8 rotate-45 flex items-center gap-1 shadow-sm">
                        <Pin className="w-3 h-3" /> PINNED
                      </div>
                    </div>
                  )}
                  <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6">
                    <div className="flex-1 space-y-4">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <Badge variant="secondary" className={
                          notice.category === 'Emergency' ? 'bg-destructive/10 text-destructive border-destructive/20' : 
                          notice.category === 'Festival' ? 'bg-accent/20 text-accent-foreground border-accent/20' : 
                          'bg-secondary/10 text-secondary border-secondary/20'
                        }>
                          {notice.category}
                        </Badge>
                        <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          {formatDate(notice.createdAt)}
                        </span>
                      </div>
                      
                      <h3 className="text-2xl font-serif font-bold text-foreground pr-8 md:pr-0">
                        {notice.title}
                      </h3>
                      
                      <div className="text-foreground/80 leading-relaxed whitespace-pre-wrap">
                        {notice.content}
                      </div>
                    </div>
                    
                    {notice.attachmentUrl && (
                      <div className="shrink-0 pt-4 md:pt-0 md:pl-6 md:border-l border-border flex flex-row md:flex-col items-center justify-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                          <FileText className="w-6 h-6" />
                        </div>
                        <a 
                          href={notice.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm font-bold text-primary hover:text-primary/80 transition-colors bg-primary/5 hover:bg-primary/10 px-4 py-2 rounded-full border border-primary/20"
                        >
                          <Download className="w-4 h-4" /> Download PDF
                        </a>
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}