import {useEffect, useState} from 'react';
import {documentLibraryService, documentDownloadUrl, type FinancialDocument, type DocumentVersion} from '../../services/documentLibraryService';

export function DocumentVersionManager({document,onChanged}:{document:FinancialDocument;onChanged:()=>Promise<void>}) {
  const [open,setOpen]=useState(false);const [versions,setVersions]=useState<DocumentVersion[]>([]);
  const [file,setFile]=useState<File|null>(null);const [consent,setConsent]=useState(false);const [sheet,setSheet]=useState('');
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [status,setStatus]=useState('');const [link,setLink]=useState('');
  useEffect(()=>{if(!open)return;let active=true;setError('');void documentLibraryService.versions(document.id).then(rows=>{if(active)setVersions(rows);}).catch(e=>{if(active)setError(e instanceof Error?e.message:'No fue posible consultar las versiones.');});return()=>{active=false;};},[open,document.id,document.version]);
  useEffect(()=>{if(!link)return;const timer=setTimeout(()=>setLink(''),60000);return()=>clearTimeout(timer);},[link]);
  async function replace(){if(!file||!consent)return;setBusy(true);setError('');setStatus('');try{
    const saved=await documentLibraryService.replace(document.id,document.version,file,consent,sheet||undefined);
    setStatus(saved.version===document.version?'El archivo ya es el original actual; no se creó otra versión.':`Original reemplazado. Versión ${saved.version}: ${saved.status}.`);
    setFile(null);setConsent(false);setLink('');await onChanged();
  }catch(e){setError(e instanceof Error?e.message:'No fue posible reemplazar el archivo.');}finally{setBusy(false);}}
  async function download(version:number){setError('');try{const issued=await documentLibraryService.downloadVersion(document.id,version);setLink(documentDownloadUrl(issued.url));}catch(e){setError(e instanceof Error?e.message:'No fue posible abrir la versión.');}}
  return <div className="w-full space-y-3">
    <button type="button" aria-expanded={open} className="text-xs font-medium text-teal-700 underline dark:text-teal-300" onClick={()=>setOpen(!open)}>Versiones y reemplazo</button>
    {open&&<section aria-label="Versiones del documento" className="space-y-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
      <p className="text-xs text-slate-500">El original anterior queda en el historial privado y sus fragmentos salen de la búsqueda. Los datos confirmados se conservan; revísalos si cambia el periodo.</p>
      <p className="rounded-lg bg-slate-50 p-2 text-xs dark:bg-slate-800">Datos a conservar: {document.identificationType||'Identificación pendiente'} · {document.financialEntity||'Entidad pendiente'} · {document.periodStart||'Sin inicio'} / {document.periodEnd||'Sin fin'}.</p>
      <ul className="space-y-2 text-xs">{versions.map(v=><li key={v.version} className="flex items-center justify-between gap-2"><span>Versión {v.version}{v.current?' · Actual':' · Original anterior'}</span><button type="button" className="underline" onClick={()=>void download(v.version)}>Preparar descarga</button></li>)}</ul>
      {link&&<a href={link} target="_blank" rel="noreferrer" className="block text-xs underline">Descargar versión (enlace temporal)</a>}
      <label className="block text-xs">Nuevo original<input key={document.version} aria-label="Archivo de reemplazo" className="mt-1 block w-full text-xs" type="file" accept=".pdf,.docx,.xlsx" disabled={busy} onChange={e=>setFile(e.target.files?.[0]||null)}/></label>
      {file?.name.toLowerCase().endsWith('.xlsx')&&<label>Nombre exacto de la hoja<input value={sheet} maxLength={31} onChange={e=>setSheet(e.target.value)} className="document-field"/></label>}
      <label className="flex gap-2 text-xs"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>Confirmo que estos datos corresponden al nuevo original y autorizo el reemplazo y análisis con IA. Si requiere OCR, Gemini recibe el PDF completo.</label>
      <button type="button" disabled={busy||!file||!consent} onClick={()=>void replace()} className="rounded-lg bg-teal-700 px-3 py-2 text-xs text-white disabled:opacity-50">{busy?'Reemplazando…':'Reemplazar original'}</button>
      {error&&<p role="alert" className="text-xs text-red-700">{error}</p>}{status&&<p role="status" className="text-xs">{status}</p>}
    </section>}
  </div>;
}
