import { useState } from 'react';
import { apiRequest } from '../../services/api';

export type BookingAvailability = {
  status: string; message: string; timezone: string; minDate: string; maxDate: string;
  slots: { start: string; end: string }[];
};
type Proposal = { code: string; start: string; status: string };
const format = (date: string) => new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota', weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
}).format(new Date(date));

export function BookingAvailabilityPanel({ initial, disabled, onConfirm }: {
  initial: BookingAvailability; disabled: boolean; onConfirm: (code: string) => void;
}) {
  const [availability, setAvailability] = useState(initial);
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [proposal, setProposal] = useState<Proposal | null>(null);
  async function search() {
    setLoading(true); setError(''); setProposal(null);
    try { setAvailability(await apiRequest<BookingAvailability>('/support/bookings/slots' + (date ? '?date=' + date : ''))); }
    catch { setError('No pude consultar la agenda. Vuelve a intentar con esta fecha. No se ha reservado nada.'); }
    finally { setLoading(false); }
  }
  async function select(start: string) {
    setLoading(true); setError(''); setProposal(null);
    try { setProposal(await apiRequest<Proposal>('/support/bookings', { method: 'POST', body: JSON.stringify({ start }) })); }
    catch { setError('No pude proponer ese horario; puede haber cambiado la disponibilidad. Consulta la agenda de nuevo.'); }
    finally { setLoading(false); }
  }
  return <section aria-label="Horarios de asesoría" className="space-y-3 rounded-xl border border-teal-300 bg-white p-3 text-sm dark:bg-slate-900">
    <p className="font-semibold">Asesoría · hora de Bogotá · 30 minutos</p>
    <label className="block">Fecha de la asesoría<input type="date" aria-label="Fecha de la asesoría" min={availability.minDate} max={availability.maxDate} value={date} onChange={e => setDate(e.target.value)} disabled={loading || disabled} className="mt-1 block rounded border p-2 dark:bg-slate-800" /></label>
    <button type="button" disabled={loading || disabled} onClick={() => void search()} className="font-semibold underline">Consultar disponibilidad</button>
    <p>{availability.message}</p>
    <div className="flex flex-wrap gap-2">{availability.slots.map(slot => <button type="button" key={slot.start} disabled={loading || disabled} onClick={() => void select(slot.start)} className="rounded-lg border border-teal-500 p-2 disabled:opacity-50">{format(slot.start)}</button>)}</div>
    {proposal && <div className="space-y-2 border-t pt-2"><p>Horario elegido: {format(proposal.start)}. La propuesta vence en diez minutos. Todavía no está reservado.</p><button type="button" disabled={loading || disabled} className="rounded-lg bg-teal-700 p-2 text-white" onClick={() => onConfirm(proposal.code)}>Confirmar asesoría</button></div>}
    {loading && <p role="status">Consultando Google Calendar…</p>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
  </section>;
}
