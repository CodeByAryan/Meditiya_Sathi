import { MapPin, Mail, Phone, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export default function Contact() {
  return (
    <div className="w-full min-h-screen bg-background pb-20">
      <section className="bg-secondary text-secondary-foreground pt-16 pb-32 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-pattern opacity-10"></div>
        <div className="container mx-auto max-w-5xl relative z-10 text-center">
          <h1 className="text-4xl md:text-6xl font-serif font-bold text-white mb-6">Get in Touch</h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            Have questions, suggestions, or need assistance? The committee is always here to help you.
          </p>
        </div>
      </section>

      <div className="container mx-auto max-w-5xl px-4 -mt-20 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2">
            <Card className="shadow-xl border-border bg-card h-full">
              <CardContent className="p-8 md:p-10">
                <h2 className="text-2xl font-serif font-bold text-foreground mb-6">Send us a message</h2>
                <form className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input id="name" placeholder="John Doe" className="bg-muted/50" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="flat">Flat Number</Label>
                      <Input id="flat" placeholder="e.g. A-101" className="bg-muted/50" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" placeholder="john@example.com" className="bg-muted/50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input id="subject" placeholder="What is this regarding?" className="bg-muted/50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea id="message" placeholder="Type your message here..." rows={6} className="bg-muted/50 resize-none" />
                  </div>
                  <Button className="w-full md:w-auto px-8 font-bold bg-primary text-primary-foreground hover:bg-primary/90">
                    Send Message
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <Card className="shadow-lg border-border bg-card">
              <CardContent className="p-8 flex flex-col gap-8">
                <div>
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-4">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-foreground text-lg mb-2">Location</h3>
                  <p className="text-muted-foreground">Meditiya Nagar Society,<br/>Sector 4, Charkop,<br/>Kandivali West, Mumbai,<br/>Maharashtra 400067</p>
                </div>
                
                <div>
                  <div className="w-12 h-12 bg-secondary/10 text-secondary rounded-xl flex items-center justify-center mb-4">
                    <Mail className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-foreground text-lg mb-2">Email</h3>
                  <p className="text-muted-foreground">committee@meditiyanagar.com</p>
                  <p className="text-muted-foreground">support@meditiyanagar.com</p>
                </div>
                
                <div>
                  <div className="w-12 h-12 bg-accent/20 text-accent-foreground rounded-xl flex items-center justify-center mb-4">
                    <Phone className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-foreground text-lg mb-2">Phone</h3>
                  <p className="text-muted-foreground">Security Gate: 022-2867-XXXX</p>
                  <p className="text-muted-foreground">Society Office: 022-2867-YYYY</p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-border bg-card">
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-4 text-foreground">
                  <Clock className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-lg">Office Hours</h3>
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Monday - Saturday:</span>
                    <span className="font-medium text-foreground">10:00 AM - 1:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Evening:</span>
                    <span className="font-medium text-foreground">6:00 PM - 8:00 PM</span>
                  </div>
                  <div className="flex justify-between text-destructive mt-2 pt-2 border-t border-border">
                    <span>Sunday:</span>
                    <span className="font-medium">Closed</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}