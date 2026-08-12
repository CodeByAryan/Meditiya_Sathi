import { Variants } from 'framer-motion';

export const pageFade: Variants = {
  hidden: { opacity: 0, y: 8 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.3 } },
};

export const staggerChildren = (delay = 0.15): Variants => ({
  hidden: {},
  enter: { transition: { staggerChildren: delay } },
});

export const reveal: Variants = {
  hidden: { opacity: 0, y: 12 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};
