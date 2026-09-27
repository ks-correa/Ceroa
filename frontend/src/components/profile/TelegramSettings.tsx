import { useState } from 'react';
import { apiRequest } from '../../services/api';
type Status = { enabled: boolean; linked: boolean; botUsername: string; linkedAt: string | null };
export const TelegramSettings = () => {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [invitation, setInvitation] = useState<{url: string; expiresAt: string} | null>(null);
  const [error, setError] = useState('');
  const run = async (work: () => Promise<void>) => {
    setBusy(true); setError('');
    try { await work(); } catch (e) { setError(e instanceof Error ? e.message : 'No fue posible conectar Telegram.'); }
    finally { setBusy(false); }
  };
  const refresh = async () => { const next = await apiRequest<Status>('/integrations/telegram'); setStatus(next); if(next.linked) setInvitation(null); };
  return <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4">
    <h2 className="font-bold">Telegram</h2>
    <p className="text-sm text-slate-500">Consulta tus finanzas por texto o nota de voz desde el bot de Ceroa.</p>
    <button type="button" disabled={busy} className="underline text-teal-700 dark:text-cyan-400" onClick={() => void run(refresh)}>{status ? 'Actualizar conexión' : 'Configurar Telegram'}</button>
    {status && (!status.enabled ? <p>El bot todavía no está configurado.</p> : status.linked ? <>
      <p role="status">Tu cuenta está vinculada a Telegram.</p>
      <button disabled={busy} type="button" className="underline text-red-600" onClick={() => void run(async () => {
        await apiRequest<void>('/integrations/telegram', {method: 'DELETE'}); setInvitation(null); await refresh();
      })}>Desvincular Telegram</button>
    </> : <>
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={consent} disabled={busy} onChange={e => setConsent(e.target.checked)} />
        Autorizo consultar mis datos financieros desde mi chat privado de Telegram. Las preguntas y respuestas pasarán por Telegram.</label>
      <button disabled={busy || !consent} type="button" className="rounded-xl bg-teal-700 text-white px-4 py-2 disabled:opacity-50" onClick={() => void run(async () => {
        setInvitation(await apiRequest<{url: string; expiresAt: string}>('/integrations/telegram', {method: 'POST', body: JSON.stringify({consent: true})}));
      })}>Crear enlace de vinculación</button>
      {invitation && <div className="space-y-2">
        <a className="block underline text-teal-700 dark:text-cyan-400" href={invitation.url} target="_blank" rel="noreferrer">Abrir Telegram y vincular mi cuenta</a>
        <p className="text-xs text-slate-500">Pulsa Iniciar en el bot. Este enlace vence en cinco minutos y solo se usa una vez. No lo compartas.</p>
      </div>}
    </>)}
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
  </section>;
};
