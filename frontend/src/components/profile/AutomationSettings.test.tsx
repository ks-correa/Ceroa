// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AutomationSettings } from './AutomationSettings';
import { automationService } from '../../services/automationService';

vi.mock('../../services/automationService', () => ({ automationService: { list: vi.fn(), create: vi.fn(), revoke: vi.fn() } }));
const credential = { id: 'credential-id', name: 'n8n', allowWrites: false, createdAt: '2026-09-26', expiresAt: '2099-01-01', revokedAt: null };
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear();
  vi.mocked(automationService.list).mockResolvedValue([]);
  vi.mocked(automationService.create).mockResolvedValue({ credential, token: 'one-time-secret' });
  vi.mocked(automationService.revoke).mockResolvedValue(undefined);
});
afterEach(cleanup);

it('issues read-only by default and removes the secret when the panel closes', async () => {
  render(<AutomationSettings />);
  expect(automationService.list).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Configurar automatizaciones' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Crear credencial' }).hasAttribute('disabled')).toBe(false));
  fireEvent.click(screen.getByRole('button', { name: 'Crear credencial' }));
  const secret = await screen.findByLabelText('Credencial creada');
  expect((secret as HTMLTextAreaElement).value).toBe('one-time-secret');
  expect(automationService.create).toHaveBeenCalledWith('n8n', false, 30);
  expect(localStorage.length).toBe(0);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Cerrar automatizaciones' }).hasAttribute('disabled')).toBe(false));
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar automatizaciones' }));
  expect(screen.queryByLabelText('Credencial creada')).toBeNull();
});

it('revokes an existing credential without revealing a token from the listing', async () => {
  vi.mocked(automationService.list).mockResolvedValueOnce([credential]).mockResolvedValue([{...credential, revokedAt:'2026-09-26'}]);
  render(<AutomationSettings />);
  fireEvent.click(screen.getByRole('button', { name: 'Configurar automatizaciones' }));
  const revoke = await screen.findByRole('button', { name: 'Revocar n8n' });
  expect(screen.queryByLabelText('Credencial creada')).toBeNull();
  fireEvent.click(revoke);
  await waitFor(() => expect(automationService.revoke).toHaveBeenCalledWith('credential-id'));
  await screen.findByText('Inactiva');
});
