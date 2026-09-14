import React from 'react';
import { OnboardingContent } from './OnboardingContent';

export const DesktopOnboardingPanel: React.FC = () => (
  <section className="relative hidden h-full overflow-hidden bg-gradient-to-br from-[#004D5A] via-[#006A7C] to-[var(--ceroa-primary)] p-10 text-white lg:flex lg:flex-col lg:justify-center xl:p-12" aria-label="Información sobre Ceroa">
    <div className="pointer-events-none absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]" />
    <div className="pointer-events-none absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl" />
    <OnboardingContent />
  </section>
);
