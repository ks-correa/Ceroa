import React from 'react';
import { Mail, X, CheckCircle } from 'lucide-react';
import { useEmailChangeForm } from './useEmailChangeForm';

interface EmailChangeFlowProps {
  /** The user's current email (shown read-only) */
  currentEmail: string;
  /** Called with the new email string when verification succeeds */
  onSuccess: (newEmail: string) => void;
  /** Called when the user cancels */
  onCancel: () => void;
}

const inputClass =
  'w-full min-w-0 px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none';
const errorClass = 'text-xs text-rose-700 dark:text-rose-300 mt-0.5';
const labelClass = 'block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1';

/**
 * Multi-step email change component.
 * Step 1 – 'request': User enters a new email and requests a verification code.
 * Step 2 – 'verify': User enters the 8-digit code sent to the new email.
 * Step 3 – 'success': Success message displayed.
 */
export const EmailChangeFlow: React.FC<EmailChangeFlowProps> = ({
  currentEmail,
  onSuccess,
  onCancel
}) => {
  const form = useEmailChangeForm();

  const handleVerifySuccess = (email: string) => {
    // Brief success display then propagate up
    onSuccess(email);
  };

  if (form.step === 'success') {
    return (
      <div className="space-y-4" role="status" aria-live="polite">
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
              ¡Correo actualizado con éxito!
            </p>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
              Tu correo electrónico ha sido actualizado a{' '}
              <span className="font-semibold">{form.newEmail}</span>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-teal-700 dark:text-cyan-400" />
          <span className="text-sm font-bold text-slate-900 dark:text-white">
            {form.step === 'request' ? 'Cambiar correo electrónico' : 'Verificar código'}
          </span>
        </div>
        <button
          type="button"
          onClick={onCancel}
          disabled={form.busy}
          aria-label="Cancelar cambio de correo"
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-50"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <span className={form.step === 'request' ? 'font-bold text-teal-700 dark:text-cyan-400' : ''}>
          1. Nuevo correo
        </span>
        <span>→</span>
        <span className={form.step === 'verify' ? 'font-bold text-teal-700 dark:text-cyan-400' : ''}>
          2. Verificar código
        </span>
      </div>

      {/* General error */}
      {form.error && (
        <div role="alert" className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
          {form.error}
        </div>
      )}

      {/* Step 1: Request */}
      {form.step === 'request' && (
        <form onSubmit={form.submitRequest} noValidate aria-busy={form.busy} className="space-y-4">
          <fieldset disabled={form.busy} className="space-y-4 border-0 p-0 m-0">
            <div>
              <label className={labelClass}>Correo actual (no editable)</label>
              <input
                type="email"
                value={currentEmail}
                readOnly
                aria-label="Correo actual"
                className={`${inputClass} opacity-60 cursor-not-allowed`}
              />
            </div>
            <div>
              <label htmlFor="email-change-new" className={labelClass}>
                Nuevo correo electrónico <span className="text-rose-500">*</span>
              </label>
              <input
                id="email-change-new"
                name="newEmail"
                type="email"
                autoComplete="email"
                value={form.newEmail}
                onChange={(e) => form.setNewEmail(e.target.value)}
                aria-invalid={Boolean(form.errors.newEmail)}
                aria-describedby={form.errors.newEmail ? 'email-change-new-error' : undefined}
                className={inputClass}
                placeholder="nuevo@correo.com"
              />
              {form.errors.newEmail && (
                <p id="email-change-new-error" className={errorClass} role="alert">
                  {form.errors.newEmail}
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onCancel}
                disabled={form.busy}
                className="flex-1 py-2 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={form.busy}
                className="flex-1 py-2 px-4 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 dark:bg-cyan-600 dark:hover:bg-cyan-700 rounded-xl transition-colors disabled:opacity-60"
              >
                {form.busy ? 'Enviando...' : 'Solicitar código'}
              </button>
            </div>
          </fieldset>
        </form>
      )}

      {/* Step 2: Verify */}
      {form.step === 'verify' && (
        <form
          onSubmit={(e) => form.submitVerify(e, handleVerifySuccess)}
          noValidate
          aria-busy={form.busy}
          className="space-y-4"
        >
          <fieldset disabled={form.busy} className="space-y-4 border-0 p-0 m-0">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Ingresa el código de 8 dígitos enviado a{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-200">{form.newEmail}</span>.
            </p>
            <div>
              <label htmlFor="email-change-code" className={labelClass}>
                Código de verificación <span className="text-rose-500">*</span>
              </label>
              <input
                id="email-change-code"
                name="code"
                type="text"
                autoComplete="one-time-code"
                inputMode="numeric"
                maxLength={8}
                value={form.code}
                onChange={(e) => form.setCode(e.target.value)}
                aria-invalid={Boolean(form.errors.code)}
                aria-describedby={form.errors.code ? 'email-change-code-error' : undefined}
                className={inputClass}
                placeholder="12345678"
              />
              {form.errors.code && (
                <p id="email-change-code-error" className={errorClass} role="alert">
                  {form.errors.code}
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={form.cancel}
                disabled={form.busy}
                className="flex-1 py-2 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={form.busy}
                className="flex-1 py-2 px-4 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 dark:bg-cyan-600 dark:hover:bg-cyan-700 rounded-xl transition-colors disabled:opacity-60"
              >
                {form.busy ? 'Verificando...' : 'Verificar'}
              </button>
            </div>
          </fieldset>
        </form>
      )}
    </div>
  );
};
