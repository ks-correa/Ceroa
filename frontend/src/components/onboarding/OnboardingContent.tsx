import React from 'react';
import { BarChart3, Calculator, ListChecks, Route } from 'lucide-react';
import { ONBOARDING_FEATURES } from './onboarding.constants';

const icons = [ListChecks, Route, BarChart3, Calculator];

interface OnboardingContentProps {
  compact?: boolean;
}

export const OnboardingContent: React.FC<OnboardingContentProps> = ({ compact = false }) => (
  <div className="relative z-10">
    <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">Conoce Ceroa</p>
    <h1 className={`${compact ? 'mt-2 text-2xl' : 'mt-3 text-3xl xl:text-4xl'} font-extrabold leading-tight text-white`}>
      Claridad para avanzar hacia tu tranquilidad financiera
    </h1>
    <p className={`${compact ? 'mt-2 text-sm' : 'mt-4 text-sm'} leading-relaxed text-cyan-50`}>
      Organiza tus obligaciones, define una estrategia de pago y acompaña cada avance desde un solo lugar.
    </p>

    <ul className={`${compact ? 'mt-5 gap-3' : 'mt-8 gap-4'} grid`} aria-label="Principales capacidades de Ceroa">
      {ONBOARDING_FEATURES.map((feature, index) => {
        const Icon = icons[index];
        return (
          <li key={feature.title} className="flex gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10" aria-hidden="true">
              <Icon className="h-4 w-4 text-cyan-200" />
            </span>
            <span>
              <span className="block text-sm font-bold text-white">{feature.title}</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-cyan-50/90">{feature.description}</span>
            </span>
          </li>
        );
      })}
    </ul>
  </div>
);
