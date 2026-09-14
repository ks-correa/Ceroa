export interface RegistrationValues {
  fullName: string; email: string; phone: string; birthDate: string;
  password: string; confirmPassword: string; acceptTerms: boolean; acceptPrivacy: boolean;
}
export type FieldErrors = Partial<Record<keyof RegistrationValues, string>>;
export const validEmail = (email: string) => email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
export const validatePersonal = (v: Omit<RegistrationValues, 'password' | 'confirmPassword'>): FieldErrors => {
  const e: FieldErrors = {};
  if (!v.fullName.trim() || v.fullName.length > 160) e.fullName = 'Ingresa tu nombre completo (máximo 160 caracteres).';
  if (!validEmail(v.email)) e.email = 'Ingresa un correo válido, sin espacios.';
  if (!/^\+?[0-9]{7,15}$/.test(v.phone)) e.phone = 'Ingresa entre 7 y 15 dígitos, con + opcional.';
  const date = new Date(v.birthDate + 'T12:00:00Z');
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const cutoff = String(Number(today.slice(0, 4)) - 18) + today.slice(4);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.birthDate) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== v.birthDate) e.birthDate = 'Ingresa una fecha válida.';
  else if (v.birthDate > today) e.birthDate = 'La fecha no puede ser futura.';
  else if (v.birthDate > cutoff) e.birthDate = 'Debes tener al menos 18 años.';
  if (!v.acceptTerms) e.acceptTerms = 'Debes aceptar los términos y condiciones.';
  if (!v.acceptPrivacy) e.acceptPrivacy = 'Debes aceptar la política de privacidad.';
  return e;
};
export const validateRegistration = (v: RegistrationValues): FieldErrors => {
  const e = validatePersonal(v);
  return { ...e, ...validatePasswords(v.password, v.confirmPassword) };
};
export const validatePasswords = (password: string, confirmPassword: string): FieldErrors => {
  const v = { password, confirmPassword };
  const e: FieldErrors = {};
  if (!/^(?=.*[A-Z])(?=.*[^A-Za-z0-9\s]).{8,72}$/.test(v.password) || new TextEncoder().encode(v.password).length > 72)
    e.password = 'Usa al menos 8 caracteres, una mayúscula y un carácter especial (máximo 72 bytes).';
  if (!v.confirmPassword || v.password !== v.confirmPassword) e.confirmPassword = 'Las contraseñas deben coincidir exactamente.';
  return e;
};
