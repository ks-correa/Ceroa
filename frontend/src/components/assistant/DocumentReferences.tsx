import { useState } from 'react';
import { documentLibraryService, documentDownloadUrl, type FinancialDocument } from '../../services/documentLibraryService';

export function DocumentReferences({ documents, onDiscuss }: { documents: FinancialDocument[]; onDiscuss?: (document: FinancialDocument) => void }) {
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
    {documents.map(document => <div key={document.id} className="rounded border p-2">
      <p>{document.financialEntity || 'Entidad pendiente'} · {document.documentType}</p>
      <p>{document.periodStart || 'Sin periodo'} / {document.periodEnd || 'Sin periodo'} · {document.status === 'INDEXED' ? 'Listo para consultar' : document.status === 'REVIEW_REQUIRED' ? 'Requiere revisión' : document.status === 'PENDING' || document.status === 'PROCESSING' ? 'En análisis' : 'No disponible para búsqueda'}</p>
      {document.status === 'REVIEW_REQUIRED' && <p className="text-amber-700 dark:text-amber-300">Revisa sus datos en “Revisar archivos” para incluirlo en las consultas.</p>}
      {links[document.id]
        ? <a className="underline" href={links[document.id]} target="_blank" rel="noreferrer">Abrir documento (enlace temporal)</a>
        : <button className="underline" type="button" onClick={() => void prepare(document.id)}>Preparar descarga autorizada</button>}
      {onDiscuss && document.status === 'INDEXED' && <button className="mt-2 block rounded-lg bg-teal-700 px-3 py-2 font-semibold text-white" type="button" onClick={() => onDiscuss(document)}>Continuar conversación con este archivo</button>}
    </div>)}
    {error && <p role="alert">{error}</p>}
  </div>;
}
