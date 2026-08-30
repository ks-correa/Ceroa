import React, { useState } from 'react';
import { User, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CeroaLogo } from '../common/CeroaLogo';

export const RegisterView: React.FC = () => {
  const { handleRegister, setCurrentScreen, showToast } = useApp();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password || !confirmPassword) {
      showToast('Por favor completa todos los campos');
      return;
    }
    if (!/^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,72}$/.test(password)) {
      showToast('La contraseña requiere 8 caracteres, una mayúscula y un carácter especial');
      return;
    }
    if (password !== confirmPassword) {
      showToast('Las contraseñas no coinciden');
      return;
    }

    if (!acceptTerms || !acceptPrivacy) {
      showToast('Debes aceptar los términos y la política de privacidad');
      return;
    }
    try {
      setIsSubmitting(true);
      await handleRegister({ fullName, email, password, acceptTerms, acceptPrivacy });
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No fue posible crear la cuenta');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 sm:p-6 md:p-10 font-sans">
      <div className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden grid grid-cols-1 lg:grid-cols-2">
        
        {/* Form Section */}
        <div className="p-6 sm:p-10 lg:p-12 flex flex-col justify-center order-2 lg:order-1">
          
          <div className="text-center lg:text-left mb-6">
            <div className="flex justify-center lg:justify-start mb-3">
              <CeroaLogo size="md" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Crear cuenta
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Comienza tu camino hacia una vida sin deudas financieras.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5 max-w-md w-full mx-auto lg:mx-0">
            
            {/* Full Name */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Nombre completo
              </label>
              <div className="relative flex items-center">
                <User className="absolute left-3.5 w-4 h-4 text-slate-400" />
                <input
                  id="register-fullname-input"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ej. Ana María García"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Correo electrónico
              </label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 w-4 h-4 text-slate-400" />
                <input
                  id="register-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Contraseña
              </label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 w-4 h-4 text-slate-400" />
                <input
                  id="register-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  required
                  minLength={8}
                  className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Confirmar contraseña
              </label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 w-4 h-4 text-slate-400" />
                <input
                  id="register-confirm-password-input"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite tu contraseña"
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="space-y-2 pt-1">
              <label className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(event) => setAcceptTerms(event.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-[#008FA6]"
                />
                <span>Acepto los términos y condiciones de Ceroa.</span>
              </label>
              <label className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={acceptPrivacy}
                  onChange={(event) => setAcceptPrivacy(event.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-[#008FA6]"
                />
                <span>Acepto la política de tratamiento de datos.</span>
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-3">
              <button
                type="submit"
                id="register-submit-btn"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#008FA6] hover:bg-[#007A8E] text-white rounded-xl font-bold text-sm shadow-sm hover:shadow-md transition-all cursor-pointer"
              >
                <span>{isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Link to Login */}
            <div className="pt-3 text-center">
              <span className="text-xs text-slate-600 dark:text-slate-400">
                ¿Ya tienes una cuenta?{' '}
              </span>
              <button
                type="button"
                id="goto-login-btn"
                onClick={() => setCurrentScreen('login')}
                className="text-xs font-bold text-[#008FA6] dark:text-cyan-400 hover:underline cursor-pointer"
              >
                Inicia sesión
              </button>
            </div>

          </form>
        </div>

        {/* Right Hero Graphic Section (Desktop) */}
        <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-tr from-[#004D5A] via-[#006A7C] to-[#008FA6] text-white relative overflow-hidden order-1 lg:order-2">
          
          <div className="relative z-10 flex justify-end">
            <div className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[11px] font-semibold text-cyan-200">
              Registro Seguro
            </div>
          </div>

          <div className="relative z-10 my-auto text-center space-y-4 py-8">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-white/20 backdrop-blur-md p-1 shadow-2xl flex items-center justify-center">
              <CeroaLogo size="lg" />
            </div>
            
            <blockquote className="text-lg font-medium text-slate-100 italic max-w-sm mx-auto leading-relaxed pt-4">
              "La claridad estructural es el primer paso hacia la libertad."
            </blockquote>
            <p className="text-xs font-semibold text-cyan-200">
              — Filosofía Ceroa
            </p>
          </div>

          <div className="relative z-10 text-center text-[11px] text-cyan-100/80">
            Tu contraseña se almacena únicamente como un hash seguro.
          </div>
        </div>

      </div>
    </div>
  );
};
