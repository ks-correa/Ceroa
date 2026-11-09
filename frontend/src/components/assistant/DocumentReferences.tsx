import { useState } from 'react';
import { documentLibraryService, documentDownloadUrl, type FinancialDocument } from '../../services/documentLibraryService';

export function DocumentReferences({ documents, onDiscuss, renderActions }: { documents: FinancialDocument[]; onDiscuss?: (document: FinancialDocument) => void; renderActions?: (document: FinancialDocument) => React.ReactNode }) {
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
    {documents.map(document => <div key={document.id} data-testid={`document-card-${document.id}`} className="rounded border p-2.5 space-y-1">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold">{document.financialEntity || 'Entidad pendiente'} · {document.documentType}</p>
        <span className="text-[11px] text-slate-500">{document.version ? `v${document.version} · ` : ''}ID {document.id.slice(0, 8)}</span>
      </div>
      <p>{document.periodStart || 'Sin periodo'} / {document.periodEnd || 'Sin periodo'} · {document.status === 'INDEXED' ? 'Listo para consultar' : document.status === 'REVIEW_REQUIRED' ? 'Requiere revisión' : document.status === 'PENDING' || document.status === 'PROCESSING' ? 'En análisis' : 'No disponible para búsqueda'}</p>
      {document.status === 'REVIEW_REQUIRED' && <p className="text-amber-700 dark:text-amber-300">Revisa sus datos en “Revisar archivos” para incluirlo en las consultas.</p>}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        {links[document.id]
          ? <a className="underline" href={links[document.id]} target="_blank" rel="noreferrer">Abrir documento (enlace temporal)</a>
          : <button className="underline" type="button" onClick={() => void prepare(document.id)}>Preparar descarga autorizada</button>}
        {onDiscuss && document.status === 'INDEXED' && <button className="rounded-lg bg-teal-700 px-3 py-1.5 font-semibold text-white" type="button" onClick={() => onDiscuss(document)}>Continuar conversación con este archivo</button>}
      </div>
      {renderActions && <div data-testid={`document-actions-${document.id}`} className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 flex flex-wrap gap-3 text-xs">{renderActions(document)}</div>}
    </div>)}
    {error && <p role="alert">{error}</p>}
  </div>;
}
