// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MobileOnboarding } from './MobileOnboarding';
import { OnboardingContent } from './OnboardingContent';
import { useMobileOnboarding } from './useMobileOnboarding';

const Harness = () => {
  const { isOpen, dismiss } = useMobileOnboarding();
  return <MobileOnboarding open={isOpen} onDismiss={dismiss} />;
};

describe('onboarding móvil', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('aparece en la primera visita y cerrar guarda el indicador', async () => {
    render(<Harness />);
    const close = await screen.findByRole('button', { name: 'Cerrar introducción' });
    fireEvent.click(close);

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(localStorage.getItem('ceroa_onboarding_seen')).toBe('true');
  });

  it('omitir evita la aparición automática en una visita recurrente', async () => {
    const firstVisit = render(<Harness />);
    fireEvent.click(await screen.findByRole('button', { name: 'Omitir y continuar a iniciar sesión' }));
    firstVisit.unmount();

    render(<Harness />);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('vuelve a aparecer después de eliminar el indicador local', async () => {
    localStorage.setItem('ceroa_onboarding_seen', 'true');
    const recurrentVisit = render(<Harness />);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    recurrentVisit.unmount();

    localStorage.removeItem('ceroa_onboarding_seen');
    render(<Harness />);
    expect(await screen.findByRole('dialog')).not.toBeNull();
  });
});

describe('contenido informativo', () => {
  afterEach(cleanup);

  it('incluye todas las capacidades sin capturar datos', () => {
    render(<OnboardingContent />);

    expect(screen.getByText('Organiza tus deudas')).not.toBeNull();
    expect(screen.getByText('Elige una estrategia de pago')).not.toBeNull();
    expect(screen.getByText('Sigue tu progreso')).not.toBeNull();
    expect(screen.getByText('Explora escenarios con Ceroa Plus')).not.toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
  });
});
