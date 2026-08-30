import React from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CeroaLogo } from '../common/CeroaLogo';
import { useLoginForm } from './useLoginForm';

export const LoginView: React.FC = () => {
  const { handleLogin, setCurrentScreen, showToast } = useApp();
  const {
    email, setEmail, password, setPassword, showPassword, setShowPassword,
    isSubmitting, isForgotPasswordOpen, setIsForgotPasswordOpen,
    recoveryEmail, setRecoveryEmail, submit: handleSubmit,
    sendRecovery: handleSendRecovery, requestSso: handleSSO
  } = useLoginForm(handleLogin, showToast);

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 sm:p-6 md:p-10 font-sans">
      
      {/* Container - Split on PC, Centered Card on Mobile */}
      <div className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden grid grid-cols-1 lg:grid-cols-2">
        
        {/* Left Hero Graphic Section (Desktop) */}
        <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-[#004D5A] via-[#006A7C] to-[var(--ceroa-primary)] text-white relative overflow-hidden">
          {/* Subtle Background Art */}
          <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]"></div>
          <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none"></div>

          {/* Top Brand */}
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold tracking-wide text-cyan-200">
              <span className="w-2 h-2 rounded-full bg-[#00E5FF] animate-pulse"></span>
              Plataforma de Libertad Financiera
            </div>
          </div>

          {/* Center Title & Mission */}
          <div className="relative z-10 space-y-4 my-auto py-8">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-cyan-200" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="currentColor" fillOpacity="0.8" />
              </svg>
            </div>
            
            <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight leading-tight text-white">
              Agencia Financiera <br />
              <span className="text-cyan-200">
                Tranquila
              </span>
            </h1>
            
            <p className="text-slate-100 text-sm leading-relaxed max-w-md">
              Toma el control de tus deudas con claridad y estructura. Un enfoque moderno y matemático hacia la salud financiera duradera.
            </p>
          </div>

          {/* Quote Footer */}
          <div className="relative z-10 pt-6 border-t border-white/15">
            <p className="text-xs text-cyan-100/90 italic">
              "La tranquilidad financiera no es ganar más, sino eliminar lo que te resta libertad."
            </p>
            <span className="text-[11px] font-semibold text-cyan-200 block mt-1">
              — Filosofía Ceroa
            </span>
          </div>
        </div>

        {/* Right Form Section */}
        <div className="p-6 sm:p-10 lg:p-12 flex flex-col justify-center">
          
          {/* Mobile Brand Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-3">
              <CeroaLogo size="lg" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Bienvenido a Ceroa
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-sm mx-auto">
              Tu camino hacia la tranquilidad financiera comienza aquí.
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto w-full">
            
            {/* Email Field */}
            <div className="space-y-1.5">
              <label htmlFor="login-email-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Correo Electrónico
              </label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 w-4 h-4 text-slate-400" />
                <input
                  id="login-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="login-password-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Contraseña
                </label>
                <button
                  type="button"
                  id="forgot-password-btn"
                  onClick={() => setIsForgotPasswordOpen(true)}
                  className="text-xs font-semibold text-teal-700 dark:text-cyan-400 hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 w-4 h-4 text-slate-400" />
                <input
                  id="login-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                />
                <button
                  type="button"
                  id="toggle-password-visibility-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                id="login-submit-btn"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[var(--ceroa-primary)] hover:bg-[var(--ceroa-primary-hover)] disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm shadow-sm hover:shadow-md transition-all cursor-pointer"
              >
                <span>{isSubmitting ? 'Ingresando...' : 'Iniciar sesión'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Divider */}
            <div className="relative my-4 flex items-center justify-center">
              <div className="border-t border-slate-200 dark:border-slate-800 w-full"></div>
              <span className="bg-white dark:bg-slate-900 px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-widest absolute">
                o
              </span>
            </div>

            {/* SSO Buttons */}
            <div className="space-y-2.5">
              <button
                type="button"
                id="login-google-sso-btn"
                onClick={() => handleSSO('Google')}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Continue with Google</span>
              </button>

              <button
                type="button"
                id="login-microsoft-sso-btn"
                onClick={() => handleSSO('Microsoft')}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 23 23">
                  <path fill="#f35325" d="M1 1h10v10H1z" />
                  <path fill="#81bc06" d="M12 1h10v10H12z" />
                  <path fill="#05a6f0" d="M1 12h10v10H1z" />
                  <path fill="#ffba08" d="M12 12h10v10H12z" />
                </svg>
                <span>Continue with Microsoft</span>
              </button>
            </div>

            {/* Link to Register */}
            <div className="pt-4 text-center">
              <div className="p-3 bg-cyan-50/60 dark:bg-cyan-950/30 rounded-xl border border-cyan-100 dark:border-cyan-900/50">
                <span className="text-xs text-slate-600 dark:text-slate-300">
                  Don't have an account?{' '}
                </span>
                <button
                  type="button"
                  id="goto-register-btn"
                  onClick={() => setCurrentScreen('register')}
                  className="text-xs font-bold text-teal-800 dark:text-cyan-400 hover:underline cursor-pointer"
                >
                  Create account
                </button>
              </div>
            </div>

          </form>
        </div>

      </div>

      {/* Forgot Password Modal */}
      {isForgotPasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Recuperar Contraseña
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Ingresa tu correo registrado y te enviaremos las instrucciones de restablecimiento.
            </p>
            <form onSubmit={handleSendRecovery} className="mt-4 space-y-3">
              <input
                type="email"
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.target.value)}
                placeholder="tu@correo.com"
                required
                className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsForgotPasswordOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-lg"
                >
                  Enviar Enlace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
