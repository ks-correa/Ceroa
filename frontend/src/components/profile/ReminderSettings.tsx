import { useState } from 'react';
import { apiRequest } from '../../services/api';
type Settings = {enabled: boolean; linked: boolean; plus: boolean; reminders: boolean; briefing: boolean; cadence: string; hour: number; timezone: string};
type Delivery = {id: string; kind: string; status: string; attempts: number; sentAt: string | null};
const labels: Record<string,string> = {PENDING:'Pendiente',RETRY:'Pendiente de reintento',RESERVED:'Pendiente',DISPATCHING:'En proceso',SENT:'Enviado',INVALIDATED:'Invalidado',FAILED:'Fallido',AMBIGUOUS:'Entrega sin confirmar'};
export const ReminderSettings = () => {
  const [settings,setSettings]=useState<Settings|null>(null);
  const [history,setHistory]=useState<Delivery[]>([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [saved,setSaved]=useState(false);
  const run=async(work:()=>Promise<void>)=>{setBusy(true);setError('');setSaved(false);try{await work();}catch(e){setError(e instanceof Error?e.message:'No fue posible actualizar los avisos.');}finally{setBusy(false);}};
  const load=async()=>{const [next,deliveries]=await Promise.all([apiRequest<Settings>('/integrations/telegram/reminders'),apiRequest<Delivery[]>('/integrations/telegram/deliveries')]);setSettings(next);setHistory(deliveries);};
  const authorized=Boolean(settings?.enabled&&settings?.linked&&settings?.plus);
  return <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4">
    <h2 className="font-bold">Avisos y resumen por Telegram</h2>
    <p className="text-sm text-slate-500">Autoriza por separado los recordatorios de vencimiento y tu resumen financiero. Los mensajes incluyen datos financieros y llegan a tu chat privado.</p>
    <button type="button" disabled={busy} className="min-h-11 underline text-teal-700 dark:text-cyan-400" onClick={()=>void run(load)}>{settings?'Actualizar avisos':'Configurar avisos'}</button>
    {settings&&<>
      {!settings.enabled&&<p>La programación todavía no está habilitada.</p>}
      {!settings.linked&&<p>Vincula Telegram para autorizar los envíos.</p>}
      {!settings.plus&&<p>Los envíos automáticos requieren Ceroa Plus. Los avisos dentro de Ceroa siguen disponibles.</p>}
      <fieldset disabled={busy} className="space-y-3">
        <label className="flex items-start gap-3 min-h-11 text-sm"><input type="checkbox" disabled={!authorized&&!settings.reminders} checked={settings.reminders} onChange={e=>setSettings({...settings,reminders:e.target.checked})}/><span>Autorizo recordatorios por Telegram a 7 días, 3 días y el día del vencimiento.</span></label>
        <label className="flex items-start gap-3 min-h-11 text-sm"><input type="checkbox" disabled={!authorized&&!settings.briefing} checked={settings.briefing} onChange={e=>setSettings({...settings,briefing:e.target.checked})}/><span>Autorizo recibir mi resumen financiero por Telegram.</span></label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="space-y-1 text-sm"><span className="block">Frecuencia del resumen</span><select className="w-full min-h-11 rounded-xl border p-2 bg-transparent" value={settings.cadence} onChange={e=>setSettings({...settings,cadence:e.target.value})}><option value="WEEKLY">Semanal, los lunes</option><option value="MONTHLY">Mensual, el día 1</option></select></label>
          <label className="space-y-1 text-sm"><span className="block">Hora de Colombia</span><select className="w-full min-h-11 rounded-xl border p-2 bg-transparent" value={settings.hour} onChange={e=>setSettings({...settings,hour:Number(e.target.value)})}>{Array.from({length:24},(_,hour)=><option key={hour} value={hour}>{String(hour).padStart(2,'0')}:00</option>)}</select></label>
        </div>
        <p className="text-xs text-slate-500">Puedes retirar tu autorización cuando quieras. La programación funciona mientras el servidor de n8n esté encendido.</p>
        <button type="button" className="min-h-11 rounded-xl bg-teal-700 text-white px-4 py-2 disabled:opacity-50" onClick={()=>void run(async()=>{setSettings(await apiRequest<Settings>('/integrations/telegram/reminders',{method:'PUT',body:JSON.stringify({reminders:settings.reminders,briefing:settings.briefing,cadence:settings.cadence,hour:settings.hour})}));setSaved(true);})}>Guardar preferencias</button>
      </fieldset>
      {history.length>0&&<div className="space-y-2"><h3 className="font-medium">Últimas entregas</h3><ul className="space-y-2 text-sm">{history.map(d=><li key={d.id} className="flex flex-wrap justify-between gap-2 border-b py-2"><span>{d.kind==='BRIEFING'?'Resumen financiero':'Recordatorio'}</span><span>{labels[d.status]||'Estado no disponible'}{d.sentAt?` · ${new Date(d.sentAt).toLocaleString('es-CO',{timeZone:'America/Bogota'})}`:''}</span></li>)}</ul></div>}
    </>}
    {saved&&<p role="status" className="text-sm text-teal-700">Preferencias guardadas.</p>}
    {error&&<p role="alert" className="text-sm text-red-600">{error}</p>}
  </section>;
};
