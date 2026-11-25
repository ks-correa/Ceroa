import type { FinancialDocument } from '../../services/documentLibraryService';

const kinds = { BANK_STATEMENT: 'Extracto bancario', PAYMENT_RECEIPT: 'Comprobante de pago', LOAN_AGREEMENT: 'Contrato de crédito', OTHER: 'Documento' };
const date = (value: string | null) => value ? new Date(`${value.slice(0, 10)}T12:00:00Z`) : null;
const valid = (value: Date | null): value is Date => !!value && Number.isFinite(value.getTime());
const day = (value: Date) => new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(value);
const month = (value: Date) => new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(value);
function period(document: FinancialDocument) {
  const start = date(document.periodStart), end = date(document.periodEnd);
  // The API stores the end of the period exclusively.
  if (valid(end)) end.setUTCDate(end.getUTCDate() - 1);
  return { start, end };
}
export const documentHeading = (document: FinancialDocument) => `${kinds[document.documentType] || 'Documento'} · ${document.financialEntity || 'Entidad pendiente'}`;
export function documentPeriod(document: FinancialDocument) {
  const { start, end } = period(document);
  if (valid(start) && valid(end)) return month(start) === month(end) ? month(start) : `${month(start)} a ${month(end)}`;
  return valid(start) ? `Desde ${day(start)}` : 'Período sin especificar';
}
export function documentPeriodRange(document: FinancialDocument) {
  const { start, end } = period(document);
  return `${valid(start) ? day(start) : 'Inicio sin especificar'} al ${valid(end) ? day(end) : 'fin sin especificar'}`;
}
export function documentUploadedAt(value: string) {
  const uploaded = new Date(value);
  return valid(uploaded) ? new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' }).format(uploaded) : 'Fecha no disponible';
}
