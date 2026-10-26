import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Mic, X, Send, RotateCcw } from 'lucide-react';
import { apiRequest } from '../../services/api';
import { DocumentLibraryPanel, type DocumentView } from './DocumentLibraryPanel';
import { DocumentReferences } from './DocumentReferences';
import type { FinancialDocument } from '../../services/documentLibraryService';

type ChatMessage = { role: 'user' | 'assistant'; text: string; audio?: Blob; documents?: FinancialDocument[] };
const LIMIT = 4 * 1024 * 1024;
function ChatAudio({ blob }: { blob: Blob }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const source = URL.createObjectURL(blob);
    setUrl(source);
    return () => URL.revokeObjectURL(source);
  }, [blob]);
  return <audio aria-label="Audio enviado" controls preload="metadata" src={url || undefined} className="mt-2 w-full" />;
}
export function AssistantFab() {
  const [documentView, setDocumentView] = useState<DocumentView | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<FinancialDocument | null>(null);
  const [chatWidth, setChatWidth] = useState(416);
  const [chatHeight, setChatHeight] = useState(650);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [recording, setRecording] = useState(false);
  const [startingRecording, setStartingRecording] = useState(false);
  const [audioDraft, setAudioDraft] = useState<Blob | null>(null);
  const [audioPreview, setAudioPreview] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);
  const [bars, setBars] = useState<number[]>(Array(24).fill(0));
  const audioContext = useRef<AudioContext | null>(null);
  const meterFrame = useRef<number | null>(null);
  const sendOnStop = useRef(false);
  function stopMeter() {
    if (meterFrame.current !== null) cancelAnimationFrame(meterFrame.current);
    meterFrame.current = null;
    void audioContext.current?.close().catch(() => {});
    audioContext.current = null;
  }
  const recordingAttempt = useRef(0);
  const starting = useRef(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);
  const generation = useRef(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false; generation.current++; recordingAttempt.current++;
      stopMeter();
      if (timer.current) clearTimeout(timer.current);
      if (recorder.current?.state === 'recording') recorder.current.stop();
      stream.current?.getTracks().forEach(t => t.stop());
    };
  }, []);
  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  useEffect(() => {
    if (!audioDraft) { setAudioPreview(''); return; }
    const url = URL.createObjectURL(audioDraft);
    setAudioPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [audioDraft]);
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
      setMessages(m => [...m, { role: 'user' as const, text: message || '', audio: blob }].slice(-20));
      setText('');
      const result = await apiRequest<{ answer: string; documents?: FinancialDocument[] }>('/assistant/messages', {
        method: 'POST', body: JSON.stringify(blob ? { audio, mime: blob.type.split(';')[0], ...(selectedDocument ? { documentId: selectedDocument.id } : {}) } : { message, ...(selectedDocument ? { documentId: selectedDocument.id } : {}) })
      });
      if (alive.current && generation.current === turn) setMessages(m => [...m, { role: 'assistant' as const, text: result.answer, documents: result.documents }].slice(-20));
    } catch (cause) {
      if (alive.current && generation.current === turn) setError(cause instanceof Error ? cause.message : 'No pude procesar la consulta.');
    } finally { if (alive.current && generation.current === turn) setBusy(false); }
  }
  async function record() {
    if (starting.current || recording || busy) return;
    const attempt = ++recordingAttempt.current;
    starting.current = true;
    setStartingRecording(true); setError(''); setAudioDraft(null); setElapsed(0); setLevel(0); sendOnStop.current = false;
    setBars(Array(24).fill(0));
    try {
      if (window.isSecureContext === false) throw new Error('Para grabar, abre Ceroa en http://localhost:3000 o usa una conexión HTTPS.');
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error('Tu navegador no permite grabar audio. Puedes adjuntar un archivo o escribir.');
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!alive.current || attempt !== recordingAttempt.current) { media.getTracks().forEach(t => t.stop()); return; }
      stream.current = media;
      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg', 'audio/mp4'].find(m => MediaRecorder.isTypeSupported(m));
      const instance = new MediaRecorder(media, mime ? { mimeType: mime } : undefined);
      recorder.current = instance; const chunks: Blob[] = []; let bytes = 0; let oversized = false;
      instance.ondataavailable = event => { bytes += event.data.size; if (bytes > LIMIT) { oversized = true; if (instance.state === 'recording') instance.stop(); } else chunks.push(event.data); };
      instance.onstop = () => {
        stopMeter(); media.getTracks().forEach(t => t.stop()); if (timer.current) clearTimeout(timer.current);
        if (!alive.current || attempt !== recordingAttempt.current) return;
        setRecording(false);
        if (oversized) setError('El audio supera 4 MB. Graba una consulta más corta.');
        else {
          const blob = new Blob(chunks, { type: instance.mimeType });
          if (!blob.size) setError('No se capturó audio. Revisa el micrófono y vuelve a grabar.');
          else if (sendOnStop.current) void send(undefined, blob);
          else setAudioDraft(blob);
        }
      };
      instance.start(500); setRecording(true); setError('');
      const began = Date.now();
      let analyser: AnalyserNode | undefined;
      let samples: Uint8Array<ArrayBuffer> | undefined;
      let frequencies: Uint8Array<ArrayBuffer> | undefined;
      try {
        if (typeof AudioContext !== 'undefined') {
          const context = new AudioContext(); audioContext.current = context;
          analyser = context.createAnalyser(); analyser.fftSize = 1024;
          analyser.smoothingTimeConstant = 0.75;
          context.createMediaStreamSource(media).connect(analyser);
          samples = new Uint8Array(analyser.fftSize);
          frequencies = new Uint8Array(analyser.frequencyBinCount);
          void context.resume().catch(() => {});
        }
      } catch { /* The recording can continue if metering is unavailable. */ }
      let lastMeterUpdate = 0;
      const updateMeter = () => {
        if (!alive.current || attempt !== recordingAttempt.current || instance.state !== 'recording') return;
        if (Date.now() - lastMeterUpdate < 50) { meterFrame.current = requestAnimationFrame(updateMeter); return; }
        lastMeterUpdate = Date.now();
        setElapsed(Math.min(60, Math.floor((Date.now() - began) / 1000)));
        if (analyser && samples) {
          analyser.getByteTimeDomainData(samples);
          const rms = Math.sqrt(samples.reduce((sum, value) => sum + ((value - 128) / 128) ** 2, 0) / samples.length);
          setLevel(Math.min(100, Math.round(rms * 400)));
          if (frequencies) {
            analyser.getByteFrequencyData(frequencies);
            const spectrum = frequencies;
            const maxBin = Math.min(spectrum.length, Math.ceil(5000 * analyser.fftSize / analyser.context.sampleRate));
            setBars(Array.from({ length: 24 }, (_, index) => {
              const from = Math.floor(index * maxBin / 24);
              const to = Math.max(from + 1, Math.floor((index + 1) * maxBin / 24));
              let peak = 0;
              for (let bin = from; bin < to; bin++) peak = Math.max(peak, spectrum[bin]);
              return peak / 255;
            }));
          }
        }
        meterFrame.current = requestAnimationFrame(updateMeter);
      };
      updateMeter();
      timer.current = setTimeout(() => {
        if (instance.state === 'recording') { setElapsed(60); instance.stop(); }
      }, 60000);
    } catch (cause) {
      if (!alive.current || attempt !== recordingAttempt.current) return;
      stopMeter(); stream.current?.getTracks().forEach(t => t.stop());
      const name = cause && typeof cause === 'object' && 'name' in cause ? String(cause.name) : '';
      setError(name === 'NotAllowedError' || name === 'PermissionDeniedError'
        ? 'El permiso del micrófono está bloqueado. Permite el micrófono en los permisos del sitio del navegador y vuelve a pulsar Grabar.'
        : name === 'NotFoundError' || name === 'DevicesNotFoundError'
          ? 'No se encontró un micrófono. Conecta uno o adjunta un archivo de audio.'
          : name === 'NotReadableError' || name === 'TrackStartError'
            ? 'No pude usar el micrófono. Revisa si otra aplicación lo está usando y vuelve a intentar.'
            : cause instanceof Error ? cause.message : 'No pude acceder al micrófono.');
    } finally {
      if (alive.current && attempt === recordingAttempt.current) {
        starting.current = false; setStartingRecording(false);
      }
    }
  }
  function submit() {
    if (busy || startingRecording) return;
    if (recording) { sendOnStop.current = true; recorder.current?.stop(); }
    else if (audioDraft) { const blob = audioDraft; setAudioDraft(null); void send(undefined, blob); }
    else void send(text.trim());
  }
  function cancelAudio() {
    recordingAttempt.current++; sendOnStop.current = false; stopMeter();
    if (timer.current) clearTimeout(timer.current);
    if (recorder.current?.state === 'recording') { recorder.current.onstop = null; recorder.current.stop(); }
    stream.current?.getTracks().forEach(t => t.stop());
    setRecording(false); setAudioDraft(null); setElapsed(0); setLevel(0);
  }
  function close() {
    cancelAudio();
    recordingAttempt.current++; starting.current = false; setStartingRecording(false);
    setRecording(false); setOpen(false);
  }
  async function resetConversation() {
    if(busy||recording||startingRecording)return;
    setBusy(true);setError('');
    try{await apiRequest('/assistant/conversation',{method:'DELETE'});if(alive.current){generation.current++;setMessages([]);setText('');setAudioDraft(null);setSelectedDocument(null);}}
    catch(cause){if(alive.current)setError(cause instanceof Error?cause.message:'No pude iniciar otra conversación.');}
    finally{if(alive.current)setBusy(false);}
  }
  return <div className="assistant-launcher fixed right-4 z-40">
    {open && <section aria-label="Asistente financiero" style={{ width: chatWidth, height: chatHeight }} className="floating-assistant-panel flex flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/15 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex shrink-0 items-center justify-between gap-2 bg-gradient-to-r from-teal-800 to-cyan-700 px-4 py-3 text-white"><div className="flex items-center gap-3"><span className="rounded-2xl bg-white/20 p-2"><MessageCircle size={20} /></span><div><h2 className="font-semibold leading-tight">Asistente de Ceroa</h2><p className="text-xs text-teal-50">Tu espacio para resolver dudas</p></div></div><div className="flex items-center gap-1"><button type="button" aria-label="Nueva conversación" title="Nueva conversación" disabled={busy||recording||startingRecording} className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/20 disabled:opacity-40" onClick={()=>void resetConversation()}><RotateCcw size={18}/></button><button type="button" className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/20" aria-label="Cerrar asistente" onClick={close}><X size={20} /></button></div></div>
      <details className="shrink-0 border-b border-slate-100 px-4 py-2 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400"><summary className="cursor-pointer py-1 font-medium">Tamaño del chat</summary><div className="grid grid-cols-2 gap-3 pb-2"><label>Ancho<input aria-label="Ancho del chat" type="range" min="320" max="1000" step="20" value={chatWidth} onChange={e => setChatWidth(Number(e.target.value))} className="block w-full" /></label><label>Alto<input aria-label="Alto del chat" type="range" min="360" max="1000" step="20" value={chatHeight} onChange={e => setChatHeight(Number(e.target.value))} className="block w-full" /></label></div></details>
      <details className="shrink-0 border-b border-slate-100 px-4 py-2 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400"><summary className="cursor-pointer py-1 font-medium">Sobre el asistente y tus datos</summary><p className="pb-2 pt-1 leading-relaxed">Analiza tus finanzas y compara opciones. Gemini procesa tus preguntas, audio y los datos financieros necesarios para responder. Las sugerencias no realizan cambios en tu cuenta.</p></details>
      <div role="log" aria-live="polite" className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain [scrollbar-gutter:stable] bg-slate-50/80 p-4 dark:bg-slate-950/40">
        <nav aria-label="Acciones de documentos" className="flex flex-wrap gap-2">{([{view:'upload',label:'Subir archivo'},{view:'search',label:'Consultar archivos'},{view:'review',label:'Revisar archivos'}] as const).map(item => <button key={item.view} type="button" aria-pressed={documentView === item.view} className={`rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${documentView === item.view ? 'border-teal-700 bg-teal-700 text-white' : 'border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950 dark:text-teal-200'}`} onClick={() => setDocumentView(documentView === item.view ? null : item.view)}>{item.label}</button>)}</nav>
        {selectedDocument && <div className="rounded-xl border border-teal-300 bg-teal-50 p-3 text-sm dark:border-teal-700 dark:bg-teal-950"><p className="font-semibold">Conversación enfocada en este archivo</p><p className="truncate">{selectedDocument.financialEntity || 'Documento'} · {selectedDocument.documentType} · {selectedDocument.periodStart || 'Sin período'}</p><button type="button" className="mt-1 text-xs font-semibold underline" onClick={() => {generation.current++;setSelectedDocument(null);setMessages([]);setText('');}}>Salir del archivo</button></div>}
        {documentView && <DocumentLibraryPanel view={documentView} onDiscuss={document => { if(busy||recording||startingRecording)return;generation.current++;setSelectedDocument(document);setMessages([]);setText('');setDocumentView(null);input.current?.focus(); }} />}
        {messages.length === 0 && <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">Escribe una pregunta para empezar la conversación.</p>}
        {messages.map((m, i) => <div key={i} className={`max-w-[90%] whitespace-pre-wrap rounded-2xl p-3 text-sm shadow-sm ${m.role === 'user' ? 'ml-auto rounded-br-md bg-teal-700 text-white' : 'mr-auto rounded-bl-md border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'}`}><strong className="mb-1 block text-xs opacity-75">{m.role === 'user' ? 'Tú' : 'Ceroa'}</strong>{m.audio ? <ChatAudio blob={m.audio} /> : m.text}{!!m.documents?.length && <DocumentReferences documents={m.documents} />}</div>)}
        {startingRecording && <p role="status">Esperando permiso del micrófono… Revisa la solicitud de permisos del navegador.</p>}
        {(recording || audioDraft) && <div className="rounded-xl bg-teal-50 p-3 dark:bg-teal-950">
          <div className="flex items-center gap-2 text-teal-800 dark:text-teal-200"><Mic size={20} className={recording ? 'animate-pulse' : ''} /><span role="status">{recording ? 'Escuchando…' : 'Audio listo para enviar'} {String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')} / 01:00</span></div>
          {recording && <><div role="meter" aria-label="Nivel del micrófono" aria-valuemin={0} aria-valuemax={100} aria-valuenow={level} className="mt-3 flex h-16 items-center justify-center gap-1 rounded-lg bg-teal-100 px-3 dark:bg-slate-800">{bars.map((height, index) => <span key={index} aria-hidden="true" className="w-1.5 rounded-full bg-teal-600 transition-[height] duration-75 motion-reduce:transition-none dark:bg-teal-400" style={{ height: `${4 + height * 52}px` }} />)}</div><p className="mt-2 text-xs">Habla y pulsa Enviar cuando termines.</p></>}
          {audioDraft && <audio controls src={audioPreview || undefined} className="mt-2 w-full" />}
          <button type="button" onClick={cancelAudio} className="mt-2 text-sm underline">Cancelar audio</button>
        </div>}
        {busy && <p role="status">Consultando…</p>}
        {error && <p role="alert" className="text-red-700 dark:text-red-400">{error}</p>}
      </div>
      <form className="shrink-0 space-y-2 border-t border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900" onSubmit={e => { e.preventDefault(); submit(); }}>
        <div className="flex gap-2"><input ref={input} aria-label="Pregunta al asistente" maxLength={2000} value={text} onChange={e => setText(e.target.value)} disabled={busy || recording || startingRecording || !!audioDraft} placeholder="¿Cuál es mi estrategia activa?" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800" /><button aria-label={recording || audioDraft ? "Enviar audio" : "Enviar pregunta"} disabled={busy || startingRecording || (!recording && !audioDraft && !text.trim())} className="shrink-0 rounded-xl bg-teal-700 p-2.5 text-white disabled:opacity-50"><Send size={18} /></button></div>
        <div className="flex items-center gap-3 text-sm"><button type="button" disabled={busy || startingRecording || recording || !!audioDraft} aria-label="Grabar audio" onClick={() => void record()} className="flex gap-1 items-center disabled:opacity-50"><Mic size={16} />Grabar</button>
          <label className="cursor-pointer">Adjuntar audio<input aria-label="Adjuntar audio" type="file" accept="audio/webm,audio/ogg,audio/wav,audio/mpeg,audio/mp4" className="sr-only" disabled={busy || recording || startingRecording || !!audioDraft} onChange={e => { const file = e.target.files?.[0]; if (file) void send(undefined, file); e.target.value = ''; }} /></label>
        </div>
      </form>
    </section>}
    <button type="button" aria-label="Abrir asistente financiero" aria-expanded={open} onClick={() => open ? close() : setOpen(true)} className="ml-auto flex rounded-full bg-gradient-to-br from-teal-700 to-cyan-700 p-4 text-white shadow-lg shadow-teal-900/20 transition-transform hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"><MessageCircle size={24} /></button>
  </div>;
}
