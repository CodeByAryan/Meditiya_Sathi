import { useListEmergencyContacts } from '@workspace/api-client-react';
import { Phone, Ambulance, Shield, Flame, Activity, Wrench, Building } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';

export default function Emergency() {
  const { data: contacts, isLoading } = useListEmergencyContacts();

  const getIcon = (category: string) => {
    switch (category) {
      case 'hospital': return Ambulance;
      case 'police': return Shield;
      case 'fire_brigade': return Flame;
      case 'ambulance': return Activity;
      case 'electrician': return Wrench;
      case 'committee': return Building;
      default: return Phone;
    }
  };

  const getColor = (category: string) => {
    switch (category) {
      case 'hospital':
      case 'ambulance': 
        return 'text-red-500 bg-red-500/10 border-red-200';
      case 'police': 
        return 'text-blue-500 bg-blue-500/10 border-blue-200';
      case 'fire_brigade': 
        return 'text-orange-500 bg-orange-500/10 border-orange-200';
      case 'committee':
        return 'text-primary bg-primary/10 border-primary/20';
      default: 
        return 'text-slate-500 bg-slate-500/10 border-slate-200';
    }
  };

  return (
    <div className="w-full min-h-screen bg-background pb-20">
      <section className="bg-destructive/10 pt-16 pb-12 px-4 border-b border-destructive/20">
        <div className="container mx-auto max-w-5xl text-center">
          <div className="w-20 h-20 bg-destructive/20 text-destructive rounded-full flex items-center justify-center mx-auto mb-6">
            <Phone className="w-10 h-10" />
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-destructive mb-4">Emergency Contacts</h1>
          <p className="text-lg text-foreground/80 max-w-2xl mx-auto">
            In case of emergency, please reach out to the appropriate authorities or committee members immediately.
          </p>
        </div>
      </section>

      <div className="container mx-auto max-w-5xl px-4 py-12">
        {isLoading ? (
          <div className="text-center py-10">Loading contacts...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contacts?.map((contact, idx) => {
              const Icon = getIcon(contact.category);
              const colorStyle = getColor(contact.category);
              
              return (
                <motion.div
                  key={contact.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <a href={`tel:${contact.phone}`} className="block h-full">
                    <Card className="h-full hover:shadow-xl transition-all border-border hover:-translate-y-1 active:translate-y-0 group bg-card">
                      <CardContent className="p-6 flex flex-col items-center text-center">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${colorStyle}`}>
                          <Icon className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-foreground mb-1">{contact.name}</h3>
                        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
                          {contact.category.replace('_', ' ')}
                        </p>
                        
                        <div className="mt-auto w-full py-3 bg-muted rounded-xl text-lg font-bold text-foreground group-hover:bg-primary group-hover:text-white transition-colors">
                          {contact.phone}
                        </div>
                        
                        {contact.address && (
                          <p className="text-xs text-muted-foreground mt-4 line-clamp-2">
                            {contact.address}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </a>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}