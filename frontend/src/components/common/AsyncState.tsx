import React from 'react';

export const FullPageLoadingState: React.FC = () => (
  <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center" role="status" aria-label="Comprobando sesión">
    <div className="w-9 h-9 rounded-full border-4 border-slate-200 border-t-[var(--ceroa-primary)] animate-spin" />
  </div>
);

export const ContentLoadingState: React.FC = () => (
  <div role="status" className="max-w-xl mx-auto mt-16 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center">
    <div className="w-8 h-8 mx-auto rounded-full border-4 border-slate-200 border-t-[var(--ceroa-primary)] animate-spin" />
    <p className="mt-4 text-sm font-semibold text-slate-600 dark:text-slate-300">Cargando tu información financiera...</p>
  </div>
);

interface ContentErrorStateProps {
  message: string;
  onRetry: () => void;
}

export const ContentErrorState: React.FC<ContentErrorStateProps> = ({ message, onRetry }) => (
  <div role="alert" className="max-w-xl mx-auto mt-16 rounded-2xl border border-rose-200 dark:border-rose-900 bg-white dark:bg-slate-900 p-8 text-center">
    <h2 className="text-lg font-bold text-slate-900 dark:text-white">No pudimos cargar tus datos</h2>
    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{message}</p>
    <button onClick={onRetry} className="mt-5 px-5 py-2.5 rounded-xl bg-[var(--ceroa-primary)] hover:bg-[var(--ceroa-primary-hover)] text-white text-sm font-bold">Reintentar</button>
  </div>
);
