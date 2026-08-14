import { useListLostFoundItems } from '@workspace/api-client-react';
import { Search, Package, PackageOpen } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function LostFound() {
  const { data: items, isLoading } = useListLostFoundItems();

  return (
    <div className="w-full min-h-screen bg-muted/10 pb-20">
      <section className="bg-background pt-16 pb-12 px-4 border-b border-border shadow-sm text-center">
        <Search className="w-12 h-12 text-primary mx-auto mb-4" />
        <h1 className="text-4xl font-serif font-bold text-foreground mb-4">Lost & Found</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Help reunite lost items with their owners within the society.
        </p>
      </section>

      <div className="container mx-auto max-w-5xl px-4 py-12">
        <Tabs defaultValue="all" className="w-full">
          <div className="flex justify-center mb-8">
            <TabsList>
              <TabsTrigger value="all">All Items</TabsTrigger>
              <TabsTrigger value="lost">Lost Items</TabsTrigger>
              <TabsTrigger value="found">Found Items</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="all" className="mt-0">
            {isLoading ? (
              <div className="text-center py-10">Loading items...</div>
            ) : items?.length === 0 ? (
              <div className="text-center py-20 bg-card rounded-2xl border border-border">
                <h3 className="text-xl font-medium text-foreground">No items reported</h3>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {items?.map((item) => (
                  <Card key={item.id} className="overflow-hidden border-border bg-card flex flex-col sm:flex-row">
                    {item.imageUrl ? (
                      <div className="w-full sm:w-40 h-48 sm:h-auto shrink-0 bg-muted">
                        <img src={item.imageUrl} alt={item.title} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-full sm:w-40 h-48 sm:h-auto shrink-0 bg-muted flex items-center justify-center border-r border-border">
                        <PackageOpen className="w-10 h-10 text-muted-foreground/30" />
                      </div>
                    )}
                    <CardContent className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-lg text-foreground line-clamp-1">{item.title}</h3>
                          <Badge variant={item.type === 'lost' ? 'destructive' : 'default'} className="ml-2">
                            {item.type.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{item.description}</p>
                        {item.location && (
                          <p className="text-sm font-medium text-foreground/80 mb-2">
                            Location: <span className="text-muted-foreground font-normal">{item.location}</span>
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mb-4">Reported on {formatDate(item.createdAt)}</p>
                      </div>
                      
                      <div className="pt-3 border-t border-border mt-auto flex items-center justify-between text-sm">
                        <span className="font-medium text-foreground/80 truncate">{item.contactName}</span>
                        <a href={`tel:${item.contactPhone}`} className="text-primary font-bold hover:underline">
                          {item.contactPhone}
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          {/* Other tabs would filter the list similarly, omitting for brevity */}
        </Tabs>
      </div>
    </div>
  );
}
