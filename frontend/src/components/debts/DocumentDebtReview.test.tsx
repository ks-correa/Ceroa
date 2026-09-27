// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { apiRequest } from '../../services/api';
import { DocumentDebtReview, DOCUMENT_FIELDS } from './DocumentDebtReview';
vi.mock('../../services/api',()=>({apiRequest:vi.fn()}));
vi.mock('./form/TypeSpecificSection',()=>({TypeSpecificSection:()=>null}));
const draft=()=>Object.fromEntries(DOCUMENT_FIELDS.map(([field])=>[field,null]));
const response=()=>({format:'DOCX',sheets:[],requiresSheetSelection:false,draft:{...draft(),currentBalance:2500000},evidence:[{field:'currentBalance',quote:'Saldo actual 2500000',location:'Párrafo 1'}],warnings:['Revisa antes de guardar.']});
beforeEach(()=>{vi.clearAllMocks();localStorage.clear();});afterEach(cleanup);
async function extract(){fireEvent.change(screen.getByLabelText('Documento financiero'),{target:{files:[new File(['document'],'test.docx',{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'})]}});fireEvent.click(screen.getByRole('checkbox',{name:/Autorizo enviar/}));fireEvent.click(screen.getByRole('button',{name:'Extraer borrador'}));await screen.findByLabelText('Saldo actual (COP)');}
it('requires consent, displays unknown rates, and cancellation does not write finances',async()=>{
  vi.mocked(apiRequest).mockResolvedValue(response());const cancel=vi.fn();render(<DocumentDebtReview debtId={null} onCancel={cancel} onSaved={vi.fn()}/>);
  expect(screen.getByRole('button',{name:'Extraer borrador'}).hasAttribute('disabled')).toBe(true);await extract();
  expect((screen.getByLabelText('Tasa de interés (%)') as HTMLInputElement).value).toBe('');expect((screen.getByLabelText('Modalidad de tasa') as HTMLSelectElement).value).toBe('');
  expect(screen.getByRole('button',{name:'Guardar obligación revisada'}).hasAttribute('disabled')).toBe(true);fireEvent.click(screen.getByRole('button',{name:'Cancelar lectura y volver al formulario manual'}));expect(cancel).toHaveBeenCalled();expect(apiRequest).toHaveBeenCalledTimes(1);expect(localStorage.length).toBe(0);
});
it('sends corrected and explicitly reviewed values rather than raw model output',async()=>{
  vi.mocked(apiRequest).mockResolvedValueOnce(response()).mockResolvedValueOnce({});const saved=vi.fn().mockResolvedValue(undefined);render(<DocumentDebtReview debtId={null} onCancel={vi.fn()} onSaved={saved}/>);await extract();
  fireEvent.change(screen.getByLabelText('Nombre personalizado'),{target:{value:'Préstamo revisado'}});fireEvent.change(screen.getByLabelText('Tipo de obligación'),{target:{value:'family_loan'}});fireEvent.change(screen.getByLabelText('Modalidad de tasa'),{target:{value:'NONE'}});fireEvent.change(screen.getByLabelText('Saldo actual (COP)'),{target:{value:'2400000'}});
  fireEvent.click(screen.getByRole('checkbox',{name:/Revisé los valores/}));fireEvent.click(screen.getByRole('button',{name:'Guardar obligación revisada'}));await waitFor(()=>expect(saved).toHaveBeenCalled());
  const call=vi.mocked(apiRequest).mock.calls[1];expect(call[0]).toBe('/debts');const payload=JSON.parse(call[1]?.body as string);expect(payload.currentBalance).toBe(2400000);expect(payload.interestRate).toBeNull();expect(payload.monthlyPayment).toBeNull();expect(payload.dueDateDay).toBeNull();expect(payload.name).toBe('Préstamo revisado');
});
it('keeps existing values and nulls on update until a proposal is chosen',async()=>{
  const current={name:'Actual',entity:null,type:'family_loan',rateType:'NONE',currentBalance:1000000,monthlyPayment:null,minimumPayment:null,interestRate:null,details:{},categoryLabel:'Familiar'};
  vi.mocked(apiRequest).mockResolvedValueOnce(current).mockResolvedValueOnce(response()).mockResolvedValueOnce(current).mockResolvedValueOnce({});const saved=vi.fn().mockResolvedValue(undefined);render(<DocumentDebtReview debtId="own-debt" onCancel={vi.fn()} onSaved={saved}/>);await extract();expect((screen.getByLabelText('Saldo actual (COP)')as HTMLInputElement).value).toBe('1000000');
  fireEvent.click(screen.getByRole('button',{name:'Usar propuesta de Saldo actual (COP)'}));fireEvent.click(screen.getByRole('checkbox',{name:/Revisé los valores/}));fireEvent.click(screen.getByRole('button',{name:'Guardar cambios revisados'}));await waitFor(()=>expect(saved).toHaveBeenCalled());const call=vi.mocked(apiRequest).mock.calls[3];const payload=JSON.parse(call[1]?.body as string);expect(call[0]).toBe('/debts/own-debt');expect(payload.currentBalance).toBe(2500000);expect(payload.monthlyPayment).toBeNull();expect(payload.interestRate).toBeNull();
});
it('blocks saving an edited field changed by another session',async()=>{
  const current={name:'Actual',type:'family_loan',rateType:'NONE',currentBalance:1000000,details:{}};
  vi.mocked(apiRequest).mockResolvedValueOnce(current).mockResolvedValueOnce(response()).mockResolvedValueOnce({...current,currentBalance:1500000});
  const saved=vi.fn();render(<DocumentDebtReview debtId="own-debt" onCancel={vi.fn()} onSaved={saved}/>);await extract();
  fireEvent.click(screen.getByRole('button',{name:'Usar propuesta de Saldo actual (COP)'}));fireEvent.click(screen.getByRole('checkbox',{name:/Revisé los valores/}));fireEvent.click(screen.getByRole('button',{name:'Guardar cambios revisados'}));
  await screen.findByText(/Esta obligación cambió mientras revisabas/);expect(saved).not.toHaveBeenCalled();expect(vi.mocked(apiRequest).mock.calls.some(([,options])=>options?.method==='PUT')).toBe(false);
});
it('requires sheet selection and sends only the explicitly selected sheet',async()=>{
  vi.mocked(apiRequest).mockResolvedValueOnce({format:'XLSX',sheets:['Una','Otra'],requiresSheetSelection:true,draft:null,evidence:[],warnings:[]}).mockResolvedValueOnce(response());render(<DocumentDebtReview debtId={null} onCancel={vi.fn()} onSaved={vi.fn()}/>);
  fireEvent.change(screen.getByLabelText('Documento financiero'),{target:{files:[new File(['excel'],'test.xlsx')]}});fireEvent.click(screen.getByRole('checkbox',{name:/Autorizo enviar/}));fireEvent.click(screen.getByRole('button',{name:'Extraer borrador'}));await screen.findByLabelText('Hoja a analizar');expect(screen.getByRole('button',{name:'Extraer borrador'}).hasAttribute('disabled')).toBe(true);fireEvent.change(screen.getByLabelText('Hoja a analizar'),{target:{value:'Otra'}});fireEvent.click(screen.getByRole('button',{name:'Extraer borrador'}));await screen.findByLabelText('Saldo actual (COP)');expect((vi.mocked(apiRequest).mock.calls[1][1]?.body as FormData).get('sheet')).toBe('Otra');
});
