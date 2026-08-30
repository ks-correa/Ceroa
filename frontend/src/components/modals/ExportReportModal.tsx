import React, { useState } from 'react';
import { X, FileDown, CheckCircle2, Printer, Download, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const ExportReportModal: React.FC = () => {
  const { 
    isExportReportOpen, 
    setIsExportReportOpen, 
    debts, 
    financialProfile, 
    activeStrategy, 
    formatCurrency, 
    formatNumber,
    userProfile,
    showToast
  } = useApp();

  const [isExporting, setIsExporting] = useState(false);

  if (!isExportReportOpen) return null;

  const totalBalance = debts.reduce((acc, d) => acc + d.currentBalance, 0);
  const totalMonthly = debts.reduce((acc, d) => acc + d.monthlyPayment, 0);

  const handleDownload = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      setIsExportReportOpen(false);
      showToast('¡Reporte financiero generado y descargado exitosamente!');
    }, 1200);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 my-8">
        
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-cyan-400">
              <FileDown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Resumen Ejecutivo y Hoja de Ruta
              </h3>
              <p className="text-xs text-slate-500">Reporte de amortización financiera descargable en PDF</p>
            </div>
          </div>
          <button
            onClick={() => setIsExportReportOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Report Preview Document */}
        <div className="my-6 p-6 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-5 text-xs">
          
          {/* Header of Doc */}
          <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-700 pb-4">
            <div>
              <div className="text-base font-extrabold text-slate-900 dark:text-white">
                CEROA • Estrategia de Pago y Amortización
              </div>
              <div className="text-slate-500">
                Titular: {userProfile.fullName} ({userProfile.email})
              </div>
              <div className="text-slate-400 text-[10px]">
                Fecha de Emisión: 15 de Octubre, 2023 | Estrategia: {activeStrategy === 'snowball' ? 'Bola de Nieve' : 'Avalancha'}
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-teal-100 text-teal-800 uppercase">
              CONFIDENCIAL
            </span>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-slate-400 block text-[10px]">Deuda Total</span>
              <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(totalBalance)}</span>
            </div>
            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-slate-400 block text-[10px]">Compromiso Mensual</span>
              <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(totalMonthly)}</span>
            </div>
            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-slate-400 block text-[10px]">Capacidad de Pago</span>
              <span className="font-bold text-teal-700 dark:text-cyan-400">{formatCurrency(financialProfile.paymentCapacity)}</span>
            </div>
          </div>

          {/* Table of Debts */}
          <div className="space-y-2">
            <span className="font-bold text-slate-800 dark:text-slate-200 block">
              Prioridades de Liquidación:
            </span>
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {debts.map((d, i) => (
                <div key={d.id} className="py-2 flex justify-between items-center text-[11px]">
                  <div>
                    <strong className="text-slate-900 dark:text-white">#{i + 1} {d.name}</strong>
                    <span className="text-slate-400 ml-2">({d.entity} • {d.interestRate}% {d.rateType})</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(d.currentBalance)}</span>
                    <span className="text-slate-400 block text-[10px]">Cuota: {formatCurrency(d.monthlyPayment)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl flex items-center justify-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={isExporting}
            className="px-6 py-2.5 text-xs font-bold text-white bg-[#008FA6] hover:bg-[#007A8E] rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Generando PDF...' : 'Descargar Reporte PDF'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
