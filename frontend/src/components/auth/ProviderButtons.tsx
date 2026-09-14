import { useState } from 'react';
import { authService } from '../../services/authService';
export const ProviderButtons = ({ disabled = false, onStart, onBusyChange }: { disabled?: boolean; onStart?: () => void; onBusyChange?: (busy: boolean) => void }) => {
  const [loading, setLoading] = useState('');
  const [error, setError] = useState('');
  const start = async (provider: 'google' | 'microsoft') => {
    if (loading) return;
    setLoading(provider); setError(''); onStart?.(); onBusyChange?.(true);
    try { await authService.startExternal(provider); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No fue posible conectar con el proveedor.'); setLoading(''); onBusyChange?.(false); }
  };
  return <div className="space-y-3 mt-5">
    <p className="text-center text-sm text-slate-500">O continúa con tu cuenta</p>
    {(['google', 'microsoft'] as const).map(provider => <button key={provider} type="button" disabled={disabled || Boolean(loading)}
      onClick={() => void start(provider)} className="w-full rounded-xl border border-slate-300 dark:border-slate-600 p-3 font-semibold disabled:opacity-60">
      {loading === provider ? 'Conectando…' : 'Continuar con ' + (provider === 'google' ? 'Google' : 'Microsoft')}
    </button>)}
    {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
  </div>;
};
