import React from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Header } from './Header';
import { Phone } from 'lucide-react';
import { ScheduleCompanion } from './ScheduleCompanion';

export const Layout: React.FC = () => {
  return (
    <div className="flex min-h-screen flex-col bg-bg text-text transition-colors duration-300">
      <Header />
      <ScheduleCompanion />
      <main className="flex-1 px-3 py-4 sm:px-4 sm:py-6 md:px-8 md:py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="mx-auto w-full max-w-6xl"
        >
          <Outlet />
        </motion.div>
      </main>
      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 pb-20 pt-5 text-xs text-muted sm:py-5 md:flex-row md:items-center md:justify-between md:px-8">
          <div className="flex items-start gap-2 font-medium leading-relaxed text-wellness-sage-500 sm:items-center">
            <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 sm:mt-0" />
            <span>Crisis Support: Emergency <strong>999</strong> · Samaritans of Singapore <strong>1767</strong> · SOS CareText <strong>9151 1767</strong></span>
          </div>
          <p className="text-muted/80">Talk.ItOut is a support tool, not a crisis service or medical provider.</p>
        </div>
      </footer>
    </div>
  );
};
