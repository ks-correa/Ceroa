// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AssistantFab } from './AssistantFab';
import { apiRequest } from '../../services/api';
vi.mock('../../services/api', () => ({ apiRequest: vi.fn() }));
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
    await screen.findByRole('button', { name: 'Enviar grabación' });
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar asistente' }));
    expect(stop).toHaveBeenCalled(); expect(apiRequest).not.toHaveBeenCalled();
  } finally {
    if (original) Object.defineProperty(navigator, 'mediaDevices', original);
    else Reflect.deleteProperty(navigator, 'mediaDevices');
  }
});
