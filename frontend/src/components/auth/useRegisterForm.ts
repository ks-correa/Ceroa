import { useState } from 'react';
import { RegisterPayload } from '../../services/authService';
import { ApiError } from '../../services/api';
import { FieldErrors, RegistrationValues, validateRegistration, validatePersonal } from './auth.validation';
export const emptyRegistration: RegistrationValues = { fullName: '', email: '', phone: '', birthDate: '', password: '', confirmPassword: '', acceptTerms: false, acceptPrivacy: false };
export const useRegisterForm = (register: (payload: RegisterPayload) => Promise<void>, initial = emptyRegistration, external = false) => {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const change = (field: keyof RegistrationValues, value: string | boolean) => {
    setValues(previous => ({ ...previous, [field]: value }));
    setErrors(previous => ({ ...previous, [field]: undefined }));
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    const next = external ? validatePersonal(values) : validateRegistration(values);
    setErrors(next); setMessage('');
    if (Object.keys(next).length) { document.getElementById('auth-' + Object.keys(next)[0])?.focus(); return; }
    setIsSubmitting(true);
    try { await register({ ...values, fullName: values.fullName.trim() }); }
    catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'No fue posible crear la cuenta.');
      if (cause instanceof ApiError) setErrors(cause.fieldErrors);
    } finally {
      setValues(previous => ({ ...previous, password: '', confirmPassword: '' }));
      setIsSubmitting(false);
    }
  };
  return { values, errors, message, isSubmitting, change, submit };
};
