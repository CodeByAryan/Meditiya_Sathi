import { useListCommitteeMembers } from '@workspace/api-client-react';
import { motion } from 'framer-motion';
import { Shield, BookOpen, Users, MapPin, Target, History } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function About() {
  const { data: committee } = useListCommitteeMembers();

  const rules = [
    "Respect fellow residents and maintain harmony in the society.",
    "Noise levels must be kept to a minimum after 10:00 PM.",
    "Common areas must be kept clean; do not litter.",
    "Prior permission is required for private events in common areas.",
    "Maintenance charges must be paid by the 5th of every month.",
    "Parking is allowed only in designated slots.",
    "All visitors must register at the security gate."
  ];

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[color:var(--page-bg-soft)] py-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.12),transparent_40%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/90" />
        <div className="container relative z-10 mx-auto px-4 text-center">
          <Badge className="mb-4 border-primary/20 bg-primary/15 px-4 py-1.5 font-bold text-primary hover:bg-primary/20">OUR COMMUNITY</Badge>
          <h1 className="mb-6 text-4xl font-serif font-bold text-foreground drop-shadow-md md:text-6xl">About Meditiya Nagar</h1>
          <p className="mx-auto max-w-2xl text-xl leading-relaxed text-muted-foreground">
            A vibrant community built on the pillars of togetherness, cultural celebration, and mutual respect.
          </p>
        </div>
      </section>

      {/* History & Vision */}
      <section className="py-16 bg-background relative">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                  <History className="w-6 h-6" />
                </div>
                <h2 className="text-3xl font-serif font-bold text-foreground">Our History</h2>
              </div>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Established in 1995, Meditiya Nagar began as a modest residential complex and has blossomed into a thriving community of over 500 families. What started with just two buildings has now expanded into a fully-fledged society with state-of-the-art amenities.
              </p>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Through decades of shared festivals, community initiatives, and unwavering support for one another, we have built more than just housing—we have built a family.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="grid gap-6"
            >
              <Card className="glass-card overflow-hidden group">
                <div className="absolute inset-y-0 left-0 w-1 bg-primary group-hover:w-2 transition-all"></div>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" /> Vision
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">To be the most harmonious, eco-friendly, and culturally vibrant residential community in the city, where every resident feels a deep sense of belonging.</p>
                </CardContent>
              </Card>

              <Card className="glass-card overflow-hidden group">
                <div className="absolute inset-y-0 left-0 w-1 bg-accent group-hover:w-2 transition-all"></div>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-accent" /> Mission
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">To provide a safe, clean, and engaging environment while preserving our rich cultural heritage through grand celebrations and community service.</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      <Separator className="bg-border/50 max-w-5xl mx-auto" />

      {/* Committee Listing */}
      <section className="py-20 bg-muted/20 relative">
        <div className="absolute top-1/2 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge className="bg-accent/20 text-accent-foreground hover:bg-accent/30 mb-4">LEADERSHIP</Badge>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">Managing Committee</h2>
            <p className="text-muted-foreground text-lg">The dedicated individuals working tirelessly to ensure the smooth functioning of our society.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {committee?.map((member, idx) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className="h-full border-border hover:shadow-lg transition-shadow overflow-hidden group">
                  <div className="h-2 bg-gradient-to-r from-primary to-accent"></div>
                  <CardContent className="pt-8 flex flex-col items-center text-center">
                    <div className="w-24 h-24 rounded-full bg-muted border-4 border-background shadow-md overflow-hidden mb-4 relative">
                      {member.photoUrl ? (
                        <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                        <Users className="w-10 h-10 text-muted-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                      )}
                    </div>
                    <h3 className="font-bold text-lg text-foreground">{member.name}</h3>
                    <p className="text-primary font-medium text-sm mb-2">{member.role}</p>
                    {member.flatNumber && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
                        <MapPin className="w-3 h-3" /> {member.flatNumber}
                      </span>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}

            {!committee?.length && (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground">Committee members will be listed here.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Society Rules */}
      <section className="py-20 bg-background relative overflow-hidden">
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-3xl translate-y-1/2 translate-x-1/4"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto bg-card border border-border shadow-xl rounded-3xl p-8 md:p-12 relative">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <BookOpen className="w-32 h-32 text-foreground" />
            </div>
            
            <h2 className="text-3xl font-serif font-bold text-foreground mb-2 flex items-center gap-3">
              <Shield className="w-8 h-8 text-primary" /> Society Rules & Guidelines
            </h2>
            <p className="text-muted-foreground mb-8 text-lg">For the peaceful coexistence of all residents.</p>
            
            <div className="space-y-4 relative z-10">
              {rules.map((rule, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-start gap-4 p-4 rounded-xl hover:bg-muted/50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <p className="text-foreground/90 pt-1">{rule}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}