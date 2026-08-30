import { CurrencyCode } from '../types';

const NUMBER_FORMATTER = new Intl.NumberFormat('es-CO', {
  maximumFractionDigits: 0
});

const DATE_FORMATTER = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric'
});

export const formatNumber = (amount: number): string => NUMBER_FORMATTER.format(amount);

export const formatCurrency = (
  amount: number,
  currency: CurrencyCode = 'COP'
): string => {
  const formattedAmount = formatNumber(amount);

  switch (currency) {
    case 'COP':
      return `$ ${formattedAmount}`;
    case 'MXN':
      return `$${formattedAmount} MXN`;
    case 'USD':
      return `$${formattedAmount} USD`;
  }
};

export const formatDate = (date: string | undefined): string => {
  if (!date) return 'Sin fecha';

  const parsedDate = new Date(`${date.slice(0, 10)}T12:00:00`);
  return Number.isNaN(parsedDate.getTime()) ? date : DATE_FORMATTER.format(parsedDate);
};

export const maskFinancialValue = (value: string, hidden: boolean): string =>
  hidden ? '••••••••' : value;
