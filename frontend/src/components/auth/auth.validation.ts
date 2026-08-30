export interface RegistrationValues {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
}

const PASSWORD_PATTERN = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,72}$/;

export const validateRegistration = (values: RegistrationValues): string | null => {
  if (!values.fullName.trim() || !values.email.trim() || !values.password || !values.confirmPassword) {
    return 'Por favor completa todos los campos';
  }
  if (!PASSWORD_PATTERN.test(values.password)) {
    return 'La contraseña requiere 8 caracteres, una mayúscula y un carácter especial';
  }
  if (values.password !== values.confirmPassword) return 'Las contraseñas no coinciden';
  if (!values.acceptTerms || !values.acceptPrivacy) {
    return 'Debes aceptar los términos y la política de privacidad';
  }
  return null;
};
