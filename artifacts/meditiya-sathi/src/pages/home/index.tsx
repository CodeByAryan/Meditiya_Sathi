import React from 'react';
import { motion } from 'framer-motion';
import Hero from './Hero';
import Stats from './Stats';
import UpcomingTeaser from './UpcomingTeaser';
import FeaturesBento from './FeaturesBento';
import VolunteersSection from './VolunteersSection';
import FAQSection from './FAQSection';
import { pageFade } from './motionVariants';
import WhatsAppFloatingButton from '@/components/WhatsAppFloatingButton';

export default function HomePage() {
  return (
    <motion.div initial="hidden" animate="enter" exit="exit" variants={pageFade} className="w-full">
      <Hero />
      <Stats />
      <UpcomingTeaser />
      <FeaturesBento />
      <VolunteersSection />
      <FAQSection />
      <WhatsAppFloatingButton />
    </motion.div>
  );
}
