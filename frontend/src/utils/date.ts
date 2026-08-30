export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
] as const;

export const DAYS_OF_WEEK = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const;

export const getDaysInMonth = (year: number, monthIndex: number): number =>
  new Date(year, monthIndex + 1, 0).getDate();

export const getMondayFirstDayIndex = (year: number, monthIndex: number): number =>
  (new Date(year, monthIndex, 1).getDay() + 6) % 7;

export const toLocalIsoDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getTodayIsoDate = (): string => toLocalIsoDate(new Date());

export const getCalendarDayDifference = (targetDate: Date, referenceDate = new Date()): number => {
  const targetDay = Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const referenceDay = Date.UTC(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  );
  return Math.round((targetDay - referenceDay) / 86_400_000);
};

export const formatRelativeDueDate = (daysUntilDue: number): string => {
  if (daysUntilDue === 0) return 'Vence hoy';
  if (daysUntilDue === 1) return 'Vence mañana';
  if (daysUntilDue > 1) return `Vence en ${daysUntilDue} días`;
  if (daysUntilDue === -1) return 'Venció ayer';
  return `Venció hace ${Math.abs(daysUntilDue)} días`;
};
