import React from 'react';
import { 
  Plus, 
  Search, 
  CreditCard, 
  Car, 
  Home, 
  GraduationCap, 
  Landmark, 
  ChevronRight, 
  Eye, 
  EyeOff,
  TrendingDown,
  Calendar
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DebtType } from '../../types';
import { useDebtFilters } from './useDebtFilters';

export const DebtsListView: React.FC = () => {
  const { 
    debts, 
    totalDebt, 
    overallProgressPercentage, 
    nextTotalMonthlyPayment, 
    activeAccountsCount, 
    formatCurrency, 
    formatDate,
    navigateToDebtDetail,
    openAddDebtModal
  } = useApp();

  const {
    searchQuery, setSearchQuery, activeCategory, setActiveCategory,
    hideBalances, setHideBalances, filteredDebts, maskValue
  } = useDebtFilters(debts);

  const getDebtIcon = (type: DebtType) => {
    switch (type) {
      case 'credit_card':
      case 'retail_credit':
      case 'installment_purchase':
        return <CreditCard className="w-5 h-5" />;
      case 'mortgage':
        return <Home className="w-5 h-5" />;
      case 'auto_loan':
        return <Car className="w-5 h-5" />;
      case 'student_loan':
        return <GraduationCap className="w-5 h-5" />;
      default:
        return <Landmark className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-6 pb-24 lg:pb-12 max-w-7xl mx-auto">
      
      {/* Header & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Mis Deudas
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gestiona y haz seguimiento a tus compromisos financieros.
          </p>
        </div>

        <button
          id="debts-add-debt-btn"
          onClick={openAddDebtModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[var(--ceroa-primary)] hover:bg-[var(--ceroa-primary-hover)] text-white rounded-xl font-bold text-xs shadow-xs hover:shadow-sm transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Agregar deuda</span>
        </button>
      </div>

      {/* Summary Metrics Card (Page 5 & 18 of PDF) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          
          {/* Main Debt Amount & Month change */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Deuda Total Acumulada
              </span>
              
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 dark:bg-teal-950/80 text-teal-700 dark:text-cyan-300 border border-teal-200/60 dark:border-teal-800">
                  <TrendingDown className="w-3 h-3" />
                  {overallProgressPercentage}% pagado
                </span>
                <button
                  onClick={() => setHideBalances(!hideBalances)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  title="Ocultar/Mostrar saldo"
                  aria-label={hideBalances ? 'Mostrar saldos' : 'Ocultar saldos'}
                >
                  {hideBalances ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {maskValue(formatCurrency(totalDebt))}
            </div>

            {/* Overall Progress */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                <span>Progreso general de pago</span>
                <span className="font-bold text-teal-700 dark:text-cyan-400">{overallProgressPercentage}%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-teal-700 to-cyan-500 h-full rounded-full transition-all duration-700"
                  style={{ width: `${overallProgressPercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Quick Sub-Stats */}
          <div className="grid grid-cols-2 md:grid-cols-1 gap-4 pt-4 md:pt-0 md:pl-6 md:border-l border-slate-100 dark:border-slate-800">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block">
                Próximo pago total
              </span>
              <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5 block">
                {maskValue(formatCurrency(nextTotalMonthlyPayment))}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block">
                Cuentas activas
              </span>
              <span className="text-base sm:text-lg font-bold text-teal-700 dark:text-cyan-400 mt-0.5 block">
                {activeAccountsCount} deudas
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* Search & Category Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            id="debts-search-input"
            aria-label="Buscar deudas"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por acreedor o tipo..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 shadow-2xs"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            id="filter-all-debts"
            onClick={() => setActiveCategory('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex-shrink-0 ${
              activeCategory === 'all'
                ? 'bg-slate-900 dark:bg-teal-700 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
            }`}
          >
            Todas
          </button>

          <button
            id="filter-cards-debts"
            onClick={() => setActiveCategory('cards')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex-shrink-0 ${
              activeCategory === 'cards'
                ? 'bg-slate-900 dark:bg-teal-700 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
            }`}
          >
            Tarjetas de Crédito
          </button>

          <button
            id="filter-loans-debts"
            onClick={() => setActiveCategory('loans')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex-shrink-0 ${
              activeCategory === 'loans'
                ? 'bg-slate-900 dark:bg-teal-700 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
            }`}
          >
            Préstamos
          </button>
        </div>

      </div>

      {/* Debts List */}
      {filteredDebts.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {filteredDebts.map((debt) => {
            const paidPct = debt.originalAmount > 0 
              ? Math.min(100, Math.round(((debt.originalAmount - debt.currentBalance) / debt.originalAmount) * 100))
              : 0;

            const isCard = debt.type === 'credit_card';

            return (
              <div
                key={debt.id}
                id={`debt-card-${debt.id}`}
                onClick={() => navigateToDebtDetail(debt.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') navigateToDebtDetail(debt.id);
                }}
                role="button"
                tabIndex={0}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-teal-500/50 dark:hover:border-cyan-500/50 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  
                  {/* Left Column: Icon + Entity + Progress */}
                  <div className="flex items-start gap-4 min-w-[240px]">
                    <div className="p-3 rounded-2xl bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-cyan-400 group-hover:scale-105 transition-transform flex-shrink-0">
                      {getDebtIcon(debt.type)}
                    </div>
                    
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-teal-700 dark:group-hover:text-cyan-400 transition-colors">
                          {debt.name}
                        </h3>
                        <span className="text-xs text-slate-400">
                          ({debt.entity})
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Vence: <strong className="text-slate-700 dark:text-slate-200">{formatDate(debt.nextDueDate)}</strong></span>
                      </div>

                      {/* Small Progress Pill */}
                      <div className="pt-2 max-w-xs">
                        <div className="flex justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                          <span>Progreso ({paidPct}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-cyan-600 h-full rounded-full"
                            style={{ width: `${Math.max(4, paidPct)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Center & Right Column: Balance, Rate, Payment, Arrow */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:flex items-center justify-between gap-4 sm:gap-6 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                    
                    {/* Saldo Actual */}
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 block uppercase">
                        Saldo Actual
                      </span>
                      <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                        {maskValue(formatCurrency(debt.currentBalance))}
                      </span>
                    </div>

                    {/* Tasa */}
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 block uppercase">
                        Tasa ({debt.rateType})
                      </span>
                      <span className="text-sm font-bold text-teal-800 dark:text-cyan-300">
                        {debt.interestRate}%
                      </span>
                    </div>

                    {/* Cuota / Mínimo */}
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 block uppercase">
                        {isCard ? 'Pago Mínimo' : 'Cuota Fija'}
                      </span>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                        {maskValue(formatCurrency(isCard ? debt.minimumPayment : debt.monthlyPayment))}
                      </span>
                    </div>

                    {/* Arrow Button */}
                    <div className="flex justify-end items-center">
                      <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-800 group-hover:bg-[var(--ceroa-primary)] group-hover:text-white dark:group-hover:bg-[var(--ceroa-primary)] text-slate-500 dark:text-slate-300 flex items-center justify-center transition-all shadow-2xs">
                        <ChevronRight className="w-5 h-5" />
                      </div>
                    </div>

                  </div>

                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8">
          <Landmark className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            No se encontraron deudas
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
            Intenta con otro término de búsqueda o registra una nueva deuda.
          </p>
          <button
            onClick={openAddDebtModal}
            className="mt-4 px-4 py-2 bg-[var(--ceroa-primary)] hover:bg-[var(--ceroa-primary-hover)] text-white rounded-xl text-xs font-bold shadow-xs"
          >
            + Registrar Deuda
          </button>
        </div>
      )}

      {/* Floating Action Button (Mobile Only - Page 5) */}
      <button
        id="mobile-floating-add-debt"
        onClick={openAddDebtModal}
        className="lg:hidden fixed bottom-20 right-5 w-14 h-14 bg-[var(--ceroa-primary)] hover:bg-[var(--ceroa-primary-hover)] text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl z-30 transition-all cursor-pointer"
        title="Agregar deuda"
      >
        <Plus className="w-6 h-6" />
      </button>

    </div>
  );
};
