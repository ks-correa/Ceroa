import { apiRequest, API_URL } from './api';
export function documentDownloadUrl(value: string): string {
  const api = new URL(API_URL, window.location.origin); const url = new URL(value, api);
  if (url.origin !== api.origin || !url.pathname.startsWith(api.pathname + '/financial-documents/')) throw new Error('Enlace no disponible.');
  return url.href;
}
export interface DocumentVersion { version: number; contentType: string; archivedAt: string; current: boolean }

export type IdentificationType = 'CC' | 'CE' | 'TI' | 'NIT' | 'PASSPORT' | 'OTHER';
export type DocumentKind = 'BANK_STATEMENT' | 'PAYMENT_RECEIPT' | 'LOAN_AGREEMENT' | 'OTHER';
export interface DocumentMetadata {
  identificationType: IdentificationType | null;
  documentType: DocumentKind;
  financialEntity: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  issuedAt: string | null;
  debtId: string | null;
}
export interface FinancialDocument extends Omit<DocumentMetadata, 'debtId'> {
  id: string; ownerId: string; status: string; version: number; uploadedAt: string;
}
export interface DocumentSource {
  documentId: string; chunkId: string; page: number | null; location: string;
  content: string; score: number; documentVersion: number;
}
export interface DocumentQuery {
  intent: 'METADATA_SEARCH' | 'STRUCTURED_QUERY' | 'SEMANTIC_SEARCH' | 'HYBRID_SEARCH' | 'COMBINED_QUERY';
  question?: string;
  filters: { identificationType?: IdentificationType; documentType?: DocumentKind; financialEntity?: string; periodFrom?: string; periodToExclusive?: string };
  offset: number; limit: number;
}
export interface DocumentResult {
  generatedText: string; verifiedData: unknown; appliedFilters: DocumentQuery['filters'];
  sources: DocumentSource[]; documents: FinancialDocument[]; evidenceStatus: string; traceId: string; elapsedMs: number;
}
export const documentLibraryService = {
  search: (query: DocumentQuery) => apiRequest<DocumentResult>('/financial-documents/search', { method: 'POST', body: JSON.stringify(query) }),
  get: (id: string) => apiRequest<FinancialDocument>(`/financial-documents/${id}`),
  jobs: (id: string) => apiRequest<{status: string; errorCode: string | null}[]>(`/financial-documents/${id}/jobs`),
  upload: (file: File, metadata: DocumentMetadata | null, consent: boolean, sheet?: string) => {
    const body = new FormData(); body.append('file', file);
    if (metadata) body.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    return apiRequest<FinancialDocument>(`/financial-documents?consent=${consent}${sheet ? `&sheet=${encodeURIComponent(sheet)}` : ''}`, { method: 'POST', body });
  },
  update: (id: string, metadata: DocumentMetadata) => apiRequest<FinancialDocument>(`/financial-documents/${id}/metadata`, { method: 'PUT', body: JSON.stringify(metadata) }),
  replace: (id: string, expectedVersion: number, file: File, consent: boolean, sheet?: string) => {
    const body = new FormData(); body.append('file', file);
    return apiRequest<FinancialDocument>(`/financial-documents/${id}/replace?expectedVersion=${expectedVersion}&consent=${consent}${sheet ? `&sheet=${encodeURIComponent(sheet)}` : ''}`, { method: 'POST', body });
  },
  versions: (id: string) => apiRequest<DocumentVersion[]>(`/financial-documents/${id}/versions`),
  downloadVersion: (id: string, version: number) => apiRequest<{url: string; expiresIn: number}>(`/financial-documents/${id}/versions/${version}/download`, {method:'POST'}),
  reprocess: (id: string) => apiRequest<FinancialDocument>(`/financial-documents/${id}/reprocess`, { method: 'POST' }),
  proposals: (id: string) => apiRequest<{ proposals?: { field: string; value: string; quote: string; location: string }[] }>(`/financial-documents/${id}/proposals`),
  remove: (id: string) => apiRequest<void>(`/financial-documents/${id}`, { method: 'DELETE' }),
  download: (id: string) => apiRequest<{ url: string; expiresIn: number }>(`/financial-documents/${id}/download`, { method: 'POST' })
};
