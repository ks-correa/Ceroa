// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AssistantFab } from './AssistantFab';
import { apiRequest } from '../../services/api';
vi.mock('../../services/api', () => ({ apiRequest: vi.fn() }));
it('labels an HTTP-success response as partial when the backend reports partial evidence',async()=>{
 vi.mocked(apiRequest).mockResolvedValueOnce({answer:'Solo hay evidencia de una parte.',functionalStatus:'PARTIAL'});
 render(<AssistantFab/>);fireEvent.click(screen.getByRole('button',{name:'Abrir asistente financiero'}));
 fireEvent.change(screen.getByRole('textbox'),{target:{value:'Analiza mi información'}});fireEvent.click(screen.getByRole('button',{name:'Enviar pregunta'}));
 expect(await screen.findByText('Respuesta parcial')).toBeTruthy();expect(screen.getByText('Solo hay evidencia de una parte.')).toBeTruthy();
});
it('starts a new conversation only after the backend forgets the previous context',async()=>{
  vi.mocked(apiRequest).mockResolvedValueOnce({answer:'Respuesta anterior'}).mockResolvedValueOnce(undefined);
  render(<AssistantFab/>);fireEvent.click(screen.getByRole('button',{name:'Abrir asistente financiero'}));
  fireEvent.change(screen.getByRole('textbox'),{target:{value:'Mi pregunta'}});fireEvent.click(screen.getByRole('button',{name:'Enviar pregunta'}));
  await screen.findByText('Respuesta anterior');fireEvent.click(screen.getByRole('button',{name:'Nueva conversación'}));
  await waitFor(()=>expect(screen.queryByText('Respuesta anterior')).toBeNull());
  expect(apiRequest).toHaveBeenCalledWith('/assistant/conversation',{method:'DELETE'});
});
it('resizes with the keyboard and restores geometry without losing the conversation', async () => {
  render(<AssistantFab />);
  fireEvent.click(screen.getByRole('button',{name:'Abrir asistente financiero'}));
  const panel = screen.getByRole('region',{name:'Asistente financiero'});
  const before = panel.style.width;
  fireEvent.keyDown(screen.getByRole('button',{name:'Redimensionar desde el borde izquierdo'}),{key:'ArrowLeft'});
  expect(panel.style.width).not.toBe(before);
  const resized = panel.style.width;
  fireEvent.change(screen.getByRole('textbox'),{target:{value:'Borrador conservado'}});
  fireEvent.click(screen.getByRole('button',{name:'Maximizar ventana'}));
  fireEvent.click(screen.getByRole('button',{name:'Restaurar tamaño anterior'}));
  expect(panel.style.width).toBe(resized);
  expect(screen.getByRole('textbox')).toHaveProperty('value','Borrador conservado');
  expect(JSON.parse(localStorage.getItem('ceroa.assistant.size')!)).toEqual({width:432,height:650});
  fireEvent.click(screen.getByRole('button',{name:'Cerrar asistente'}));
  fireEvent.click(screen.getByRole('button',{name:'Abrir asistente financiero'}));
  expect(screen.getByRole('textbox')).toHaveProperty('value','Borrador conservado');
});
it('sends captured audio using the main send button', async () => {
  const createObjectURL = vi.fn((_blob: Blob) => 'blob:recorded-audio');
  const revokeObjectURL = vi.fn();
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL = createObjectURL;
    static revokeObjectURL = revokeObjectURL;
  });
  vi.mocked(apiRequest).mockResolvedValue({ answer: 'Audio recibido' });
  const stopTrack = vi.fn();
  class Recorder {
    static isTypeSupported() { return true; }
    state = 'inactive'; mimeType = 'audio/webm;codecs=opus';
    ondataavailable: ((event: { data: Blob }) => void) | null = null;
    onstop: (() => void) | null = null;
    start() { this.state = 'recording'; }
    stop() {
      this.state = 'inactive';
      this.ondataavailable?.({ data: new Blob(['captured audio']) });
      this.onstop?.();
    }
  }
  vi.stubGlobal('MediaRecorder', Recorder);
  const original = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: stopTrack }] }) } });
  try {
    render(<AssistantFab />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir asistente financiero' }));
    fireEvent.click(screen.getByRole('button', { name: 'Grabar audio' }));
    const send = await screen.findByRole('button', { name: 'Enviar audio' });
    expect(send).toHaveProperty('disabled', false);
    expect(screen.getByRole('meter')).toBeTruthy();
    expect(screen.getByRole('meter').querySelectorAll('span')).toHaveLength(24);
    expect(apiRequest).not.toHaveBeenCalled();
    fireEvent.click(send);
    await waitFor(() => expect(apiRequest).toHaveBeenCalledTimes(1));
    const payload = JSON.parse(vi.mocked(apiRequest).mock.calls[0][1]!.body as string);
    expect(payload.mime).toBe('audio/webm');
    expect(atob(payload.audio)).toBe('captured audio');
    expect(stopTrack).toHaveBeenCalled();
    expect(await screen.findByText('Audio recibido')).toBeTruthy();
    const player = screen.getByLabelText('Audio enviado');
    expect(player).toHaveProperty('src', 'blob:recorded-audio');
    expect(player).toHaveProperty('controls', true);
    expect(createObjectURL.mock.calls[0][0]).toBeInstanceOf(Blob);
    expect(screen.queryByText('Consulta por audio')).toBeNull();
    cleanup();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:recorded-audio');
  } finally {
    if (original) Object.defineProperty(navigator, 'mediaDevices', original);
    else Reflect.deleteProperty(navigator, 'mediaDevices');
  }
});
afterEach(() => { cleanup(); localStorage.clear(); vi.clearAllMocks(); vi.unstubAllGlobals(); });
it('sends a question through the authenticated API and displays backend text literally', async () => {
  vi.mocked(apiRequest).mockResolvedValue({ answer: '<script>not executable</script> 1000.00' });
  render(<AssistantFab />);
  fireEvent.click(screen.getByRole('button', { name: 'Abrir asistente financiero' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Pregunta al asistente' }), { target: { value: 'Mis deudas' } });
  fireEvent.click(screen.getByRole('button', { name: 'Enviar pregunta' }));
  await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/assistant/messages', { method: 'POST', body: '{"message":"Mis deudas"}' }));
  expect(await screen.findByText(/not executable/)).toBeTruthy();
  expect(document.querySelector('script')).toBeNull();
  expect(Object.keys(localStorage)).toEqual(['ceroa.assistant.size']);
});
it('keeps follow-up questions scoped to a selected indexed document', async () => {
  vi.mocked(apiRequest).mockImplementation(async path => {
    if(path === '/financial-documents/search')return {documents:[{id:'selected-doc',status:'INDEXED',documentType:'BANK_STATEMENT',financialEntity:'Banco de prueba',periodStart:'2026-09-01'}],sources:[]};
    if(path === '/assistant/messages')return {answer:'Respuesta del archivo'};
    throw new Error('Unexpected request');
  });
  render(<AssistantFab />);
  fireEvent.click(screen.getByRole('button',{name:'Abrir asistente financiero'}));
  fireEvent.click(screen.getByRole('button',{name:'Consultar archivos'}));
  fireEvent.click(screen.getByRole('button',{name:'Ver mis documentos'}));
  fireEvent.click(await screen.findByRole('button',{name:'Continuar conversación con este archivo'}));
  expect(screen.getByText('Conversación enfocada en este archivo')).toBeTruthy();
  fireEvent.change(screen.getByRole('textbox',{name:'Pregunta al asistente'}),{target:{value:'¿Qué movimientos contiene?'}});
  fireEvent.click(screen.getByRole('button',{name:'Enviar pregunta'}));
  await waitFor(()=>expect(apiRequest).toHaveBeenCalledWith('/assistant/messages',{method:'POST',body:JSON.stringify({message:'¿Qué movimientos contiene?',documentId:'selected-doc'})}));
  fireEvent.click(screen.getByRole('button',{name:'Analizar varios extractos'}));
  expect(screen.queryByText('Conversación enfocada en este archivo')).toBeNull();
  expect((screen.getByRole('textbox',{name:'Pregunta al asistente'}) as HTMLTextAreaElement).value).toContain('septiembre de 2026');
  fireEvent.change(screen.getByRole('textbox',{name:'Pregunta al asistente'}),{target:{value:'Analiza todos mis extractos de septiembre de 2026: ¿cuánto pagué?'}});
  fireEvent.click(screen.getByRole('button',{name:'Enviar pregunta'}));
  await waitFor(()=>expect(apiRequest).toHaveBeenCalledWith('/assistant/messages',{method:'POST',body:JSON.stringify({message:'Analiza todos mis extractos de septiembre de 2026: ¿cuánto pagué?'})}));
});
it('shows a failed request without claiming success or exposing financial values', async () => {
  vi.mocked(apiRequest).mockRejectedValue(new Error('No pude consultar tu información.'));
  render(<AssistantFab />);
  fireEvent.click(screen.getByRole('button', { name: 'Abrir asistente financiero' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Pregunta al asistente' }), { target: { value: 'Pagos' } });
  fireEvent.click(screen.getByRole('button', { name: 'Enviar pregunta' }));
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'No pude consultar tu información.');
});
it('closing the assistant stops the microphone without sending the unfinished recording', async () => {
  const stop = vi.fn();
  class Recorder {
    static isTypeSupported() { return true; }
    state = 'inactive'; mimeType = 'audio/webm'; onstop: (() => void) | null = null;
    start() { this.state = 'recording'; }
    stop() { this.state = 'inactive'; this.onstop?.(); }
  }
  vi.stubGlobal('MediaRecorder', Recorder);
  const original = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] }) } });
  try {
    render(<AssistantFab />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir asistente financiero' }));
    fireEvent.click(screen.getByRole('button', { name: 'Grabar audio' }));
    await screen.findByRole('button', { name: 'Enviar audio' });
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar asistente' }));
    expect(stop).toHaveBeenCalled(); expect(apiRequest).not.toHaveBeenCalled();
  } finally {
    if (original) Object.defineProperty(navigator, 'mediaDevices', original);
    else Reflect.deleteProperty(navigator, 'mediaDevices');
  }
});
it('explains microphone permission denial and allows another attempt', async () => {
  class Recorder { static isTypeSupported() { return true; } }
  vi.stubGlobal('MediaRecorder', Recorder);
  const original = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
  const getUserMedia = vi.fn().mockRejectedValue(new DOMException('Permission denied', 'NotAllowedError'));
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
  try {
    render(<AssistantFab />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir asistente financiero' }));
    fireEvent.click(screen.getByRole('button', { name: 'Grabar audio' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Permite el');
    expect(screen.getByRole('button', { name: 'Grabar audio' })).toHaveProperty('disabled', false);
    expect(apiRequest).not.toHaveBeenCalled();
  } finally {
    if (original) Object.defineProperty(navigator, 'mediaDevices', original);
    else Reflect.deleteProperty(navigator, 'mediaDevices');
  }
});
it('cancels a pending microphone request when the panel closes', async () => {
  const stop = vi.fn();
  const start = vi.fn();
  class Recorder { static isTypeSupported() { return true; } start = start; }
  vi.stubGlobal('MediaRecorder', Recorder);
  const original = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
  let resolveMedia!: (media: unknown) => void;
  const getUserMedia = vi.fn(() => new Promise(resolve => { resolveMedia = resolve; }));
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
  try {
    render(<AssistantFab />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir asistente financiero' }));
    fireEvent.click(screen.getByRole('button', { name: 'Grabar audio' }));
    expect(screen.getByRole('status').textContent).toContain('Esperando permiso');
    expect(screen.getByRole('button', { name: 'Grabar audio' })).toHaveProperty('disabled', true);
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar asistente' }));
    resolveMedia({ getTracks: () => [{ stop }] });
    await waitFor(() => expect(stop).toHaveBeenCalled());
    expect(start).not.toHaveBeenCalled();
    expect(apiRequest).not.toHaveBeenCalled();
  } finally {
    if (original) Object.defineProperty(navigator, 'mediaDevices', original);
    else Reflect.deleteProperty(navigator, 'mediaDevices');
  }
});

it('opens a structured mail preview and sends nothing until the user confirms', async()=>{
 const code='ABCDEFGHIJKLMNOPQRST';
 vi.mocked(apiRequest).mockResolvedValueOnce({answer:'Propuesta preparada.',mailProposal:{confirmationCode:code}})
  .mockResolvedValueOnce({recipient:'fixture@example.invalid',subject:'Resumen financiero',message:'Contenido verificado',provider:'GOOGLE'})
  .mockResolvedValueOnce({answer:'Autorización registrada.'});
 render(<AssistantFab/>);fireEvent.click(screen.getByRole('button',{name:'Abrir asistente financiero'}));
 fireEvent.change(screen.getByRole('textbox'),{target:{value:'Manda un correo con mis deudas'}});fireEvent.click(screen.getByRole('button',{name:'Enviar pregunta'}));
 await screen.findByText('Contenido verificado');expect(screen.getByText('Para: fixture@example.invalid')).toBeTruthy();
 expect(apiRequest).toHaveBeenCalledTimes(2);expect(vi.mocked(apiRequest).mock.calls[1][0]).toBe('/workspace-actions/'+code+'/draft');
 await waitFor(()=>expect(screen.getByRole('button',{name:'Confirmar propuesta'})).toHaveProperty('disabled',false));
 fireEvent.click(screen.getByRole('button',{name:'Confirmar propuesta'}));await screen.findByText('Autorización registrada.');
 expect(JSON.parse(vi.mocked(apiRequest).mock.calls[2][1]!.body as string).message).toBe('Confirmar envio '+code);
 expect(screen.queryByRole('region',{name:'Revisión de correo'})).toBeNull();
});
it('shows calendar slots and requires a separate confirmation after choosing one',async()=>{
 const slot={start:'2026-11-20T10:00:00-05:00',end:'2026-11-20T10:30:00-05:00'};
 vi.mocked(apiRequest).mockResolvedValueOnce({answer:'Consulté Calendar.',bookingAvailability:{status:'AVAILABLE',message:'Elige un horario.',timezone:'America/Bogota',minDate:'2026-11-19',maxDate:'2026-12-03',slots:[slot]}})
  .mockResolvedValueOnce({code:'ABCDEFGHIJKLMNOPQRST',status:'PROPOSED',start:slot.start});
 render(<AssistantFab/>);fireEvent.click(screen.getByRole('button',{name:'Abrir asistente financiero'}));
 fireEvent.change(screen.getByRole('textbox'),{target:{value:'Horarios para asesoría'}});fireEvent.click(screen.getByRole('button',{name:'Enviar pregunta'}));
 const panel=await screen.findByRole('region',{name:'Horarios de asesoría'});expect(screen.queryByRole('button',{name:'Confirmar asesoría'})).toBeNull();
 const slotButton=Array.from(panel.querySelectorAll('button')).find(b=>b.textContent?.includes('10:00'))!;fireEvent.click(slotButton);
 await screen.findByRole('button',{name:'Confirmar asesoría'});expect(apiRequest).toHaveBeenCalledTimes(2);
 expect(vi.mocked(apiRequest).mock.calls[1][0]).toBe('/support/bookings');
});
