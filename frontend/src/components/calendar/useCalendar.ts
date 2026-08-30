import { useMemo, useState } from 'react';
import { Debt, PaymentRecord } from '../../types';
import { getDaysInMonth, getMondayFirstDayIndex } from '../../utils/date';
import { buildCalendarCommitments } from './calendar.utils';

export const useCalendar = (debts: Debt[], payments: PaymentRecord[]) => {
  const [today] = useState(() => new Date());
  const [visibleMonth, setVisibleMonth] = useState(() => ({
    year: today.getFullYear(),
    monthIndex: today.getMonth()
  }));
  const [selectedDay, setSelectedDay] = useState(today.getDate());

  const totalDays = getDaysInMonth(visibleMonth.year, visibleMonth.monthIndex);
  const firstDayIndex = getMondayFirstDayIndex(visibleMonth.year, visibleMonth.monthIndex);
  const commitments = useMemo(
    () => buildCalendarCommitments(debts, payments, visibleMonth.year, visibleMonth.monthIndex, today),
    [debts, payments, today, visibleMonth]
  );
  const dayCommitments = useMemo(
    () => commitments.filter((commitment) => commitment.day === selectedDay),
    [commitments, selectedDay]
  );

  const moveMonth = (offset: number) => {
    setVisibleMonth((current) => {
      const target = new Date(current.year, current.monthIndex + offset, 1);
      const daysInTargetMonth = getDaysInMonth(target.getFullYear(), target.getMonth());
      setSelectedDay((day) => Math.min(day, daysInTargetMonth));
      return { year: target.getFullYear(), monthIndex: target.getMonth() };
    });
  };

  return {
    currentYear: visibleMonth.year,
    currentMonthIndex: visibleMonth.monthIndex,
    selectedDay,
    setSelectedDay,
    totalDays,
    firstDayIndex,
    commitments,
    dayCommitments,
    today,
    showPreviousMonth: () => moveMonth(-1),
    showNextMonth: () => moveMonth(1)
  };
};
