// @vitest-environment jsdom
import {afterEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
import {DocumentVersionManager} from './DocumentVersionManager';
import {documentLibraryService,type FinancialDocument} from '../../services/documentLibraryService';
vi.mock('../../services/documentLibraryService',async importOriginal=>({...await importOriginal<typeof import('../../services/documentLibraryService')>(),documentLibraryService:{versions:vi.fn(),replace:vi.fn(),downloadVersion:vi.fn()}}));
afterEach(()=>{cleanup();vi.clearAllMocks();});
const document={id:'synthetic',version:2,status:'INDEXED',documentType:'BANK_STATEMENT'} as FinancialDocument;
it('requires explicit consent and sends the selected resource and expected version',async()=>{
 vi.mocked(documentLibraryService.versions).mockResolvedValue([{version:2,current:true,contentType:'application/pdf',archivedAt:''},{version:1,current:false,contentType:'application/pdf',archivedAt:''}]);
 vi.mocked(documentLibraryService.replace).mockResolvedValue({...document,version:3,status:'PENDING'});const changed=vi.fn().mockResolvedValue(undefined);
 render(<DocumentVersionManager document={document} onChanged={changed}/>);fireEvent.click(screen.getByText('Versiones y reemplazo'));await screen.findByText('Versión 1 · Original anterior');
 const file=new File(['synthetic'],'same-name.pdf',{type:'application/pdf'});fireEvent.change(screen.getByLabelText('Archivo de reemplazo'),{target:{files:[file]}});
 expect((screen.getByText('Reemplazar original') as HTMLButtonElement).disabled).toBe(true);fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(screen.getByText('Reemplazar original'));
 await waitFor(()=>expect(documentLibraryService.replace).toHaveBeenCalledWith('synthetic',2,file,true,undefined));expect(changed).toHaveBeenCalled();
});
it('does not claim success if replacement conflicts with a newer version',async()=>{
 vi.mocked(documentLibraryService.versions).mockResolvedValue([]);vi.mocked(documentLibraryService.replace).mockRejectedValue(new Error('El documento cambió'));const changed=vi.fn();
 render(<DocumentVersionManager document={document} onChanged={changed}/>);fireEvent.click(screen.getByText('Versiones y reemplazo'));fireEvent.change(screen.getByLabelText('Archivo de reemplazo'),{target:{files:[new File(['test'],'file.pdf')]}});fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(screen.getByText('Reemplazar original'));
 expect((await screen.findByRole('alert')).textContent).toContain('El documento cambió');expect(changed).not.toHaveBeenCalled();
});
