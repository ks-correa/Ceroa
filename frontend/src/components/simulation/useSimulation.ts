import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../services/api';
import { simulationService } from '../../services/simulationService';
import {
  Debt,
  SimulationEventItem,
  SimulationRequestPayload,
  SimulationResponsePayload,
  StrategyType
} from '../../types';

export type SimulationUiStatus =
  | 'EMPTY'
  | 'LOADING'
  | 'SUCCESS'
  | 'INSUFFICIENT_DATA'
  | 'ERROR'
  | 'PLAN_RESTRICTED';

let nextEventId = 1;

export const useSimulation = (
  debts: Debt[],
  activeStrategy: StrategyType,
  isPlus: boolean
) => {
  const activeDebts = debts.filter((d) => d.currentBalance > 0);
  const initialDebtId = activeDebts.length > 0 ? activeDebts[0].id : '';

  const [selectedDebtId, setSelectedDebtId] = useState<string>(initialDebtId);
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyType>(activeStrategy || 'snowball');
  const [events, setEvents] = useState<SimulationEventItem[]>([
    { id: `event-${nextEventId++}`, period: 1, extraPayment: undefined, modifiedMonthlyPayment: undefined }
  ]);
  const [status, setStatus] = useState<SimulationUiStatus>(isPlus ? 'EMPTY' : 'PLAN_RESTRICTED');
  const [result, setResult] = useState<SimulationResponsePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [eventErrors, setEventErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isPlus) {
      setStatus('PLAN_RESTRICTED');
      setResult(null);
    } else if (status === 'PLAN_RESTRICTED') {
      setStatus('EMPTY');
    }
  }, [isPlus]);

  useEffect(() => {
    if (activeDebts.length > 0 && !activeDebts.some((d) => d.id === selectedDebtId)) {
      setSelectedDebtId(activeDebts[0].id);
    }
  }, [debts, selectedDebtId]);

  const addEvent = useCallback(() => {
    const nextPeriod = events.length > 0
      ? Math.max(...events.map((e) => e.period || 1)) + 1
      : 1;
    setEvents((prev) => [
      ...prev,
      { id: `event-${nextEventId++}`, period: nextPeriod, extraPayment: undefined, modifiedMonthlyPayment: undefined }
    ]);
  }, [events]);

  const updateEvent = useCallback((id: string, updates: Partial<SimulationEventItem>) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updates } : e))
    );
    setEventErrors((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  }, []);

  const removeEvent = useCallback((id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    setEventErrors((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  }, []);

  const validateEventsLocally = (): boolean => {
    const errors: Record<string, string> = {};

    if (!selectedDebtId) {
      setError('Debes seleccionar una obligación para simular.');
      return false;
    }

    if (events.length === 0) {
      setError('Agrega al menos un evento hipotético para ejecutar la simulación.');
      return false;
    }

    for (const ev of events) {
      if (!ev.date && (!ev.period || ev.period < 1)) {
        errors[ev.id] = 'Indica un periodo válido (mayor o igual a 1) o una fecha futura.';
        continue;
      }

      const hasExtra = ev.extraPayment !== undefined && ev.extraPayment !== null;
      const hasModified = ev.modifiedMonthlyPayment !== undefined && ev.modifiedMonthlyPayment !== null;

      if (!hasExtra && !hasModified) {
        errors[ev.id] = 'Ingresa al menos un abono adicional o una modificación de cuota.';
        continue;
      }

      if (hasExtra && (Number(ev.extraPayment) <= 0 || !Number.isFinite(Number(ev.extraPayment)))) {
        errors[ev.id] = 'El abono adicional debe ser mayor que cero.';
        continue;
      }

      if (hasModified && (Number(ev.modifiedMonthlyPayment) <= 0 || !Number.isFinite(Number(ev.modifiedMonthlyPayment)))) {
        errors[ev.id] = 'La cuota modificada debe ser mayor que cero.';
        continue;
      }
    }

    setEventErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const executeSimulation = useCallback(async (): Promise<boolean> => {
    if (!isPlus) {
      setStatus('PLAN_RESTRICTED');
      return false;
    }

    if (!validateEventsLocally()) {
      return false;
    }

    setStatus('LOADING');
    setError(null);

    const payload: SimulationRequestPayload = {
      debtId: selectedDebtId,
      strategy: selectedStrategy,
      events: events.map((e) => ({
        date: e.date || undefined,
        period: e.period ? Number(e.period) : undefined,
        extraPayment: e.extraPayment !== undefined && e.extraPayment !== null ? Number(e.extraPayment) : undefined,
        modifiedMonthlyPayment: e.modifiedMonthlyPayment !== undefined && e.modifiedMonthlyPayment !== null ? Number(e.modifiedMonthlyPayment) : undefined
      }))
    };

    try {
      const response = await simulationService.runSimulation(payload);
      setResult(response);
      if (response.status === 'INSUFFICIENT_DATA') {
        setStatus('INSUFFICIENT_DATA');
      } else {
        setStatus('SUCCESS');
      }
      return true;
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === 'PLAN_RESTRICTED') {
        setStatus('PLAN_RESTRICTED');
        setError(cause.message);
      } else {
        setStatus('ERROR');
        setError(cause instanceof Error ? cause.message : 'No fue posible ejecutar la simulación.');
      }
      return false;
    }
  }, [events, isPlus, selectedDebtId, selectedStrategy]);

  // HU-047: Descartar escenario
  const resetScenario = useCallback(() => {
    setEvents([
      { id: `event-${nextEventId++}`, period: 1, extraPayment: undefined, modifiedMonthlyPayment: undefined }
    ]);
    setResult(null);
    setError(null);
    setEventErrors({});
    setStatus(isPlus ? 'EMPTY' : 'PLAN_RESTRICTED');
  }, [isPlus]);

  return {
    selectedDebtId,
    setSelectedDebtId,
    selectedStrategy,
    setSelectedStrategy,
    events,
    addEvent,
    updateEvent,
    removeEvent,
    status,
    result,
    error,
    eventErrors,
    executeSimulation,
    resetScenario,
    isCalculating: status === 'LOADING'
  };
};
