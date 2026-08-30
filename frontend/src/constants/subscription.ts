export const PLUS_MONTHLY_PRICE_COP = 19_900;
export const PLUS_ANNUAL_PRICE_COP = 299_000;

export const formatCopPrice = (amount: number): string =>
  `$${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(amount)}`;
