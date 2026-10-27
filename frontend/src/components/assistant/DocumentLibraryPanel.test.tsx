// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DocumentLibraryPanel } from './DocumentLibraryPanel';
import { DocumentReferences } from './DocumentReferences';
import { documentLibraryService, type FinancialDocument } from '../../services/documentLibraryService';
vi.mock('../../services/documentLibraryService', async importOriginal => ({ ...await importOriginal<typeof import('../../services/documentLibraryService')>(), documentLibraryService: { get:vi.fn(),jobs:vi.fn(),search: vi.fn(), upload: vi.fn(), download: vi.fn(), update: vi.fn(), proposals: vi.fn(), reprocess: vi.fn(), remove: vi.fn(),versions:vi.fn(),replace:vi.fn(),downloadVersion:vi.fn() } }));
beforeEach(() => { cleanup(); vi.clearAllMocks(); });
describe('Document library', () => {
  it('sends exact identification and exclusive dates and presents an empty result honestly', async () => {
    vi.mocked(documentLibraryService.search).mockResolvedValue({ documents: [], sources: [], verifiedData: null, generatedText: '', evidenceStatus: 'INSUFFICIENT', appliedFilters: {}, traceId: 'trace-test', elapsedMs: 12 });
    render(<DocumentLibraryPanel view="search" />);
    fireEvent.click(screen.getByText('Filtrar por metadatos y fechas'));
    fireEvent.change(screen.getByLabelText('Tipo de identificación documental'), { target: { value: 'CC' } });
    fireEvent.change(screen.getByLabelText('Inicio del periodo'), { target: { value: '2026-09-01' } });
    fireEvent.change(screen.getByLabelText('Fin del periodo (exclusivo)'), { target: { value: '2026-11-01' } });
    fireEvent.click(screen.getByText('Buscar documentos'));
    await screen.findByText('No se encontraron documentos con estos filtros.');
    expect(documentLibraryService.search).toHaveBeenCalledWith(expect.objectContaining({ intent: 'METADATA_SEARCH', filters: expect.objectContaining({ identificationType: 'CC', periodFrom: '2026-09-01', periodToExclusive: '2026-11-01' }) }));
  });
  it('shows service errors without fabricating documents', async () => {
    vi.mocked(documentLibraryService.search).mockRejectedValue(new Error('Biblioteca pendiente de configurar'));
    render(<DocumentLibraryPanel view="search" />); fireEvent.click(screen.getByText('Buscar documentos'));
    expect((await screen.findByRole('alert')).textContent).toContain('pendiente de configurar');
  });
  it('keeps the upload button usable after consent and opens the file picker', () => {
    render(<DocumentLibraryPanel />);
    const button = screen.getByRole('button',{name:'Subir documento'}) as HTMLButtonElement;
    const picker=vi.spyOn(screen.getByLabelText('Archivo financiero'),'click');
    expect(button.disabled).toBe(false);
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(button);
    expect(picker).toHaveBeenCalledOnce();
    expect(documentLibraryService.upload).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Archivo financiero'), { target: { files: [new File(['synthetic'], 'test.pdf', { type: 'application/pdf' })] } });
    expect(button.disabled).toBe(false);
    expect(screen.getByText('Archivo seleccionado: test.pdf')).toBeTruthy();
    expect(documentLibraryService.upload).not.toHaveBeenCalled();
  });
  it('uploads without asking for metadata and shows automatically extracted fields', async () => {
    vi.mocked(documentLibraryService.upload).mockResolvedValue({id:'auto-doc',status:'INDEXED',identificationType:'CC',documentType:'BANK_STATEMENT',financialEntity:'Banco Sintético',periodStart:'2026-09-01',periodEnd:'2026-10-01'} as FinancialDocument);
    render(<DocumentLibraryPanel />);
    fireEvent.change(screen.getByLabelText('Archivo financiero'), {target:{files:[new File(['synthetic'],'auto.pdf',{type:'application/pdf'})]}});
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button',{name:'Subir documento'}));
    await screen.findByText('Documento listo para consultar.');
    expect(documentLibraryService.upload).toHaveBeenCalledWith(expect.any(File),null,true,undefined);
    expect(screen.getByText('Banco Sintético')).toBeTruthy();
    expect(documentLibraryService.update).not.toHaveBeenCalled();
  });
  it('lists all document kinds by default instead of hiding receipts and contracts', async () => {
    vi.mocked(documentLibraryService.search).mockResolvedValue({documents:[],sources:[],traceId:'t'} as never);
    render(<DocumentLibraryPanel view="search" />);
    fireEvent.click(screen.getByText('Ver mis documentos'));
    await waitFor(()=>expect(documentLibraryService.search).toHaveBeenCalledWith({intent:'METADATA_SEARCH',filters:{},offset:0,limit:10}));
  });
  it('only exposes a download link after backend authorization', async () => {
    vi.mocked(documentLibraryService.download).mockResolvedValue({ url: '/api/v1/financial-documents/synthetic-id/content?ticket=synthetic', expiresIn: 60 });
    render(<DocumentReferences documents={[{ id: 'synthetic-id', documentType: 'BANK_STATEMENT', status: 'INDEXED' } as FinancialDocument]} />);
    expect(screen.queryByRole('link')).toBeNull();
    fireEvent.click(screen.getByText('Preparar descarga autorizada'));
    await waitFor(() => expect(screen.getByRole('link').getAttribute('href')).toBe('http://localhost:8080/api/v1/financial-documents/synthetic-id/content?ticket=synthetic'));
    expect(documentLibraryService.download).toHaveBeenCalledWith('synthetic-id');
  });
  it('marks a pending review in document references', () => {
    render(<DocumentReferences documents={[{id:'pending',documentType:'BANK_STATEMENT',status:'REVIEW_REQUIRED'} as FinancialDocument]} />);
    expect(screen.getByText(/Requiere revisión/)).toBeTruthy();
    expect(screen.getByText(/Revisar archivos/)).toBeTruthy();
  });
  it('explains why a document needs review and lets the user correct it', async () => {
    vi.mocked(documentLibraryService.search).mockResolvedValue({documents:[{id:'pending',status:'REVIEW_REQUIRED',documentType:'BANK_STATEMENT',financialEntity:'Banco de prueba',identificationType:null,periodStart:'2026-09-01',periodEnd:'2026-10-01'} as FinancialDocument],sources:[]} as never);
    vi.mocked(documentLibraryService.jobs).mockResolvedValue([]);
    render(<DocumentLibraryPanel view="review" />);
    expect(await screen.findByText(/Falta confirmar: tipo de identificación/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'Revisar y corregir'}));
    expect(screen.getByRole('region',{name:'Corregir metadatos'})).toBeTruthy();
  });
  it('distinguishes review documents with the same type and entity', async () => {
    vi.mocked(documentLibraryService.search).mockResolvedValue({documents:[
      {id:'abc12345-first',status:'REVIEW_REQUIRED',documentType:'BANK_STATEMENT',financialEntity:'Banco de prueba',identificationType:'CC',periodStart:'2026-09-01',periodEnd:'2026-10-01',issuedAt:'2026-10-02',uploadedAt:'2026-10-26T14:00:00Z'},
      {id:'xyz98765-second',status:'REVIEW_REQUIRED',documentType:'BANK_STATEMENT',financialEntity:'Banco de prueba',identificationType:'CC',periodStart:'2026-09-01',periodEnd:'2026-10-01',issuedAt:'2026-10-03',uploadedAt:'2026-10-27T14:00:00Z'},
    ] as FinancialDocument[],sources:[]} as never);
    vi.mocked(documentLibraryService.jobs).mockResolvedValue([]);
    render(<DocumentLibraryPanel view="review" />);
    expect((await screen.findAllByText('Extracto bancario · Banco de prueba')).length).toBe(2);
    expect(screen.getAllByText('01/09/2026 al 30/09/2026')).toHaveLength(2);
    expect(screen.getByText('02/10/2026')).toBeTruthy();
    expect(screen.getByText('03/10/2026')).toBeTruthy();
    expect(screen.getByText('abc12345')).toBeTruthy();
    expect(screen.getByText('xyz98765')).toBeTruthy();
    expect(screen.getByText(/26\/10\/2026, 9:00/)).toBeTruthy();
    expect(screen.getByText(/27\/10\/2026, 9:00/)).toBeTruthy();
  });
});
