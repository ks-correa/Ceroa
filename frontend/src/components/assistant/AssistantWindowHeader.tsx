import { Info, Maximize2, Minimize2, MessageCircle, RotateCcw, X } from 'lucide-react';
export function AssistantWindowHeader({ disabled, mobile, maximized, onReset, onMaximize, onClose, onInfo, infoOpen }: {
  disabled: boolean; mobile: boolean; maximized: boolean; onReset: () => void; onMaximize: () => void; onClose: () => void; onInfo: () => void; infoOpen: boolean;
}) {
  const controls = [
    { label: 'Sobre el asistente y tus datos', icon: Info, action: onInfo },
    { label: 'Nueva conversación', icon: RotateCcw, action: onReset, disabled },
    ...mobile ? [] : [{ label: maximized ? 'Restaurar tamaño anterior' : 'Maximizar ventana', icon: maximized ? Minimize2 : Maximize2, action: onMaximize }],
    { label: 'Cerrar asistente', icon: X, action: onClose },
  ];
  return <header className="assistant-window-header shrink-0 bg-gradient-to-r from-teal-800 to-cyan-700 text-white">
    <div className="flex min-w-0 items-center gap-2"><MessageCircle size={22} className="shrink-0" aria-hidden="true" /><div className="min-w-0"><h2 className="text-sm font-semibold">Asistente de Ceroa</h2><p className="text-xs text-teal-50">{import.meta.env.VITE_DEMO_MODE === 'true' ? 'Demo: datos sintéticos; Calendar y Gmail simulados' : 'Tu espacio para resolver dudas'}</p></div></div>
    <div className="flex shrink-0 items-center">{controls.map(({ label, icon: Icon, action, disabled }) => <button key={label} type="button" title={label} aria-label={label} aria-expanded={label === 'Sobre el asistente y tus datos' ? infoOpen : undefined} aria-controls={label === 'Sobre el asistente y tus datos' ? 'assistant-data-info' : undefined} disabled={disabled} onClick={action} className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/20 disabled:opacity-40"><Icon size={18} aria-hidden="true" /></button>)}</div>
  </header>;
}
