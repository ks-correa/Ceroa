import { useState } from 'react';
import { documentLibraryService, documentDownloadUrl, type FinancialDocument } from '../../services/documentLibraryService';

export function DocumentReferences({ documents }: { documents: FinancialDocument[] }) {
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
      <p>{document.periodStart || 'Sin periodo'} / {document.periodEnd || 'Sin periodo'} · {document.status}</p>
      {links[document.id]
        ? <a className="underline" href={links[document.id]} target="_blank" rel="noreferrer">Abrir documento (enlace temporal)</a>
        : <button className="underline" type="button" onClick={() => void prepare(document.id)}>Preparar descarga autorizada</button>}
    </div>)}
    {error && <p role="alert">{error}</p>}
  </div>;
}
