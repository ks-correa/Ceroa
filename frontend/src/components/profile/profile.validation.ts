import { validEmail } from '../auth/auth.validation';

export { validEmail };

/** Phone regex reused from auth.validation.ts */
export const PHONE_REGEX = /^\+?[0-9]{7,15}$/;

/** Calculates today's date string and the 18-year-ago cutoff in America/Bogota timezone */
function getBogotaDates(): { today: string; cutoff18: string } {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
  const cutoff18 = String(Number(today.slice(0, 4)) - 18) + today.slice(4);
  return { today, cutoff18 };
}

export interface ProfileUpdateValues {
  fullName: string;
  phone?: string;
  birthDate?: string;
}

export type ProfileFieldErrors = Partial<Record<keyof ProfileUpdateValues, string>>;

/**
 * Validates profile update form fields.
 * - fullName: required, not blank, max 160 chars
 * - phone: optional; if provided must match phone regex
 * - birthDate: optional; if provided must be valid date, not future, >= 18 years old
 */
export function validateProfileUpdate(values: ProfileUpdateValues): ProfileFieldErrors {
  const errors: ProfileFieldErrors = {};

  // fullName validation
  if (!values.fullName.trim() || values.fullName.length > 160) {
    errors.fullName = 'Ingresa tu nombre completo (máximo 160 caracteres).';
  }

  // phone validation (optional)
  if (values.phone && values.phone.trim() !== '') {
    if (!PHONE_REGEX.test(values.phone.trim())) {
      errors.phone = 'Ingresa entre 7 y 15 dígitos, con + opcional.';
    }
  }

  // birthDate validation (optional)
  if (values.birthDate && values.birthDate.trim() !== '') {
    const bd = values.birthDate.trim();
    const date = new Date(bd + 'T12:00:00Z');
    const { today, cutoff18 } = getBogotaDates();

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(bd) ||
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== bd
    ) {
      errors.birthDate = 'Ingresa una fecha válida.';
    } else if (bd > today) {
      errors.birthDate = 'La fecha no puede ser futura.';
    } else if (bd > cutoff18) {
      errors.birthDate = 'Debes tener al menos 18 años.';
    }
  }

  return errors;
}

/**
 * Validates an email address for the email change flow.
 */
export function validateEmail(email: string): string | undefined {
  if (!email.trim()) return 'Ingresa el nuevo correo electrónico.';
  if (!validEmail(email.trim())) return 'Ingresa un correo válido, sin espacios.';
  return undefined;
}
