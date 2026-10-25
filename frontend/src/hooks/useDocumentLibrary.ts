import { useEffect, useRef, useState } from 'react';
import { documentLibraryService, type DocumentQuery, type DocumentResult } from '../services/documentLibraryService';

export function useDocumentLibrary() {
  const [result, setResult] = useState<DocumentResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  async function run<T>(operation: () => Promise<T>): Promise<T | undefined> {
    setBusy(true); setError('');
    try { return await operation(); }
    catch (cause) { if (alive.current) setError(cause instanceof Error ? cause.message : 'No fue posible completar la operación.'); }
    finally { if (alive.current) setBusy(false); }
  }
  async function search(query: DocumentQuery) {
    setResult(null);
    const found = await run(() => documentLibraryService.search(query));
    if (found && alive.current) setResult(found);
  }
  return { result, busy, error, run, search };
}
