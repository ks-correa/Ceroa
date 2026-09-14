// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RegistrationValues, validateRegistration } from './auth.validation';
import { LoginView } from './LoginView';
import { RegisterView } from './RegisterView';
import { ExternalRegistrationView } from './ExternalRegistrationView';
import { useRegisterForm } from './useRegisterForm';
import { useLoginForm, REMEMBER_EMAIL_KEY } from './useLoginForm';
import { authService } from '../../services/authService';

const app = vi.hoisted(() => ({ handleLogin: vi.fn(), handleRegister: vi.fn(), setCurrentScreen: vi.fn() }));
vi.mock('../../context/AppContext', () => ({ useApp: () => app }));
vi.mock('../onboarding/DesktopOnboardingPanel', () => ({ DesktopOnboardingPanel: () => null }));
vi.mock('../../services/authService', () => ({ authService: { startExternal: vi.fn(), pendingExternal: vi.fn(), completeExternal: vi.fn(), cancelExternal: vi.fn() } }));
const valid: RegistrationValues = { fullName: 'Ana García', email: 'ana@example.com', phone: '+573001234567', birthDate: '1990-01-20', password: 'Password!', confirmPassword: 'Password!', acceptTerms: true, acceptPrivacy: true };
beforeEach(() => { localStorage.clear(); vi.resetAllMocks(); });
afterEach(cleanup);

describe('registration validation', () => {
  it('accepts a valid adult', () => expect(validateRegistration(valid)).toEqual({}));
  it.each([
    ['fullName', '   '], ['email', 'bad'], ['email', 'a @example.com'], ['phone', 'abc1234567'], ['phone', ''],
    ['birthDate', '2999-01-01'], ['birthDate', '2020-01-01'], ['birthDate', '2000-02-30'], ['birthDate', ''],
    ['password', 'weak'], ['password', 'Password '], ['password', 'A!' + 'é'.repeat(36)],
    ['confirmPassword', 'different!'], ['acceptTerms', false], ['acceptPrivacy', false]
  ])('rejects %s = %s', (field, value) => expect(validateRegistration({ ...valid, [field as string]: value })).toHaveProperty(field as string));
  it('requires every field', () => {
    for (const field of Object.keys(valid)) expect(validateRegistration({ ...valid, [field]: field.startsWith('accept') ? false : '' })).toHaveProperty(field);
  });
  it('accepts exactly eighteen and rejects one day younger', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-14T18:00:00Z'));
    expect(validateRegistration({ ...valid, birthDate: '2008-09-14' }).birthDate).toBeUndefined();
    expect(validateRegistration({ ...valid, birthDate: '2008-09-15' }).birthDate).toBeDefined();
    vi.useRealTimers();
  });
});

describe('forms and preferences', () => {
  it('invalid login never calls backend and associates error to email', () => {
    render(<LoginView />);
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'bad' } });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(app.handleLogin).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Correo electrónico').getAttribute('aria-describedby')).toBe('email-error');
    expect(document.activeElement).toBe(screen.getByLabelText('Correo electrónico'));
  });
  it('hides password by default and toggles accessibly', () => {
    render(<LoginView />);
    expect(screen.getByLabelText('Contraseña').getAttribute('type')).toBe('password');
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));
    expect(screen.getByLabelText('Contraseña').getAttribute('type')).toBe('text');
  });
  it('waits for backend and clears password after rejection', async () => {
    app.handleLogin.mockRejectedValue(new Error('Correo o contraseña incorrectos.'));
    render(<LoginView />);
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: valid.email } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: valid.password } });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    await screen.findByRole('alert');
    expect((screen.getByLabelText('Contraseña') as HTMLInputElement).value).toBe('');
    expect(app.setCurrentScreen).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0);
  });
  it('persists only authorized email, prefills it and removes immediately when unchecked', async () => {
    const login = vi.fn().mockResolvedValue(undefined);
    const first = renderHook(() => useLoginForm(login));
    act(() => { first.result.current.setEmail(valid.email); first.result.current.setPassword(valid.password); first.result.current.toggleRemember(true); });
    await act(() => first.result.current.submit({ preventDefault() {} } as React.FormEvent));
    expect(localStorage.length).toBe(1); expect(localStorage.getItem(REMEMBER_EMAIL_KEY)).toBe(valid.email);
    first.unmount();
    const second = renderHook(() => useLoginForm(login));
    expect(second.result.current.email).toBe(valid.email); expect(second.result.current.password).toBe('');
    act(() => second.result.current.toggleRemember(false));
    expect(localStorage.length).toBe(0);
  });
  it('preserves editable personal fields but clears both passwords after registration error', async () => {
    const register = vi.fn().mockRejectedValue(new Error('Intenta nuevamente.'));
    const { result } = renderHook(() => useRegisterForm(register, valid));
    await act(() => result.current.submit({ preventDefault() {} } as React.FormEvent));
    expect(result.current.values).toEqual({ ...valid, password: '', confirmPassword: '' });
  });
  it('registration shows and focuses individual errors without sending whitespace name', () => {
    render(<RegisterView />);
    fireEvent.change(screen.getByLabelText('Nombre completo'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(app.handleRegister).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(screen.getByLabelText('Nombre completo'));
  });
  it.each(['Google', 'Microsoft'])('offers %s on registration and reports unavailable provider', async provider => {
    vi.mocked(authService.startExternal).mockRejectedValue(new Error('Proveedor no disponible.'));
    render(<RegisterView />);
    fireEvent.click(screen.getByRole('button', { name: 'Continuar con ' + provider }));
    await screen.findByRole('alert');
    expect(authService.startExternal).toHaveBeenCalledWith(provider.toLowerCase());
    expect(app.handleRegister).not.toHaveBeenCalled();
  });
  it.each(['google', 'microsoft'])('requires missing %s data and consent without passwords', async provider => {
    vi.mocked(authService.pendingExternal).mockResolvedValue({ provider, email: valid.email, fullName: valid.fullName });
    render(<ExternalRegistrationView />);
    await screen.findByLabelText('Celular');
    expect(screen.queryByLabelText('Contraseña')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar registro' }));
    await waitFor(() => expect(screen.getByLabelText('Celular').getAttribute('aria-invalid')).toBe('true'));
    expect(authService.completeExternal).not.toHaveBeenCalled();
  });
});
