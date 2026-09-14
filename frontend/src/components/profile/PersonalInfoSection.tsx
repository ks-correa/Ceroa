import React, { useState, useEffect } from 'react';
import { User, Edit3 } from 'lucide-react';
import { UserProfile } from '../../types';
import { useEditProfileForm } from './useEditProfileForm';
import { EmailChangeFlow } from './EmailChangeFlow';

interface PersonalInfoSectionProps {
  userProfile: UserProfile;
  onProfileUpdated: (updated: UserProfile) => void;
  isLoading: boolean;
  error: string | null;
}

const inputClass =
  'w-full min-w-0 px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none';
const labelClass = 'text-[11px] font-semibold text-slate-400 block uppercase mb-0.5';
const fieldErrorClass = 'text-xs text-rose-700 dark:text-rose-300 mt-0.5';

/** Formats a YYYY-MM-DD string to a human-readable date in Spanish */
function formatBirthDate(date?: string): string {
  if (!date) return 'No registrada';
  try {
    const d = new Date(date + 'T12:00:00Z');
    return d.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
  } catch {
    return date;
  }
}

/** Loading skeleton for personal info */
const PersonalInfoSkeleton: React.FC = () => (
  <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Cargando datos personales">
    <div className="flex items-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="space-y-1">
          <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
        </div>
      ))}
    </div>
  </div>
);

/**
 * Displays personal info with an inline edit mode and an email change sub-flow.
 * Props: userProfile, onProfileUpdated, isLoading, error.
 */
export const PersonalInfoSection: React.FC<PersonalInfoSectionProps> = ({
  userProfile,
  onProfileUpdated,
  isLoading,
  error
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showEmailChange, setShowEmailChange] = useState(false);

  const form = useEditProfileForm(userProfile);

  // Keep form fields in sync when userProfile changes from outside (e.g. after email change)
  useEffect(() => {
    if (!isEditing) {
      form.reset(userProfile);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile, isEditing]);

  const handleEditClick = () => {
    form.reset(userProfile);
    setIsEditing(true);
    setShowEmailChange(false);
  };

  const handleCancel = () => {
    form.reset(userProfile);
    setIsEditing(false);
  };

  const handleSave = async () => {
    await form.submit((updated) => {
      onProfileUpdated(updated);
      setIsEditing(false);
    });
  };

  const handleEmailChangeSuccess = (newEmail: string) => {
    onProfileUpdated({ ...userProfile, email: newEmail });
    setShowEmailChange(false);
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <User className="w-4 h-4 text-teal-700 dark:text-cyan-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Datos Personales</h2>
        </div>
        <PersonalInfoSkeleton />
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <User className="w-4 h-4 text-teal-700 dark:text-cyan-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Datos Personales</h2>
        </div>
        <div role="alert" className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-5">
      {/* Card header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <User className="w-4 h-4 text-teal-700 dark:text-cyan-400" />
          Datos Personales
        </h2>
        {!isEditing && (
          <button
            onClick={handleEditClick}
            className="text-xs font-bold text-teal-700 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
            aria-label="Editar datos personales"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Editar Datos
          </button>
        )}
      </div>

      {/* Email change flow (shown inline above form when triggered) */}
      {showEmailChange && (
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <EmailChangeFlow
            currentEmail={userProfile.email}
            onSuccess={handleEmailChangeSuccess}
            onCancel={() => setShowEmailChange(false)}
          />
        </div>
      )}

      {/* ── Read mode ─────────────────────────────────────────────────────── */}
      {!isEditing && !showEmailChange && (
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <img
            src={
              userProfile.avatarUrl ||
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
            }
            alt={userProfile.fullName}
            className="w-20 h-20 rounded-2xl object-cover border-2 border-teal-500/30 shadow-md flex-shrink-0"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 w-full">
            <div>
              <span className={labelClass}>Nombre Completo</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">{userProfile.fullName}</span>
            </div>
            <div>
              <span className={labelClass}>Correo Electrónico</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white truncate block">{userProfile.email}</span>
              <button
                type="button"
                onClick={() => setShowEmailChange(true)}
                className="text-[11px] font-semibold text-teal-700 dark:text-cyan-400 hover:underline mt-0.5"
              >
                Cambiar correo →
              </button>
            </div>
            <div>
              <span className={labelClass}>Teléfono</span>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {userProfile.phone || 'No registrado'}
              </span>
            </div>
            <div>
              <span className={labelClass}>Fecha de Nacimiento</span>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {formatBirthDate(userProfile.birthDate)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit mode ─────────────────────────────────────────────────────── */}
      {isEditing && (
        <div className="space-y-4">
          {/* General API error */}
          {form.generalError && (
            <div role="alert" className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
              {form.generalError}
            </div>
          )}

          {/* fullName */}
          <div>
            <label htmlFor="profile-fullName" className={labelClass}>
              Nombre Completo <span className="text-rose-500">*</span>
            </label>
            <input
              id="profile-fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              value={form.fullName}
              onChange={(e) => form.setFullName(e.target.value)}
              aria-invalid={Boolean(form.errors.fullName)}
              aria-describedby={form.errors.fullName ? 'profile-fullName-error' : undefined}
              className={inputClass}
            />
            {form.errors.fullName && (
              <p id="profile-fullName-error" className={fieldErrorClass} role="alert">
                {form.errors.fullName}
              </p>
            )}
          </div>

          {/* email – read-only with change button */}
          <div>
            <label htmlFor="profile-email-ro" className={labelClass}>
              Correo Electrónico (no editable aquí)
            </label>
            <input
              id="profile-email-ro"
              type="email"
              value={userProfile.email}
              readOnly
              aria-label="Correo electrónico (solo lectura)"
              className={`${inputClass} opacity-60 cursor-not-allowed`}
            />
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setShowEmailChange(true);
              }}
              className="text-[11px] font-semibold text-teal-700 dark:text-cyan-400 hover:underline mt-1"
            >
              Cambiar correo →
            </button>
          </div>

          {/* phone */}
          <div>
            <label htmlFor="profile-phone" className={labelClass}>
              Teléfono
            </label>
            <input
              id="profile-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={(e) => form.setPhone(e.target.value)}
              aria-invalid={Boolean(form.errors.phone)}
              aria-describedby={form.errors.phone ? 'profile-phone-error' : undefined}
              className={inputClass}
              placeholder="+573001234567"
            />
            {form.errors.phone && (
              <p id="profile-phone-error" className={fieldErrorClass} role="alert">
                {form.errors.phone}
              </p>
            )}
          </div>

          {/* birthDate */}
          <div>
            <label htmlFor="profile-birthDate" className={labelClass}>
              Fecha de Nacimiento
            </label>
            <input
              id="profile-birthDate"
              name="birthDate"
              type="date"
              autoComplete="bday"
              value={form.birthDate}
              onChange={(e) => form.setBirthDate(e.target.value)}
              aria-invalid={Boolean(form.errors.birthDate)}
              aria-describedby={form.errors.birthDate ? 'profile-birthDate-error' : undefined}
              className={inputClass}
            />
            {form.errors.birthDate && (
              <p id="profile-birthDate-error" className={fieldErrorClass} role="alert">
                {form.errors.birthDate}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleCancel}
              disabled={form.isSaving}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={form.isSaving}
              className="px-5 py-2 text-xs font-bold text-white bg-teal-800 hover:bg-teal-900 dark:bg-cyan-600 dark:hover:bg-cyan-700 disabled:opacity-60 rounded-xl shadow-xs transition-colors"
            >
              {form.isSaving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
