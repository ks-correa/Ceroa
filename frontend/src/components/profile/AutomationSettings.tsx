import { useState } from 'react';
import { AutomationCredential, automationService } from '../../services/automationService';

export const AutomationSettings = () => {
  const [open, setOpen] = useState(false);
  const [credentials, setCredentials] = useState<AutomationCredential[]>([]);
  const [name, setName] = useState('n8n');
  const [days, setDays] = useState(30);
  const [allowWrites, setAllowWrites] = useState(false);
  const [issuedToken, setIssuedToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const run = async (action: () => Promise<void>) => {
    setBusy(true); setMessage('');
    try { await action(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'No fue posible gestionar la credencial.'); }
    finally { setBusy(false); }
  };

  return <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4">
    <h2 className="font-bold">Automatizaciones</h2>
    <p className="text-sm text-slate-500">Conecta n8n con tu cuenta para consultar o gestionar tus finanzas.</p>
    <button type="button" className="text-teal-700 dark:text-cyan-400 underline" disabled={busy}
      onClick={() => {
        if (open) { setOpen(false); setIssuedToken(''); }
        else { setOpen(true); void run(async () => setCredentials(await automationService.list())); }
      }}>{open ? 'Cerrar automatizaciones' : 'Configurar automatizaciones'}</button>
    {open && <>
      <form className="space-y-3" onSubmit={event => {
        event.preventDefault();
        void run(async () => {
          const issued = await automationService.create(name.trim(), allowWrites, days);
          setIssuedToken(issued.token);
          setCredentials(items => [issued.credential, ...items]);
        });
      }}>
        <label className="block text-sm">Nombre de la conexión
          <input className="block w-full rounded-lg border p-2 bg-transparent" value={name} maxLength={80} required
            onChange={event => setName(event.target.value)} disabled={busy} />
        </label>
        <label className="block text-sm">Caducidad en días
          <input className="block w-full rounded-lg border p-2 bg-transparent" type="number" min={1} max={90} required
            value={days} onChange={event => setDays(Number(event.target.value))} disabled={busy} />
        </label>
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={allowWrites} disabled={busy}
          onChange={event => setAllowWrites(event.target.checked)} />Permitir crear, editar y eliminar información financiera</label>
        <p className="text-xs text-slate-500">Sin este permiso, la conexión solo puede consultar tus datos.</p>
        <button type="submit" disabled={busy || !name.trim()} className="rounded-xl bg-teal-700 text-white px-4 py-2 disabled:opacity-50">
          {busy ? 'Procesando…' : 'Crear credencial'}
        </button>
      </form>
      {issuedToken && <div className="rounded-xl border border-amber-300 p-3 space-y-2">
        <p className="text-sm">Copia esta credencial ahora: solo se muestra al crearla. Guárdala en Credentials de n8n.</p>
        <textarea aria-label="Credencial creada" className="w-full font-mono text-xs bg-transparent" value={issuedToken} readOnly />
        <button type="button" className="underline text-sm" onClick={() => void run(async () => {
          await navigator.clipboard.writeText(issuedToken); setMessage('Credencial copiada.');
        })}>Copiar credencial</button>
        <button type="button" className="underline text-sm ml-4" onClick={() => setIssuedToken('')}>Ocultar credencial</button>
      </div>}
      <ul className="space-y-3">
        {credentials.map(credential => {
          const inactive = !!credential.revokedAt || new Date(credential.expiresAt).getTime() <= Date.now();
          return <li key={credential.id} className="border-t pt-3 flex justify-between gap-3 text-sm">
            <div><strong>{credential.name}</strong><p>{inactive ? 'Inactiva' : credential.allowWrites ? 'Lectura y escritura' : 'Solo lectura'}</p>
              <p className="text-xs text-slate-500">Caduca: {new Date(credential.expiresAt).toLocaleDateString('es-CO')}</p></div>
            {!inactive && <button type="button" className="text-red-600 underline" disabled={busy} onClick={() => void run(async () => {
              await automationService.revoke(credential.id); setIssuedToken('');
              setCredentials(await automationService.list());
            })}>Revocar {credential.name}</button>}
          </li>;
        })}
      </ul>
    </>}
    {message && <p role="status" className="text-sm">{message}</p>}
  </section>;
};
