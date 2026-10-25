import { useEffect, useRef, useState } from 'react';
import { documentLibraryService, type FinancialDocument, type DocumentMetadata, type DocumentKind, type IdentificationType, type DocumentQuery } from '../../services/documentLibraryService';
import { useDocumentLibrary } from '../../hooks/useDocumentLibrary';
import { DocumentReferences } from './DocumentReferences';
import { DocumentVersionManager } from './DocumentVersionManager';

const kinds = [{value:'BANK_STATEMENT',label:'Extracto bancario'},{value:'PAYMENT_RECEIPT',label:'Comprobante de pago'},{value:'LOAN_AGREEMENT',label:'Contrato de crédito'},{value:'OTHER',label:'Otro documento'}] as const;
const blankMetadata: DocumentMetadata = {identificationType:null,documentType:'OTHER',financialEntity:null,periodStart:null,periodEnd:null,issuedAt:null,debtId:null};

export function DocumentLibraryPanel() {
  const { result, busy, error, run, search } = useDocumentLibrary();
  const [identification, setIdentification] = useState('');
  const [kind, setKind] = useState<DocumentKind | ''>('');
  const [entity, setEntity] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [question, setQuestion] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [sheet, setSheet] = useState('');
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState('');
  const [uploaded, setUploaded] = useState<FinancialDocument | null>(null);
  const [pollError, setPollError] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [edit, setEdit] = useState<DocumentMetadata>(blankMetadata);
  const [offset, setOffset] = useState(0);
  const query = (page: number): DocumentQuery => ({ intent: question.trim() ? 'HYBRID_SEARCH' : 'METADATA_SEARCH', question, offset: page, limit: 10, filters: { identificationType: (identification || undefined) as IdentificationType | undefined, documentType: kind || undefined, financialEntity: entity || undefined, periodFrom: from || undefined, periodToExclusive: to || undefined } });
  const processing = !!uploaded && ['PENDING','PROCESSING'].includes(uploaded.status);
  useEffect(() => {
    if (!uploaded || !['PENDING','PROCESSING'].includes(uploaded.status)) return;
    let active = true; let timer: ReturnType<typeof setTimeout>; let attempts = 0;
    async function poll() {
      try {
        const current = await documentLibraryService.get(uploaded!.id);
        if (!active) return;
        setUploaded(current); setPollError('');
        if (['PENDING','PROCESSING'].includes(current.status) && ++attempts < 100) timer = setTimeout(() => void poll(), 3000);
        else if (attempts >= 100) setPollError('El análisis sigue pendiente. Puedes consultar su estado con Ver mis documentos.');
      } catch { if (active) setPollError('No se pudo actualizar el estado. Consulta Ver mis documentos para comprobarlo.'); }
    }
    timer = setTimeout(() => void poll(), 2000);
    return () => { active = false; clearTimeout(timer); };
  }, [uploaded?.id, uploaded?.status]);
  async function upload() {
    if (!file || !consent) return;
    setStatus(''); setPollError('');
    const saved = await run(() => documentLibraryService.upload(file, null, consent, sheet || undefined));
    if (saved) { setUploaded(saved); setFile(null); setConsent(false); setSheet(''); if(fileInput.current)fileInput.current.value=''; }
  }
  async function saveMetadata() {
    if (!editing) return;
    const saved = await run(() => documentLibraryService.update(editing, edit));
    if (saved) { setEditing(null); setStatus('Correcciones guardadas. El documento se volverá a indexar.'); if (uploaded?.id === saved.id) setUploaded(saved); await search(query(offset)); }
  }
  function review(document: FinancialDocument) {
    setEditing(document.id);
    setEdit({identificationType:document.identificationType,documentType:document.documentType,financialEntity:document.financialEntity,periodStart:document.periodStart,periodEnd:document.periodEnd,issuedAt:document.issuedAt,debtId:null});
  }
  return <section aria-label="Biblioteca documental" className="document-library space-y-4 rounded-2xl border border-slate-200 bg-white p-3 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900">
    <section aria-label="Subir documento" className="space-y-3 rounded-xl border border-teal-200 bg-teal-50/60 p-3 dark:border-teal-800 dark:bg-teal-950/30">
      <h3 className="font-semibold text-teal-800 dark:text-teal-200">Subir documento</h3>
      <p className="text-xs">Selecciona tu archivo. La IA lo lee y extrae el tipo de documento, identificación, entidad y fechas que encuentre. No necesitas completar metadatos.</p>
      <input ref={fileInput} aria-label="Archivo financiero" className="sr-only" type="file" accept=".pdf,.docx,.xlsx" disabled={busy} onChange={e => { setFile(e.target.files?.[0] || null); setSheet(''); setStatus(''); }} />
      <button type="button" className="w-full rounded-xl border-2 border-dashed border-teal-600 bg-white px-3 py-3 font-semibold text-teal-800 hover:bg-teal-50 disabled:opacity-50 dark:bg-slate-900 dark:text-teal-200" disabled={busy} onClick={()=>fileInput.current?.click()}>{file ? 'Cambiar archivo' : 'Seleccionar archivo'}</button>
      <p className="break-all text-xs" aria-live="polite">{file ? `Archivo seleccionado: ${file.name}` : 'Todavía no has seleccionado un archivo.'}</p>
      <p className="text-xs text-slate-500">PDF, DOCX o XLSX · Máximo 8 MB. También puedes subir PDF escaneados.</p>
      {file?.name.toLowerCase().endsWith('.xlsx') && <label className="block text-xs">Nombre exacto de la hoja XLSX<input className="document-field" value={sheet} maxLength={31} onChange={e => setSheet(e.target.value)} /></label>}
      <label className="flex items-start gap-2 text-xs"><input type="checkbox" className="mt-0.5 shrink-0" checked={consent} onChange={e => setConsent(e.target.checked)} /><span>Autorizo el almacenamiento privado y el análisis con IA. Para leer PDF escaneados, Gemini recibe el documento completo.</span></label>
      <button type="button" className="w-full rounded-xl bg-teal-700 px-3 py-2 font-semibold text-white hover:bg-teal-800 disabled:opacity-50" disabled={busy} onClick={() => {if(!file){fileInput.current?.click();return;}if(!consent){setStatus('Marca la autorización para subir y analizar el documento seleccionado.');return;}void upload();}}>{busy && file ? 'Subiendo documento…' : 'Subir documento'}</button>
      <p className="text-xs text-slate-500">{!file ? 'Pulsa Subir documento para elegir el archivo de tu equipo.' : !consent ? 'Marca la autorización y pulsa Subir documento.' : 'Todo listo. Pulsa Subir documento para iniciar el análisis.'}</p>
      <p className="text-xs text-slate-500">Los documentos no registran deudas ni pagos automáticamente.</p>
    </section>
    {uploaded && <section aria-label="Estado del documento" className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
      <p role="status">{processing ? 'Leyendo documento y extrayendo metadatos…' : uploaded.status === 'INDEXED' ? 'Documento listo para consultar.' : uploaded.status === 'REVIEW_REQUIRED' ? 'Documento recibido. Algunos datos o la lectura requieren revisión.' : 'No se pudo completar el análisis. Puedes volver a procesarlo desde tus documentos.'}</p>
      {!processing && <><dl className="grid grid-cols-2 gap-2 text-xs"><div><dt>Identificación</dt><dd>{uploaded.identificationType || 'No encontrada'}</dd></div><div><dt>Documento</dt><dd>{kinds.find(k=>k.value===uploaded.documentType)?.label}</dd></div><div><dt>Entidad</dt><dd>{uploaded.financialEntity || 'No encontrada'}</dd></div><div><dt>Periodo</dt><dd>{uploaded.periodStart || 'Sin identificar'} / {uploaded.periodEnd || 'Sin identificar'} (fin exclusivo)</dd></div></dl><button type="button" className="text-xs underline" onClick={()=>review(uploaded)}>Corregir datos extraídos</button></>}
      {pollError && <p role="alert" className="text-xs text-amber-700">{pollError}</p>}
    </section>}
    <section aria-label="Buscar documentos" className="space-y-3 border-t border-slate-200 pt-3 dark:border-slate-700">
      <h3 className="font-semibold">Buscar en mis documentos</h3>
      <label className="block">Buscar en el contenido<input className="document-field" maxLength={2000} value={question} onChange={e => setQuestion(e.target.value)} placeholder="Por ejemplo: intereses cobrados" /></label>
      <details><summary className="cursor-pointer text-xs font-medium">Filtrar por metadatos y fechas</summary>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label>Tipo de identificación<select aria-label="Tipo de identificación documental" className="document-field" value={identification} onChange={e => setIdentification(e.target.value)}><option value="">Todos</option>{['CC', 'CE', 'TI', 'NIT', 'PASSPORT', 'OTHER'].map(value => <option key={value}>{value}</option>)}</select></label>
          <label>Documento<select className="document-field" value={kind} onChange={e => setKind(e.target.value as DocumentKind | '')}><option value="">Todos</option>{kinds.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label>Entidad<input className="document-field" maxLength={160} value={entity} onChange={e => setEntity(e.target.value)} /></label>
          <label>Inicio del periodo<input className="document-field" type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
          <label>Fin del periodo (exclusivo)<input className="document-field" type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
        </div>
      </details>
      <div className="flex flex-wrap gap-3"><button type="button" className="rounded-lg bg-teal-700 px-3 py-2 text-white" disabled={busy} onClick={() => { setOffset(0); void search(query(0)); }}>Buscar documentos</button><button type="button" className="text-xs underline" disabled={busy} onClick={() => {setOffset(0);setIdentification('');setKind('');setEntity('');setFrom('');setTo('');setQuestion('');void search({intent:'METADATA_SEARCH',filters:{},offset:0,limit:10});}}>Ver mis documentos</button></div>
    </section>
    {editing && <section aria-label="Corregir metadatos" className="space-y-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
      <h3 className="font-semibold">Corregir datos extraídos</h3><p className="text-xs">Solo es necesario si quieres corregir o completar lo que se encontró.</p>
      <div className="grid grid-cols-2 gap-3">
        <label>Identificación corregida<select className="document-field" value={edit.identificationType || ''} onChange={e=>setEdit({...edit,identificationType:(e.target.value || null) as IdentificationType | null})}><option value="">Sin identificar</option>{['CC','CE','TI','NIT','PASSPORT','OTHER'].map(v=><option key={v}>{v}</option>)}</select></label>
        <label>Tipo de documento corregido<select className="document-field" value={edit.documentType} onChange={e=>setEdit({...edit,documentType:e.target.value as DocumentKind})}>{kinds.map(k=><option key={k.value} value={k.value}>{k.label}</option>)}</select></label>
        <label>Entidad corregida<input className="document-field" maxLength={160} value={edit.financialEntity || ''} onChange={e=>setEdit({...edit,financialEntity:e.target.value || null})}/></label>
        {([{key:'periodStart',label:'Inicio corregido'},{key:'periodEnd',label:'Fin exclusivo corregido'},{key:'issuedAt',label:'Emisión corregida'}] as const).map(f=><label key={f.key}>{f.label}<input className="document-field" type="date" value={edit[f.key] || ''} onChange={e=>setEdit({...edit,[f.key]:e.target.value || null})}/></label>)}
      </div><button type="button" disabled={busy} className="underline" onClick={()=>void saveMetadata()}>Guardar correcciones</button><button type="button" className="ml-3 underline" onClick={()=>setEditing(null)}>Cancelar</button>
    </section>}
    {busy && <p role="status">Procesando solicitud…</p>}{error && <p role="alert" className="text-red-700">{error}</p>}{status && <p role="status">{status}</p>}
    {result && <>
      {!result.documents.length && <p>No se encontraron documentos con estos filtros.</p>}
      <DocumentReferences documents={result.documents} />
      {result.documents.map(document => <div key={document.id} className="flex flex-wrap gap-3 text-xs">
        <DocumentVersionManager document={document} onChanged={()=>search(query(offset))}/>
        <button type="button" className="underline" onClick={() => review(document)}>Corregir metadatos · {document.financialEntity || 'Documento'}</button>
        <button type="button" disabled={busy} className="underline" onClick={() => void run(async () => { const saved=await documentLibraryService.reprocess(document.id);setUploaded(saved); await search(query(offset)); })}>Reprocesar</button>
        <button type="button" disabled={busy} className="underline" onClick={() => { if (window.confirm('¿Eliminar este documento y sus fragmentos?')) void run(async () => { await documentLibraryService.remove(document.id); if(uploaded?.id===document.id)setUploaded(null);await search(query(offset)); }); }}>Eliminar</button>
      </div>)}
      {result.sources.map(source => <blockquote key={source.chunkId} className="border-l-2 pl-2"><p>{source.content}</p><small>{source.location} · Fragmento {source.chunkId.slice(0, 8)}</small></blockquote>)}
      <div className="flex gap-3"><button type="button" disabled={busy || offset === 0} onClick={() => { setOffset(offset - 10); void search(query(offset - 10)); }}>Anterior</button><button type="button" disabled={busy || result.documents.length < 10} onClick={() => { setOffset(offset + 10); void search(query(offset + 10)); }}>Siguiente</button></div>
    </>}
  </section>;
}
