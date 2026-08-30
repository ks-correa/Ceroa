import { useMemo, useState } from 'react';
import { Debt } from '../../types';
import { maskFinancialValue } from '../../utils/formatters';

export type DebtCategoryFilter = 'all' | 'cards' | 'loans';

const LOAN_TYPES = new Set<Debt['type']>([
  'mortgage', 'auto_loan', 'personal_loan', 'student_loan'
]);

export const useDebtFilters = (debts: Debt[]) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<DebtCategoryFilter>('all');
  const [hideBalances, setHideBalances] = useState(false);

  const filteredDebts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase('es');
    return debts.filter((debt) => {
      const matchesSearch = !normalizedQuery || [debt.name, debt.entity, debt.categoryLabel]
        .some((value) => value.toLocaleLowerCase('es').includes(normalizedQuery));
      if (!matchesSearch) return false;
      if (activeCategory === 'cards') return debt.type === 'credit_card';
      if (activeCategory === 'loans') return LOAN_TYPES.has(debt.type);
      return true;
    });
  }, [activeCategory, debts, searchQuery]);

  return {
    searchQuery,
    setSearchQuery,
    activeCategory,
    setActiveCategory,
    hideBalances,
    setHideBalances,
    filteredDebts,
    maskValue: (value: string) => maskFinancialValue(value, hideBalances)
  };
};
