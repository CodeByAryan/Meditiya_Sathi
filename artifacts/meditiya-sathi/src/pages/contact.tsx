import React, { useState } from 'react';
import { MapPin, Mail, Phone, Clock, MessageCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  getWhatsAppClickToChatUrl,
  WHATSAPP_CONTACT_NUMBER,
  normalizeWhatsAppNumber,
} from '@/config/whatsapp';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    flat: '',
    email: '',
    subject: '',
    message: '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const name = formData.name.trim();
    if (!name) {
      toast.error('Please enter your full name.');
      return;
    }

    const cleanPhone = formData.phone.replace(/\D/g, '');
    if (!cleanPhone) {
      toast.error('Please enter your phone number.');
      return;
    }
    if (cleanPhone.length < 10) {
      toast.error('Please enter a valid 10-digit phone number.');
      return;
    }

    const message = formData.message.trim();
    if (!message) {
      toast.error('Please enter your message.');
      return;
    }

    // Build the pre-filled WhatsApp message:
    // Hello Meditiya Sathi Team,
    //
    // Name: [name]
    // Phone: [phone]
    // Message: [message]
    const messageText = `Hello Meditiya Sathi Team,\n\nName: ${name}\nPhone: ${formData.phone.trim()}\nMessage: ${message}`;

    const targetNumber = normalizeWhatsAppNumber(WHATSAPP_CONTACT_NUMBER);
    const encodedMessage = encodeURIComponent(messageText);
    const whatsappUrl = `https://wa.me/${targetNumber}?text=${encodedMessage}`;

    toast.success('Redirecting to WhatsApp...');
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };
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
                <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="John Doe"
                        className="bg-muted/50"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="e.g. 9876543210"
                        className="bg-muted/50"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="flat">Flat Number</Label>
                      <Input
                        id="flat"
                        value={formData.flat}
                        onChange={handleChange}
                        placeholder="e.g. A-101"
                        className="bg-muted/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="john@example.com"
                        className="bg-muted/50"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      placeholder="What is this regarding?"
                      className="bg-muted/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Type your message here..."
                      rows={6}
                      className="bg-muted/50 resize-none"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full md:w-auto px-8 font-bold bg-primary text-primary-foreground hover:bg-primary/90"
                  >
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
                  <p className="text-muted-foreground">Omkareshwar Mandir,<br/>Meditiya Nagar Society,<br/> Opp. Seven Square School, Deepak Hospital Lane,,<br/>Mira Road,Mumbai, Maharashtra 401107</p>
                </div>

                <div>
                  <div className="w-12 h-12 bg-secondary/10 text-secondary rounded-xl flex items-center justify-center mb-4">
                    <Mail className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-foreground text-lg mb-2">Email</h3>
                  <p className="text-muted-foreground">medtiyasathi@gmail.com</p>
                  </div>

                {/* <div>
                  <div className="w-12 h-12 bg-accent/20 text-accent-foreground rounded-xl flex items-center justify-center mb-4">
                    <Phone className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-foreground text-lg mb-2">Phone</h3>
                  <p className="text-muted-foreground">Security Gate: 022-2867-XXXX</p>
                  <p className="text-muted-foreground">Society Office: 022-2867-YYYY</p>
                </div> */}

                <div>
                  <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center mb-4">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-foreground text-lg mb-2">WhatsApp</h3>
                  <p className="text-muted-foreground mb-3">Quick query or message to Mandal committee</p>
                  <a
                    href={getWhatsAppClickToChatUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Contact us on WhatsApp"
                    className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2 text-xs font-bold text-white shadow-md transition-all duration-300 hover:bg-[#20ba5a] hover:scale-105 active:scale-95"
                  >
                    <MessageCircle className="h-4 w-4 fill-white" />
                    Chat with us on WhatsApp
                  </a>
                </div>
              </CardContent>
            </Card>

            
          </div>

        </div>
      </div>
    </div>
  );
}