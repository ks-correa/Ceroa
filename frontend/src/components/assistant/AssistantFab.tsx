import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Mic, Square, X, Send } from 'lucide-react';
import { apiRequest } from '../../services/api';

type ChatMessage = { role: 'user' | 'assistant'; text: string };
const LIMIT = 4 * 1024 * 1024;
export function AssistantFab() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [recording, setRecording] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);
  const generation = useRef(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false; generation.current++;
      if (timer.current) clearTimeout(timer.current);
      if (recorder.current?.state === 'recording') recorder.current.stop();
      stream.current?.getTracks().forEach(t => t.stop());
    };
  }, []);
  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  async function send(message?: string, blob?: Blob) {
    if (busy || (!message && !blob)) return;
    const turn = generation.current;
    setBusy(true); setError('');
    try {
      if (blob && (blob.size > LIMIT || !blob.size)) throw new Error('El audio debe tener contenido y pesar menos de 4 MB.');
      let audio: string | undefined;
      if (blob) audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]);
        reader.onerror = () => reject(new Error('No pude leer el audio.')); reader.readAsDataURL(blob);
      });
      if (!alive.current || generation.current !== turn) return;
      setMessages(m => [...m, { role: 'user' as const, text: message || 'Consulta por audio' }].slice(-20));
      setText('');
      const result = await apiRequest<{ answer: string }>('/assistant/messages', {
        method: 'POST', body: JSON.stringify(blob ? { audio, mime: blob.type.split(';')[0] } : { message })
      });
      if (alive.current && generation.current === turn) setMessages(m => [...m, { role: 'assistant' as const, text: result.answer }].slice(-20));
    } catch (cause) {
      if (alive.current && generation.current === turn) setError(cause instanceof Error ? cause.message : 'No pude procesar la consulta.');
    } finally { if (alive.current && generation.current === turn) setBusy(false); }
  }
  async function record() {
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error('Tu navegador no permite grabar audio. Puedes adjuntar un archivo o escribir.');
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!alive.current) { media.getTracks().forEach(t => t.stop()); return; }
      stream.current = media;
      const mime = ['audio/webm', 'audio/ogg', 'audio/mp4'].find(m => MediaRecorder.isTypeSupported(m));
      const instance = new MediaRecorder(media, mime ? { mimeType: mime } : undefined);
      recorder.current = instance; const chunks: Blob[] = []; let bytes = 0; let oversized = false;
      instance.ondataavailable = event => { bytes += event.data.size; if (bytes > LIMIT) { oversized = true; if (instance.state === 'recording') instance.stop(); } else chunks.push(event.data); };
      instance.onstop = () => {
        media.getTracks().forEach(t => t.stop()); if (timer.current) clearTimeout(timer.current);
        if (!alive.current) return;
        setRecording(false);
        if (oversized) setError('El audio supera 4 MB. Graba una consulta más corta.');
        else void send(undefined, new Blob(chunks, { type: instance.mimeType }));
      };
      instance.start(500); setRecording(true); setError('');
      timer.current = setTimeout(() => { if (instance.state === 'recording') instance.stop(); }, 60000);
    } catch (cause) { stream.current?.getTracks().forEach(t => t.stop()); setError(cause instanceof Error ? cause.message : 'No pude acceder al micrófono.'); }
  }
  function close() {
    if (timer.current) clearTimeout(timer.current);
    if (recorder.current?.state === 'recording') { recorder.current.onstop = null; recorder.current.stop(); }
    stream.current?.getTracks().forEach(t => t.stop());
    setRecording(false); setOpen(false);
  }
  return <div className="fixed bottom-20 right-4 lg:bottom-6 z-40">
    {open && <section aria-label="Asistente financiero" className="mb-3 flex max-h-[70vh] w-[calc(100vw-2rem)] max-w-sm flex-col rounded-2xl border bg-white dark:bg-slate-900 shadow-xl">
      <div className="flex items-center justify-between border-b p-4"><h2 className="font-semibold">Asistente de Ceroa</h2><button type="button" aria-label="Cerrar asistente" onClick={close}><X size={20} /></button></div>
      <p className="px-4 pt-3 text-sm text-slate-500">Consulta deudas, pagos, vencimientos, estrategia o progreso. Las preguntas y el audio se procesan con Gemini.</p>
      <div role="log" aria-live="polite" className="min-h-24 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => <p key={i} className={`whitespace-pre-wrap rounded-lg p-3 text-sm ${m.role === 'user' ? 'bg-teal-50 dark:bg-teal-950' : 'bg-slate-100 dark:bg-slate-800'}`}><strong>{m.role === 'user' ? 'Tú: ' : 'Ceroa: '}</strong>{m.text}</p>)}
        {busy && <p role="status">Consultando…</p>}
        {error && <p role="alert" className="text-red-700 dark:text-red-400">{error}</p>}
      </div>
      <form className="border-t p-3 space-y-2" onSubmit={e => { e.preventDefault(); void send(text.trim()); }}>
        <div className="flex gap-2"><input ref={input} aria-label="Pregunta al asistente" maxLength={2000} value={text} onChange={e => setText(e.target.value)} disabled={busy || recording} placeholder="¿Cuál es mi estrategia activa?" className="min-w-0 flex-1 rounded border p-2 dark:bg-slate-800" /><button aria-label="Enviar pregunta" disabled={busy || recording || !text.trim()} className="rounded bg-teal-700 p-2 text-white disabled:opacity-50"><Send size={18} /></button></div>
        <div className="flex items-center gap-3 text-sm"><button type="button" disabled={busy} aria-label={recording ? 'Enviar grabación' : 'Grabar audio'} onClick={() => recording ? recorder.current?.stop() : void record()} className="flex gap-1 items-center">{recording ? <Square size={16} /> : <Mic size={16} />}{recording ? 'Terminar y enviar' : 'Grabar'}</button>
          <label className="cursor-pointer">Adjuntar audio<input aria-label="Adjuntar audio" type="file" accept="audio/webm,audio/ogg,audio/wav,audio/mpeg,audio/mp4" className="sr-only" disabled={busy || recording} onChange={e => { const file = e.target.files?.[0]; if (file) void send(undefined, file); e.target.value = ''; }} /></label>
        </div>
      </form>
    </section>}
    <button type="button" aria-label="Abrir asistente financiero" aria-expanded={open} onClick={() => open ? close() : setOpen(true)} className="ml-auto flex rounded-full bg-teal-700 p-4 text-white shadow-lg"><MessageCircle size={24} /></button>
  </div>;
}
