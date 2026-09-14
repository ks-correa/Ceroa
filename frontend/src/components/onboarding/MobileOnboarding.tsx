import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { OnboardingContent } from './OnboardingContent';

interface MobileOnboardingProps {
  open: boolean;
  onDismiss: () => void;
}

export const MobileOnboarding: React.FC<MobileOnboardingProps> = ({ open, onDismiss }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onDismiss();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const controls = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'));
      if (!controls.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      previousFocus?.focus();
    };
  }, [open, onDismiss]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end bg-slate-950/70 p-3 backdrop-blur-sm sm:items-center sm:justify-center lg:hidden" role="presentation">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="mobile-onboarding-title" aria-describedby="mobile-onboarding-description" className="relative max-h-[calc(100dvh-1.5rem)] w-full overflow-y-auto rounded-3xl bg-gradient-to-br from-[#004D5A] via-[#006A7C] to-[var(--ceroa-primary)] p-6 shadow-2xl sm:max-w-lg sm:p-8">
        <button ref={closeRef} type="button" onClick={onDismiss} aria-label="Cerrar introducción" className="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white outline-none hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-teal-800">
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
        <div id="mobile-onboarding-title" className="sr-only">Introducción a Ceroa</div>
        <div id="mobile-onboarding-description">
          <OnboardingContent compact />
        </div>
        <button type="button" onClick={onDismiss} className="relative z-10 mt-6 min-h-11 w-full rounded-xl bg-white px-4 py-3 text-sm font-bold text-teal-800 outline-none hover:bg-cyan-50 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-teal-800">
          Omitir y continuar a iniciar sesión
        </button>
      </div>
    </div>
  );
};
