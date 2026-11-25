export type BookingCancellation = { code:string;confirmationCode:string;start:string };
export function BookingCancellationPanel({proposal,disabled,onAction}:{proposal:BookingCancellation;disabled:boolean;onAction:(message:string)=>void}){
  const date=new Intl.DateTimeFormat('es-CO',{timeZone:'America/Bogota',dateStyle:'full',timeStyle:'short'}).format(new Date(proposal.start));
  return <section aria-label="Confirmar cancelación de asesoría" className="mt-3 space-y-3 rounded-xl border border-rose-300 p-3 text-sm">
    <p className="font-semibold">¿Quieres cancelar esta asesoría?</p>
    <p>{date} · hora de Bogotá</p>
    <p className="break-all text-xs">Reserva: {proposal.code}</p>
    <p>Tu reserva sigue activa. Pulsa Confirmar cancelación para solicitar su eliminación de Google Calendar.</p>
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={disabled} className="rounded-lg bg-rose-700 px-3 py-2 font-semibold text-white disabled:opacity-50" onClick={()=>onAction('Confirmar cancelacion '+proposal.code+' '+proposal.confirmationCode)}>Confirmar cancelación</button>
      <button type="button" disabled={disabled} className="rounded-lg border border-slate-400 px-3 py-2 disabled:opacity-50" onClick={()=>onAction('No cancelar asesoria '+proposal.code)}>Conservar asesoría</button>
    </div>
  </section>;
}
