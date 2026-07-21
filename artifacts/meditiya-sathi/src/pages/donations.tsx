import { useListDonations, useGetDonationProgress, useGetTopDonors } from '@workspace/api-client-react';
import { motion } from 'framer-motion';
import { Heart, Trophy, IndianRupee, History, QrCode } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

export default function Donations() {
  const { data: progress } = useGetDonationProgress();
  const { data: topDonors } = useGetTopDonors({ limit: 5 });
  const { data: recentDonations } = useListDonations({ limit: 10 });

  return (
    <div className="w-full min-h-screen bg-muted/10 pb-20">
      {/* Hero */}
      <section className="bg-secondary pt-20 pb-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-pattern opacity-10"></div>
        <div className="container mx-auto max-w-5xl relative z-10 text-center">
          <Heart className="w-16 h-16 text-primary mx-auto mb-6 drop-shadow-md" />
          <h1 className="text-4xl md:text-6xl font-serif font-bold text-white mb-6">Support Our Community</h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto leading-relaxed">
            Your generous contributions help us organize grand festivals, maintain amenities, and support those in need. Every rupee counts.
          </p>
        </div>
      </section>

      <div className="container mx-auto max-w-5xl px-4 -mt-12 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Progress & Action Card */}
          <div className="lg:col-span-2 space-y-8">
            <Card className="shadow-xl border-border bg-card overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-primary via-accent to-primary"></div>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 uppercase tracking-widest font-bold">
                    {progress?.festivalName || "Current Goal"}
                  </Badge>
                  <span className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <UsersIcon className="w-4 h-4" /> {progress?.donorCount || 0} Supporters
                  </span>
                </div>
                <CardTitle className="text-3xl font-serif">Fundraising Progress</CardTitle>
                <CardDescription className="text-base">Help us reach our target for the upcoming celebrations.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <div className="flex justify-between items-end mb-3">
                    <div>
                      <span className="text-4xl font-bold text-foreground">₹{progress?.raised?.toLocaleString('en-IN') || 0}</span>
                      <span className="text-muted-foreground font-medium ml-2">raised</span>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-muted-foreground">of ₹{progress?.goal?.toLocaleString('en-IN') || "1,00,000"}</span>
                    </div>
                  </div>
                  <Progress value={progress?.percentage || 0} className="h-4 bg-muted" />
                  <div className="mt-3 flex justify-between text-sm font-bold text-primary">
                    <span>{progress?.percentage || 0}% Completed</span>
                  </div>
                </div>

                <div className="p-6 bg-muted/30 rounded-2xl border border-border flex flex-col sm:flex-row items-center gap-6 justify-between">
                  <div className="text-center sm:text-left space-y-2">
                    <h3 className="font-bold text-lg">Donate via UPI</h3>
                    <p className="text-muted-foreground text-sm max-w-[250px]">Scan the QR code using any UPI app or send directly to our society VPA.</p>
                    <p className="font-mono font-bold text-primary bg-primary/10 px-3 py-1.5 rounded inline-block mt-2">meditiyanagar@upi</p>
                  </div>
                  <div className="w-32 h-32 bg-white p-2 rounded-xl shadow-sm border border-border flex items-center justify-center shrink-0">
                    <QrCode className="w-20 h-20 text-slate-800" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Donations Table */}
            <Card className="shadow-md border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-serif">
                  <History className="w-5 h-5 text-primary" /> Recent Contributions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentDonations?.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No recent donations to display.</p>
                ) : (
                  <div className="space-y-4">
                    {recentDonations?.map((donation, i) => (
                      <div key={donation.id}>
                        {i > 0 && <Separator className="my-4" />}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border border-border">
                              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                {donation.donorName.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-bold text-foreground">{donation.donorName}</p>
                              <p className="text-xs text-muted-foreground">{formatDate(donation.createdAt)}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg text-primary">₹{donation.amount}</p>
                            {donation.message && (
                              <p className="text-xs text-muted-foreground italic truncate max-w-[120px]">"{donation.message}"</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            <Card className="shadow-md border-border bg-gradient-to-br from-card to-accent/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-serif text-secondary dark:text-white">
                  <Trophy className="w-5 h-5 text-accent" /> Top Supporters
                </CardTitle>
                <CardDescription>Generous hearts of our community</CardDescription>
              </CardHeader>
              <CardContent>
                {topDonors?.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">Be the first to donate!</p>
                ) : (
                  <div className="space-y-5">
                    {topDonors?.map((donor, idx) => (
                      <div key={idx} className="flex items-center gap-4 relative">
                        {idx === 0 && <div className="absolute -left-2 -top-2 text-2xl z-10">👑</div>}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shrink-0 shadow-sm ${
                          idx === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-600' :
                          idx === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-500' :
                          idx === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-700' :
                          'bg-primary/20 text-primary'
                        }`}>
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-foreground truncate">{donor.donorName}</p>
                          <p className="text-xs text-muted-foreground">{donor.donationCount} donations</p>
                        </div>
                        <div className="font-bold text-foreground">
                          ₹{donor.totalAmount}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="bg-primary text-primary-foreground rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
              <h3 className="font-serif font-bold text-xl mb-2">Corporate Sponsorship</h3>
              <p className="text-primary-foreground/80 text-sm mb-6 leading-relaxed">
                Want to sponsor our major festivals and get visibility across our society?
              </p>
              <a href="/contact" className="inline-block px-6 py-2 bg-white text-primary font-bold rounded-full text-sm hover:bg-white/90 transition-colors w-full text-center shadow-md">
                Contact Committee
              </a>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}

// Small icon helper
function UsersIcon(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinelinejoin="round" {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
}