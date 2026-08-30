import React, { useState } from 'react';
import { 
  User,
  Edit3, 
  TrendingUp, 
  DollarSign, 
  Moon, 
  Globe, 
  ShieldCheck, 
  Lock, 
  Sparkles, 
  HelpCircle, 
  LogOut, 
  ChevronRight,
  Eye,
  EyeOff
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CurrencyCode } from '../../types';

export const ProfileView: React.FC = () => {
  const { 
    userProfile, 
    financialProfile, 
    preferences, 
    handleUpdatePreferences, 
    handleLogout, 
    formatCurrency,
    setCurrentScreen,
    setIsEditProfileOpen,
    setIsEditFinancialOpen,
    showToast
  } = useApp();

  const [hideFinancials, setHideFinancials] = useState(false);

  const maskValue = (formatted: string) => {
    return hideFinancials ? '••••••••' : formatted;
  };

  return (
    <div className="space-y-6 pb-24 lg:pb-12 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Tu Perfil
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gestiona tu información personal y preferencias de la plataforma.
          </p>
        </div>

        <button
          onClick={() => setHideFinancials(!hideFinancials)}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 self-start sm:self-auto cursor-pointer"
        >
          {hideFinancials ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-teal-600" />}
          <span>{hideFinancials ? 'Mostrar cifras' : 'Ocultar cifras'}</span>
        </button>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Personal Info & Preferences (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Card 1: Datos Personales (Page 15 of PDF) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <User className="w-4 h-4 text-teal-700 dark:text-cyan-400" />
                Datos Personales
              </h2>
              <button
                onClick={() => setIsEditProfileOpen(true)}
                className="text-xs font-bold text-teal-700 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Editar Datos
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              <img
                src={userProfile.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt={userProfile.fullName}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-teal-500/30 shadow-md flex-shrink-0"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 w-full">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block uppercase">
                    Nombre Completo
                  </span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {userProfile.fullName}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block uppercase">
                    Correo Electrónico
                  </span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white truncate block">
                    {userProfile.email}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block uppercase">
                    Teléfono
                  </span>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {userProfile.phone || 'No registrado'}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block uppercase">
                    Documento
                  </span>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {userProfile.documentId || 'No registrado'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Preferencias (Page 9 & 15 of PDF) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Globe className="w-4 h-4 text-teal-700 dark:text-cyan-400" />
              Preferencias
            </h2>

            <div className="space-y-3 divide-y divide-slate-100 dark:divide-slate-800">
              
              {/* Dark Mode Switch */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    <Moon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      Modo Oscuro
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Apariencia visual de la plataforma
                    </span>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    aria-label="Activar modo oscuro"
                    checked={preferences.darkMode}
                    onChange={(e) => handleUpdatePreferences({ darkMode: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--ceroa-primary)]"></div>
                </label>
              </div>

              {/* Language Selector */}
              <div className="flex items-center justify-between pt-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      Idioma
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Español (Colombia / México)
                    </span>
                  </div>
                </div>

                <select
                  aria-label="Idioma"
                  value={preferences.language}
                  onChange={(e) => handleUpdatePreferences({ language: e.target.value as 'es' | 'en' })}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="es">Español (CO)</option>
                  <option value="en">English (US)</option>
                </select>
              </div>

              {/* Currency Selector */}
              <div className="flex items-center justify-between pt-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      Región (Moneda)
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Formato de moneda y cálculos
                    </span>
                  </div>
                </div>

                <select
                  aria-label="Moneda"
                  value={preferences.currency}
                  onChange={(e) => handleUpdatePreferences({ currency: e.target.value as CurrencyCode })}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="COP">Colombia (COP $)</option>
                  <option value="MXN">México (MXN $)</option>
                  <option value="USD">Internacional (USD $)</option>
                </select>
              </div>

            </div>
          </div>

          {/* Card 3: Seguridad (Page 15 of PDF) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <ShieldCheck className="w-4 h-4 text-teal-700 dark:text-cyan-400" />
              Seguridad
            </h2>

            <div className="space-y-3">
              <button type="button" className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 transition-colors cursor-pointer text-left" onClick={() => showToast('La actualización de contraseña estará disponible próximamente')}>
                <div className="flex items-center gap-3">
                  <Lock className="w-4 h-4 text-slate-400" />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      Contraseña
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Gestión disponible próximamente
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button type="button" className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 transition-colors cursor-pointer text-left" onClick={() => showToast('La autenticación en dos pasos estará disponible próximamente')}>
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      Autenticación en 2 Pasos (2FA)
                    </span>
                    <span className="text-[11px] text-slate-400 font-semibold">
                      No configurada
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>

        </div>

        {/* Right Column: Financial Profile & Subscription Plan (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Card 4: Perfil Financiero (Page 9 & 15 of PDF) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-teal-700 dark:text-cyan-400" />
                Perfil Financiero
              </h2>
              <button
                onClick={() => setIsEditFinancialOpen(true)}
                className="text-xs font-bold text-teal-700 dark:text-cyan-400 hover:underline cursor-pointer"
              >
                Actualizar
              </button>
            </div>

            <div className="space-y-3.5">
              
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase block">
                    Ingresos Mensuales
                  </span>
                  <span className="text-base font-extrabold text-slate-900 dark:text-white">
                    {maskValue(formatCurrency(financialProfile.monthlyIncome))}
                  </span>
                </div>
                <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-cyan-400 flex items-center justify-center">
                  ↑
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase block">
                    Gastos Fijos Estimados
                  </span>
                  <span className="text-base font-extrabold text-slate-900 dark:text-white">
                    {maskValue(formatCurrency(financialProfile.fixedExpenses))}
                  </span>
                </div>
                <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-600 flex items-center justify-center">
                  ↓
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase block">
                    Dinero Disponible
                  </span>
                  <span className="text-base font-extrabold text-teal-800 dark:text-cyan-300">
                    {maskValue(formatCurrency(financialProfile.availableMoney))}
                  </span>
                </div>
                <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
                  =
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-slate-800 dark:to-teal-950/30 border border-teal-200/80 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-800 dark:text-cyan-300 uppercase">
                    Capacidad de Pago Disponible
                  </span>
                  <span className="text-xs font-bold text-teal-700 dark:text-cyan-400">
                    Uso: {financialProfile.capacityUsagePercentage}%
                  </span>
                </div>
                
                <div className="text-2xl font-extrabold text-teal-900 dark:text-white">
                  {maskValue(formatCurrency(financialProfile.paymentCapacity))}
                </div>

                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-cyan-600 h-full rounded-full"
                    style={{ width: `${Math.min(100, financialProfile.capacityUsagePercentage)}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block pt-1">
                  Sugerido para amortización acelerada de deudas.
                </span>
              </div>

              <button
                id="profile-update-financial-btn"
                onClick={() => setIsEditFinancialOpen(true)}
                className="w-full py-2.5 px-4 bg-white dark:bg-slate-800 border border-teal-600 text-teal-700 dark:text-cyan-400 hover:bg-teal-50 dark:hover:bg-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Actualizar Datos Financieros
              </button>

            </div>
          </div>

          {/* Card 5: Plan Activo (Page 15 of PDF) */}
          <div className="bg-gradient-to-br from-slate-900 to-teal-950 text-white rounded-3xl p-6 shadow-md space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold tracking-widest uppercase text-cyan-300">
                PLAN ACTIVO
              </span>
              <Sparkles className="w-5 h-5 text-cyan-300" />
            </div>

            <div>
              <h3 className="text-2xl font-extrabold text-white">
                {userProfile.plan === 'plus' ? 'Ceroa Plus' : 'Plan Cero'}
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                {userProfile.plan === 'plus' ? 'Plan asignado a esta cuenta' : 'Plan gratuito sin cobros'}
              </p>
            </div>

            <div className="pt-3 border-t border-white/15 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">Próximo cobro</span>
                <span className="font-bold text-slate-200">{userProfile.plan === 'cero' ? 'No aplica' : 'No disponible'}</span>
              </div>

              <button
                onClick={() => setCurrentScreen('subscription')}
                className="font-bold text-cyan-300 hover:text-cyan-200 underline inline-flex items-center gap-1 cursor-pointer"
              >
                Gestionar Suscripción &rarr;
              </button>
            </div>
          </div>

          {/* Card 6: Cuenta & Logout */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 shadow-xs space-y-1">
            <button
              onClick={() => showToast('Centro de ayuda Ceroa: soporte@ceroa.com')}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              <div className="flex items-center gap-2.5">
                <HelpCircle className="w-4 h-4 text-slate-400" />
                <span>Ayuda y Soporte</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              onClick={() => showToast('Tus datos están protegidos bajo encriptación SSL')}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-slate-400" />
                <span>Privacidad y Seguridad</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              id="profile-logout-btn"
              onClick={handleLogout}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold text-rose-600 dark:text-rose-400 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <LogOut className="w-4 h-4 text-rose-500" />
                <span>Cerrar Sesión</span>
              </div>
              <ChevronRight className="w-4 h-4 text-rose-400" />
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
