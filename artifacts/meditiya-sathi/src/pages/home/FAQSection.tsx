import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ArrowRight } from 'lucide-react';
import { Link } from 'wouter';

interface FAQItem {
  question: string;
  answer: React.ReactNode;
}

const faqs: FAQItem[] = [
  {
    question: 'What is Meditiya Sathi?',
    answer: (
      <p>
        Meditiya Sathi is the digital platform for Meditiya Nagar that helps
        residents stay connected with community activities, festivals, events,
        announcements and other important updates.
      </p>
    ),
  },
  {
    question: 'How can I check festival contributions?',
    answer: (
      <p>
        Visit the{' '}
        <Link
          href="/donation-showcase"
          className="font-medium text-amber-600 underline underline-offset-4 transition-colors hover:text-amber-500 dark:text-amber-300 dark:hover:text-amber-200"
        >
          Festival Leaderboard
        </Link>{' '}
        to view publicly available individual contribution information for the
        currently showcased festival.
      </p>
    ),
  },
  {
    question: 'Which festival is currently shown on the Festival Leaderboard?',
    answer: (
      <p>
        The current public Festival Leaderboard showcases Ganesh Utsav 2026.
      </p>
    ),
  },
  {
    question: 'Can I see the total festival collection?',
    answer: (
      <p>
        No. The total festival collection is kept private and is available only to
        authorized administrators.
      </p>
    ),
  },
  {
    question: 'How can I register for community activities or events?',
    answer: (
      <p>
        Registration details are provided through the respective event or
        activity section whenever registration is available.
      </p>
    ),
  },
  {
    question: 'Where can I find announcements and updates?',
    answer: (
      <p>
        Check the{' '}
        <Link
          href="/notices"
          className="font-medium text-amber-600 underline underline-offset-4 transition-colors hover:text-amber-500 dark:text-amber-300 dark:hover:text-amber-200"
        >
          Notices
        </Link>{' '}
        and{' '}
        <Link
          href="/events"
          className="font-medium text-amber-600 underline underline-offset-4 transition-colors hover:text-amber-500 dark:text-amber-300 dark:hover:text-amber-200"
        >
          Events
        </Link>{' '}
        sections of the website for the latest community announcements and
        updates.
      </p>
    ),
  },
  {
    question: 'How can I contact the Meditiya Sathi team?',
    answer: (
      <p>
        Use the{' '}
        <Link
          href="/contact"
          className="font-medium text-amber-600 underline underline-offset-4 transition-colors hover:text-amber-500 dark:text-amber-300 dark:hover:text-amber-200"
        >
          contact information
        </Link>{' '}
        provided on the website or reach out through the official community
        channels.
      </p>
    ),
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleQuestion = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <section className="relative overflow-hidden py-20 sm:py-24 md:py-28 bg-[color:var(--page-bg)]">
      {/* Background Grid Pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025] dark:opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Ambient Lighting Glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 hidden h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400/[0.035] blur-[100px] sm:block" />
      <div className="pointer-events-none absolute -left-20 top-1/4 h-56 w-56 rounded-full bg-orange-500/[0.025] blur-[80px]" />

      <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
        {/* =====================================================
            HEADER
        ====================================================== */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-3xl text-center mb-12 sm:mb-16"
        >
          {/* Label */}
          <div className="mb-4 flex items-center justify-center gap-3">
            <span className="h-px w-10 bg-gradient-to-r from-transparent to-amber-300/60" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-600 dark:text-amber-300/80">
              Got Questions?
            </span>
            <span className="h-px w-10 bg-gradient-to-l from-transparent to-amber-300/60" />
          </div>

          {/* Heading */}
          <h2 className="text-3xl font-serif font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Frequently Asked{' '}
            <span className="bg-gradient-to-r from-amber-600 via-orange-500 to-amber-500 bg-clip-text text-transparent dark:from-amber-200 dark:via-orange-300 dark:to-amber-400">
              Questions
            </span>
          </h2>

          {/* Subtitle */}
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base max-w-xl mx-auto">
            Find answers to the most common questions about Meditiya Sathi and our
            community.
          </p>
        </motion.div>

        {/* =====================================================
            FAQ ACCORDION
        ====================================================== */}
        <div className="mx-auto max-w-3xl space-y-3.5 sm:space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;

            return (
              <motion.div
                key={faq.question}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.04,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 ${
                  isOpen
                    ? 'border-amber-400/40 bg-card shadow-lg shadow-amber-500/[0.04] dark:border-amber-300/35 dark:bg-white/[0.05]'
                    : 'border-border/70 bg-card/60 hover:border-amber-400/30 hover:bg-card/90 dark:border-white/[0.08] dark:bg-white/[0.025] dark:hover:border-white/[0.16] dark:hover:bg-white/[0.04]'
                }`}
              >
                <h3 className="m-0 p-0 text-base font-normal">
                  <button
                    type="button"
                    onClick={() => toggleQuestion(index)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-answer-${index}`}
                    id={`faq-question-${index}`}
                    className="flex w-full items-center justify-between gap-4 p-5 sm:p-6 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background cursor-pointer"
                  >
                    <span
                      className={`text-base sm:text-lg font-serif font-medium tracking-tight transition-colors duration-200 ${
                        isOpen
                          ? 'text-amber-600 dark:text-amber-300'
                          : 'text-foreground dark:text-white/90 group-hover:text-amber-600 dark:group-hover:text-amber-300'
                      }`}
                    >
                      {faq.question}
                    </span>

                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
                        isOpen
                          ? 'border-amber-400/40 bg-amber-400/10 text-amber-500 dark:border-amber-300/40 dark:bg-amber-300/10 dark:text-amber-300 rotate-45'
                          : 'border-border bg-background/50 text-muted-foreground group-hover:border-amber-400/40 group-hover:text-amber-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/60 dark:group-hover:border-amber-300/40 dark:group-hover:text-amber-300'
                      }`}
                      aria-hidden="true"
                    >
                      <Plus className="h-4 w-4 transition-transform duration-300" />
                    </div>
                  </button>
                </h3>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={`faq-answer-${index}`}
                      role="region"
                      aria-labelledby={`faq-question-${index}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{
                        height: 'auto',
                        opacity: 1,
                        transition: {
                          height: { duration: 0.32, ease: [0.04, 0.62, 0.23, 0.98] },
                          opacity: { duration: 0.22, delay: 0.08 },
                        },
                      }}
                      exit={{
                        height: 0,
                        opacity: 0,
                        transition: {
                          height: { duration: 0.24, ease: [0.04, 0.62, 0.23, 0.98] },
                          opacity: { duration: 0.12 },
                        },
                      }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-border/60 px-5 pb-5 pt-4 text-sm leading-relaxed text-muted-foreground sm:px-6 sm:pb-6 sm:text-base dark:border-white/[0.06] dark:text-white/70">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* =====================================================
            FOOTER HELP CALLOUT
        ====================================================== */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mt-12 text-center"
        >
          <p className="text-sm text-muted-foreground">
            Still have questions?{' '}
            <Link
              href="/contact"
              className="inline-flex items-center gap-1 font-semibold text-amber-600 underline underline-offset-4 transition-colors hover:text-amber-500 dark:text-amber-300 dark:hover:text-amber-200"
            >
              Contact the Meditiya Sathi team
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
