import { useListMarketplaceItems } from '@workspace/api-client-react';
import { ShoppingBag, Search, Tag, Filter } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export default function Marketplace() {
  const { data: items, isLoading } = useListMarketplaceItems();

  return (
    <div className="w-full min-h-screen bg-muted/10 pb-20">
      <section className="bg-background pt-16 pb-12 px-4 border-b border-border shadow-sm">
        <div className="container mx-auto max-w-6xl text-center">
          <ShoppingBag className="w-12 h-12 text-primary mx-auto mb-4" />
          <h1 className="text-4xl font-serif font-bold text-foreground mb-4">Society Marketplace</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Buy, sell, or donate items within our trusted community.
          </p>
          
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input 
              placeholder="Search items..." 
              className="w-full pl-12 h-14 rounded-full bg-muted/50 border-border text-foreground focus-visible:ring-primary shadow-inner"
            />
          </div>
        </div>
      </section>

      <div className="container mx-auto max-w-6xl px-4 py-12">
        {isLoading ? (
          <div className="text-center py-10">Loading items...</div>
        ) : items?.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-2xl border border-border">
            <h3 className="text-xl font-medium text-foreground">No items listed yet</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items?.map((item) => (
              <Card key={item.id} className="overflow-hidden border-border bg-card hover:shadow-xl transition-all group flex flex-col">
                <div className="relative h-48 bg-muted border-b border-border overflow-hidden">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.title} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Tag className="w-12 h-12 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3 flex gap-2">
                    <Badge className={
                      item.listingType === 'sell' ? 'bg-blue-500 text-white hover:bg-blue-600' :
                      item.listingType === 'buy' ? 'bg-orange-500 text-white hover:bg-orange-600' :
                      'bg-green-500 text-white hover:bg-green-600'
                    }>
                      {item.listingType.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-foreground line-clamp-1">{item.title}</h3>
                  </div>
                  {item.price && (
                    <p className="text-xl font-bold text-primary mb-3">₹{item.price.toLocaleString('en-IN')}</p>
                  )}
                  {!item.price && item.listingType === 'donate' && (
                    <p className="text-xl font-bold text-green-600 mb-3">FREE</p>
                  )}
                  
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
                    {item.description}
                  </p>
                  
                  <div className="pt-4 border-t border-border mt-auto flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground/80 truncate max-w-[120px]">{item.sellerName}</span>
                    <a href={`tel:${item.sellerPhone}`} className="text-primary font-bold hover:underline">
                      Contact
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
