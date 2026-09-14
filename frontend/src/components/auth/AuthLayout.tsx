import { ReactNode } from 'react';
import { CeroaLogo } from '../common/CeroaLogo';
import { DesktopOnboardingPanel } from '../onboarding/DesktopOnboardingPanel';
export const AuthLayout = ({ title, children }: { title: string; children: ReactNode }) =>
  <main className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex items-center justify-center p-4 sm:p-6 md:p-10">
    <div className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden grid grid-cols-1 lg:grid-cols-2">
      <DesktopOnboardingPanel />
      <section className="p-6 sm:p-10 min-w-0">
        <div className="mb-6"><CeroaLogo size="md" /><h1 className="mt-4 text-2xl font-bold">{title}</h1></div>
        {children}
      </section>
    </div>
  </main>;
export const submitClass = 'w-full rounded-xl bg-[var(--ceroa-primary)] hover:bg-[var(--ceroa-primary-hover)] text-white p-3 font-semibold disabled:opacity-60 disabled:cursor-wait';
