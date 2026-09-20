// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { UpcomingDuesWidget } from '../common/UpcomingDuesWidget';
import { NotificationsDrawer } from './NotificationsDrawer';
import { TopHeader } from '../layout/TopHeader';
import * as AppContextModule from '../../context/AppContext';
import { NotificationItem, UpcomingDueItem } from '../../types';

describe('EP-12 — Vencimientos y notificaciones (HU-048, HU-049, HU-050, HU-051)', () => {
  afterEach(cleanup);

  const mockSetIsNotificationsOpen = vi.fn();
  const mockHandleMarkNotificationRead = vi.fn();
  const mockHandleMarkAllNotificationsRead = vi.fn();
  const mockNavigateToDebtDetail = vi.fn();
  const mockSetCurrentScreen = vi.fn();

  const sampleUpcomingDues: UpcomingDueItem[] = [
    {
      debtId: 'debt-1',
      debtName: 'Tarjeta Visa Gold',
      entity: 'Bancolombia',
      type: 'credit_card',
      amount: 150000,
      dueDate: '2026-09-22',
      daysUntilDue: 7,
      status: 'al_dia',
      reminderMilestone: 'SEVEN_DAYS'
    },
    {
      debtId: 'debt-2',
      debtName: 'Préstamo Personal',
      entity: 'Davivienda',
      type: 'personal_loan',
      amount: 320000,
      dueDate: '2026-09-18',
      daysUntilDue: 3,
      status: 'al_dia',
      reminderMilestone: 'THREE_DAYS'
    },
    {
      debtId: 'debt-3',
      debtName: 'Factura Servicios',
      entity: 'Particular',
      type: 'overdue_bill',
      amount: 80000,
      dueDate: '2026-09-15',
      daysUntilDue: 0,
      status: 'vence_hoy',
      reminderMilestone: 'DUE_TODAY'
    }
  ];

  const sampleNotifications: NotificationItem[] = [
    {
      id: 'notif-1',
      title: 'Vencimiento próximo: Préstamo Personal',
      message: 'Tu obligación con Préstamo Personal vence en 3 días. Monto exigible: $ 320.000.',
      type: 'due_date_reminder',
      read: false,
      date: '2026-09-15',
      eventDate: '2026-09-18',
      relatedDebtId: 'debt-2',
      relatedDebtName: 'Préstamo Personal',
      channel: 'IN_APP',
      planRestricted: false
    },
    {
      id: 'notif-2',
      title: 'Recordatorio Telegram: Tarjeta Visa Gold',
      message: 'Recordatorio sincronizado vía Telegram para el vencimiento en 7 días.',
      type: 'due_date_reminder',
      read: true,
      date: '2026-09-15',
      eventDate: '2026-09-22',
      relatedDebtId: 'debt-1',
      relatedDebtName: 'Tarjeta Visa Gold',
      channel: 'TELEGRAM',
      planRestricted: false
    },
    {
      id: 'notif-3',
      title: 'Aviso externo restringido',
      message: 'Recordatorio por Telegram requiere Ceroa Plus.',
      type: 'system',
      read: false,
      date: '2026-09-15',
      channel: 'TELEGRAM',
      planRestricted: true
    }
  ];

  const setupAppContext = (overrides: Partial<any> = {}) => {
    vi.spyOn(AppContextModule, 'useApp').mockReturnValue({
      currentScreen: 'dashboard',
      setCurrentScreen: mockSetCurrentScreen,
      userProfile: {
        id: 'u1',
        fullName: 'Usuario Ceroa',
        email: 'user@ceroa.local',
        plan: 'plus',
        initialSetupComplete: true,
        createdAt: '2026-01-01'
      },
      preferences: {
        darkMode: false,
        language: 'es',
        currency: 'COP',
        emailNotifications: true,
        dueAlertsDaysBefore: 3
      },
      handleUpdatePreferences: vi.fn(),
      debts: [],
      payments: [],
      upcomingDues: sampleUpcomingDues,
      notifications: sampleNotifications,
      unreadNotificationsCount: 2,
      isNotificationsOpen: true,
      setIsNotificationsOpen: mockSetIsNotificationsOpen,
      handleMarkNotificationRead: mockHandleMarkNotificationRead,
      handleMarkAllNotificationsRead: mockHandleMarkAllNotificationsRead,
      navigateToDebtDetail: mockNavigateToDebtDetail,
      selectedDebtId: null,
      setSelectedDebtId: vi.fn(),
      isSidebarCollapsed: false,
      toggleSidebarCollapse: vi.fn(),
      setIsMobileSidebarOpen: vi.fn(),
      formatCurrency: (amt: number) => `$ ${amt.toLocaleString('es-CO')}`,
      formatDate: (d?: string) => d || '',
      maskValue: (val: string) => val,
      isLoading: false,
      ...overrides
    } as any);
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // HU-048 — CONSULTAR PRÓXIMOS VENCIMIENTOS
  // =========================================================================
  describe('HU-048: Consultar próximos vencimientos', () => {
    it('CA-01 & CA-02: Renderiza deuda, fecha, monto exigible y estado canónico en listado', () => {
      render(
        <UpcomingDuesWidget
          variant="list"
          dues={sampleUpcomingDues}
          onSelectDebt={mockNavigateToDebtDetail}
        />
      );

      expect(screen.getByText('Tarjeta Visa Gold')).not.toBeNull();
      expect(screen.getByText('Bancolombia', { exact: false })).not.toBeNull();
      expect(screen.getByText('$ 150.000')).not.toBeNull();
      expect(screen.getByText(/22 de sept/i)).not.toBeNull();
      expect(screen.getAllByText('Al día').length).toBeGreaterThan(0);
    });

    it('CA-03 & CA-04: Distingue hitos aprobados 7 días, 3 días y 0 días (hoy) con texto e iconografía accesible', () => {
      render(
        <UpcomingDuesWidget
          variant="list"
          dues={sampleUpcomingDues}
          onSelectDebt={mockNavigateToDebtDetail}
        />
      );

      // Hito 7 días antes
      expect(screen.getByText('Hito: 7 días antes')).not.toBeNull();
      // Hito 3 días antes
      expect(screen.getByText('Hito: 3 días antes')).not.toBeNull();
      // Hito Vence hoy (0 días)
      expect(screen.getByText('Hito: Vence hoy')).not.toBeNull();

      // No solo se distingue por color sino por texto explícito y roles de accesibilidad
      const milestoneBadges = screen.getAllByTestId('due-milestone-badge');
      expect(milestoneBadges.length).toBe(3);
    });

    it('CA-01 & CA-02 & CA-03: Renderiza en vista de detalle para una obligación específica', () => {
      render(
        <UpcomingDuesWidget
          variant="detail"
          singleDue={sampleUpcomingDues[1]} // Préstamo 3 días
        />
      );

      expect(screen.getByTestId('due-detail-widget')).not.toBeNull();
      expect(screen.getByText('Hito: 3 días antes')).not.toBeNull();
      expect(screen.getByText('Al día')).not.toBeNull();
      expect(screen.getByText('$ 320.000')).not.toBeNull();
      expect(screen.getByText('Faltan 3 días para la fecha límite')).not.toBeNull();
    });

    it('CA-06: Muestra estado comprensible si no existen vencimientos próximos', () => {
      render(
        <UpcomingDuesWidget
          variant="list"
          dues={[]}
        />
      );

      expect(screen.getByTestId('upcoming-dues-empty')).not.toBeNull();
      expect(screen.getByText('Sin vencimientos próximos')).not.toBeNull();
      expect(screen.getByText(/No tienes obligaciones pendientes por vencer/i)).not.toBeNull();
    });
  });

  // =========================================================================
  // HU-049 — CONSULTAR CENTRO DE NOTIFICACIONES
  // =========================================================================
  describe('HU-049: Consultar centro de notificaciones', () => {
    it('CA-01: El icono de campana en TopHeader muestra badge numérico accesible de no leídas', () => {
      setupAppContext({ unreadNotificationsCount: 2 });
      render(<TopHeader />);

      const bellBtn = screen.getByRole('button', { name: /2 notificaciones no leídas/i });
      expect(bellBtn).not.toBeNull();

      const badge = screen.getByTestId('notifications-unread-badge');
      expect(badge.textContent).toBe('2');
    });

    it('CA-02, CA-03 & CA-04: Centro de notificaciones lista títulos, fechas, mensajes, deuda asociada y leído/no leído', () => {
      setupAppContext();
      render(<NotificationsDrawer />);

      // CA-02: Título, fecha y mensaje
      expect(screen.getByText('Vencimiento próximo: Préstamo Personal')).not.toBeNull();
      expect(screen.getByText(/vence en 3 días/i)).not.toBeNull();

      // CA-03: Identificar deuda relacionada
      expect(screen.getByText('Préstamo Personal', { selector: 'span' })).not.toBeNull();

      // CA-04: Diferenciación de leído y no leído con texto e iconografía
      expect(screen.getAllByText('No leída').length).toBeGreaterThan(0);
      expect(screen.getByText('Leída')).not.toBeNull();
    });

    it('CA-05: Muestra estado vacío comprensible cuando no hay notificaciones', () => {
      setupAppContext({ notifications: [], unreadNotificationsCount: 0 });
      render(<NotificationsDrawer />);

      expect(screen.getByTestId('notifications-empty')).not.toBeNull();
      expect(screen.getByText('Sin notificaciones')).not.toBeNull();
      expect(screen.getByText(/No tienes eventos financieros ni avisos de vencimientos/i)).not.toBeNull();
    });
  });

  // =========================================================================
  // HU-050 — ABRIR UNA NOTIFICACIÓN
  // =========================================================================
  describe('HU-050: Abrir una notificación', () => {
    it('CA-01, CA-02, CA-03 & CA-04: Al abrir notificación con deuda, confirma lectura, actualiza badge y navega al detalle', async () => {
      setupAppContext();
      render(<NotificationsDrawer />);

      const unreadItem = screen.getByTestId('notification-item-notif-1');
      fireEvent.click(unreadItem);

      // CA-03: Marca lectura autoritativa
      expect(mockHandleMarkNotificationRead).toHaveBeenCalledWith('notif-1');

      // CA-02: Cierra drawer y navega a la deuda asociada
      await waitFor(() => {
        expect(mockSetIsNotificationsOpen).toHaveBeenCalledWith(false);
        expect(mockNavigateToDebtDetail).toHaveBeenCalledWith('debt-2');
      });
    });

    it('CA-02: Notificación sin deuda no inventa una navegación a deuda inexistente', async () => {
      setupAppContext();
      render(<NotificationsDrawer />);

      const noDebtItem = screen.getByTestId('notification-item-notif-3');
      fireEvent.click(noDebtItem);

      expect(mockHandleMarkNotificationRead).toHaveBeenCalledWith('notif-3');
      expect(mockNavigateToDebtDetail).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // HU-051 — REPRESENTAR RECORDATORIOS ENVIADOS POR TELEGRAM
  // =========================================================================
  describe('HU-051: Representar recordatorios enviados por Telegram', () => {
    it('CA-01 & CA-03: Identifica origen/canal Telegram cuando el servicio lo informa', () => {
      setupAppContext();
      render(<NotificationsDrawer />);

      const telegramBadges = screen.getAllByTestId('channel-telegram-badge');
      expect(telegramBadges.length).toBeGreaterThan(0);
      expect(telegramBadges[0].textContent).toContain('Telegram');
    });

    it('CA-04: Representa restricción de plan sin simular entrega externa falsa', () => {
      setupAppContext();
      render(<NotificationsDrawer />);

      const restrictedBadge = screen.getByTestId('plan-restricted-badge');
      expect(restrictedBadge).not.toBeNull();
      expect(restrictedBadge.textContent).toContain('Plan Cero: Exclusivo Plus');
    });
  });
});
