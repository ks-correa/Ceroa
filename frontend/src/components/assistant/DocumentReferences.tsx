import { useState } from 'react';
import { documentLibraryService, documentDownloadUrl, type FinancialDocument } from '../../services/documentLibraryService';
import { documentHeading, documentPeriod, documentPeriodRange, documentUploadedAt } from './documentLabels';

export function DocumentReferences({ documents, onDiscuss, renderActions, selectedDocumentId, disabled = false }: { documents: FinancialDocument[]; onDiscuss?: (document: FinancialDocument) => void; renderActions?: (document: FinancialDocument) => React.ReactNode; selectedDocumentId?: string; disabled?: boolean }) {
  const [links, setLinks] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  async function prepare(id: string) {
    setError('');
    try {
      const result = await documentLibraryService.download(id);
      setLinks(previous => ({ ...previous, [id]: documentDownloadUrl(result.url) }));
      setTimeout(() => setLinks(previous => { const next = { ...previous }; delete next[id]; return next; }), result.expiresIn * 1000);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No fue posible abrir el documento.'); }
  }
  return <div className="space-y-2 text-xs">
    {documents.map(document => <article key={document.id} aria-label={`${documentHeading(document)}, ${documentPeriod(document)}, referencia ${document.id.slice(0, 8)}`} data-testid={`document-card-${document.id}`} className={`rounded-xl border p-3 space-y-1 ${selectedDocumentId === document.id ? 'border-teal-600 bg-teal-50 dark:bg-teal-950' : 'border-slate-200 dark:border-slate-700'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 break-words font-semibold">{documentHeading(document)}</p>
        <span className="shrink-0 text-[11px] text-slate-500" title={`ID completo: ${document.id}`}>{document.version ? `v${document.version} · ` : ''}Referencia {document.id.slice(0, 8)}</span>
      </div>
      <p className="font-semibold text-teal-800 dark:text-teal-200">{documentPeriod(document)}</p>
      {(document.periodStart || document.periodEnd) && <p>{documentPeriodRange(document)}</p>}
      {document.uploadedAt && <p className="text-slate-500">Cargado: {documentUploadedAt(document.uploadedAt)}</p>}
      <p>{document.status === 'INDEXED' ? 'Listo para consultar' : document.status === 'REVIEW_REQUIRED' ? 'Requiere revisión' : document.status === 'PENDING' || document.status === 'PROCESSING' ? 'En análisis' : 'No disponible para búsqueda'}</p>
      {document.status === 'REVIEW_REQUIRED' && <p className="text-amber-700 dark:text-amber-300">Revisa sus datos en “Revisar archivos” para incluirlo en las consultas.</p>}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        {links[document.id]
          ? <a className="underline" href={links[document.id]} target="_blank" rel="noreferrer">Abrir documento (enlace temporal)</a>
          : <button className="underline" type="button" onClick={() => void prepare(document.id)}>Preparar descarga autorizada</button>}
        {onDiscuss && document.status === 'INDEXED' && <button className="rounded-lg bg-teal-700 px-3 py-2 font-semibold text-white disabled:opacity-50" type="button" disabled={disabled || selectedDocumentId === document.id} aria-pressed={selectedDocumentId === document.id} onClick={() => onDiscuss(document)}>{selectedDocumentId === document.id ? 'Archivo seleccionado' : 'Consultar este archivo'}</button>}
      </div>
      {renderActions && <div data-testid={`document-actions-${document.id}`} className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 flex flex-wrap gap-3 text-xs">{renderActions(document)}</div>}
    </article>)}
    {error && <p role="alert">{error}</p>}
  </div>;
}
