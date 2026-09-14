// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { RecoveryView } from './RecoveryView';
import { recoveryService } from '../../services/recoveryService';
import { ApiError } from '../../services/api';
const app = vi.hoisted(() => ({ setCurrentScreen: vi.fn() }));
vi.mock('../../context/AppContext', () => ({ useApp: () => app }));
vi.mock('../onboarding/DesktopOnboardingPanel', () => ({ DesktopOnboardingPanel: () => null }));
vi.mock('../../services/recoveryService', () => ({ recoveryService: { request: vi.fn(), verify: vi.fn(), reset: vi.fn() } }));
beforeEach(() => {
  vi.resetAllMocks(); localStorage.clear(); sessionStorage.clear();
  vi.mocked(recoveryService.request).mockResolvedValue({ requestId: 'request-id', message: 'Solicitud aceptada. Si el correo corresponde a una cuenta activa, recibirás un código.' });
  vi.mocked(recoveryService.verify).mockResolvedValue(); vi.mocked(recoveryService.reset).mockResolvedValue();
});
afterEach(cleanup);
const fill = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
async function request() {
  fill('Correo electrónico', 'ana@example.com'); fireEvent.click(screen.getByRole('button', { name: 'Solicitar código' }));
  await screen.findByLabelText('Código de recuperación');
}
async function verify() {
  fill('Código de recuperación', '12345678'); fireEvent.click(screen.getByRole('button', { name: 'Verificar código' }));
  await screen.findByLabelText('Nueva contraseña');
}
it.each(['', 'bad', 'a @example.com'])('rejects email %s before sending and focuses accessible error', value => {
  render(<RecoveryView />); fill('Correo electrónico', value);
  fireEvent.click(screen.getByRole('button', { name: 'Solicitar código' }));
  expect(recoveryService.request).not.toHaveBeenCalled();
  expect(document.activeElement).toBe(screen.getByLabelText('Correo electrónico'));
  expect(screen.getByLabelText('Correo electrónico').getAttribute('aria-describedby')).toBe('email-error');
});
it('shows sending and service failure without advancing', async () => {
  let reject!: (error: Error) => void;
  vi.mocked(recoveryService.request).mockImplementation(() => new Promise((_, fail) => { reject = fail; }));
  render(<RecoveryView />); fill('Correo electrónico', 'ana@example.com');
  fireEvent.click(screen.getByRole('button', { name: 'Solicitar código' }));
  expect(screen.getByRole('button', { name: 'Procesando…' }).closest('fieldset')?.disabled).toBe(true);
  reject(new ApiError('Recuperación no disponible.', 503));
  expect((await screen.findByRole('alert')).textContent).toContain('no disponible');
  expect(screen.queryByLabelText('Código de recuperación')).toBeNull();
});
it('rejects empty code before sending', async () => {
  render(<RecoveryView />); await request();
  fireEvent.click(screen.getByRole('button', { name: 'Verificar código' }));
  expect(recoveryService.verify).not.toHaveBeenCalled();
  expect(document.activeElement).toBe(screen.getByLabelText('Código de recuperación'));
});
it.each(['Código inválido.', 'El código venció.', 'Se agotaron los intentos.', 'Servicio no disponible.'])('represents backend rejection: %s', async message => {
  vi.mocked(recoveryService.verify).mockRejectedValue(new ApiError(message, 422));
  render(<RecoveryView />); await request(); fill('Código de recuperación', '12345678');
  fireEvent.click(screen.getByRole('button', { name: 'Verificar código' }));
  expect((await screen.findByRole('alert')).textContent).toBe(message);
  expect(screen.queryByLabelText('Nueva contraseña')).toBeNull();
});
it.each([['', ''], ['Aa!1234', 'Aa!1234'], ['lowercase!', 'lowercase!'], ['NoSpecial123', 'NoSpecial123'], ['Valid!123', 'Different!']])('blocks invalid password pair %s', async (password, confirmation) => {
  render(<RecoveryView />); await request(); await verify();
  fill('Nueva contraseña', password); fill('Confirmar contraseña', confirmation);
  fireEvent.click(screen.getByRole('button', { name: 'Actualizar contraseña' }));
  expect(recoveryService.reset).not.toHaveBeenCalled();
});
it('completes all steps only after backend confirmation without persisting credentials', async () => {
  render(<RecoveryView />); await request(); await verify();
  fill('Nueva contraseña', 'NewPassword!'); fill('Confirmar contraseña', 'NewPassword!');
  expect(screen.getByLabelText('Nueva contraseña').getAttribute('type')).toBe('password');
  fireEvent.click(screen.getByRole('button', { name: 'Mostrar nueva contraseña' }));
  expect(screen.getByLabelText('Nueva contraseña').getAttribute('type')).toBe('text');
  fireEvent.click(screen.getByRole('button', { name: 'Actualizar contraseña' }));
  await screen.findByRole('heading', { name: 'Contraseña actualizada' });
  expect(recoveryService.reset).toHaveBeenCalledWith('request-id', 'NewPassword!', 'NewPassword!');
  expect(localStorage.length).toBe(0); expect(sessionStorage.length).toBe(0);
  fireEvent.click(screen.getByRole('button', { name: 'Volver a Inicio de sesión' }));
  expect(app.setCurrentScreen).toHaveBeenCalledWith('login');
});
it('clears password on backend failure and can restart the flow', async () => {
  vi.mocked(recoveryService.reset).mockRejectedValue(new ApiError('La autorización venció.', 422));
  render(<RecoveryView />); await request(); await verify();
  fill('Nueva contraseña', 'NewPassword!'); fill('Confirmar contraseña', 'NewPassword!');
  fireEvent.click(screen.getByRole('button', { name: 'Actualizar contraseña' }));
  await screen.findByRole('alert');
  await waitFor(() => expect((screen.getByLabelText('Nueva contraseña') as HTMLInputElement).value).toBe(''));
  fireEvent.click(screen.getByRole('button', { name: 'Solicitar otro código o cambiar correo' }));
  expect(screen.queryByLabelText('Nueva contraseña')).toBeNull();
  expect(screen.getByLabelText('Correo electrónico')).toBeTruthy();
});
