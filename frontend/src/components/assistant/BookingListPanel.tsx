export type BookingList = {
  items: { code: string; status: string; start: string; end: string; canCancel: boolean }[];
  total: number; nextPage: number | null;
};
const states: Record<string,string> = {
  PROPOSED:'Pendiente de confirmar',EXPIRED:'Propuesta vencida',CONFIRMED:'Confirmada',CANCELLED:'Cancelada',
  PENDING_MEET:'Pendiente del enlace de Meet',CREATING:'Creando reserva',AMBIGUOUS:'Requiere verificar la reserva',
  CANCELLING:'Cancelación en curso',CANCEL_AMBIGUOUS:'Requiere verificar la cancelación',CONFLICT:'Horario no disponible',
};
const format = (value:string) => new Intl.DateTimeFormat('es-CO', {
  timeZone:'America/Bogota',dateStyle:'medium',timeStyle:'short',
}).format(new Date(value));
export function BookingListPanel({list,disabled,onAction}:{list:BookingList;disabled:boolean;onAction:(message:string)=>void}){
  return <section aria-label="Mis asesorías" className="space-y-3 rounded-xl border border-teal-300 p-3 text-sm">
    <p className="font-semibold">Tus asesorías · hora de Bogotá</p>
    <p className="text-xs">Estado registrado en Ceroa. Selecciona una reserva para consultar su estado o solicitar su cancelación.</p>
    {list.items.map(booking=><article key={booking.code} aria-label={`Asesoría ${booking.code}`} className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
      <p className="font-semibold">{format(booking.start)}</p>
      <p>{states[booking.status]||booking.status}</p>
      <p className="break-all text-xs">Código: {booking.code}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={disabled} className="rounded-lg border border-teal-600 px-3 py-2 disabled:opacity-50" onClick={()=>onAction('Consultar asesoria '+booking.code)}>Consultar estado</button>
        {booking.canCancel&&<button type="button" disabled={disabled} className="rounded-lg border border-rose-600 px-3 py-2 text-rose-700 disabled:opacity-50" onClick={()=>onAction('Cancelar asesoria '+booking.code)}>Solicitar cancelación</button>}
      </div>
    </article>)}
    {list.nextPage!==null&&<button type="button" disabled={disabled} className="font-semibold underline disabled:opacity-50" onClick={()=>onAction('Ver mas asesorias '+list.nextPage)}>Ver más asesorías</button>}
  </section>;
}
