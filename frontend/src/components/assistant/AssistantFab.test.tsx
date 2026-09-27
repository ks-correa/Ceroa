// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AssistantFab } from './AssistantFab';
import { apiRequest } from '../../services/api';
vi.mock('../../services/api', () => ({ apiRequest: vi.fn() }));
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
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.unstubAllGlobals(); });
it('sends a question through the authenticated API and displays backend text literally', async () => {
  vi.mocked(apiRequest).mockResolvedValue({ answer: '<script>not executable</script> 1000.00' });
  render(<AssistantFab />);
  fireEvent.click(screen.getByRole('button', { name: 'Abrir asistente financiero' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Pregunta al asistente' }), { target: { value: 'Mis deudas' } });
  fireEvent.click(screen.getByRole('button', { name: 'Enviar pregunta' }));
  await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/assistant/messages', { method: 'POST', body: '{"message":"Mis deudas"}' }));
  expect(await screen.findByText(/not executable/)).toBeTruthy();
  expect(document.querySelector('script')).toBeNull();
  expect(localStorage.length).toBe(0);
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
