import { useState } from 'react';
import { RegisterPayload } from '../../services/authService';
import { validateRegistration } from './auth.validation';

type Register = (payload: RegisterPayload) => Promise<void>;

export const useRegisterForm = (register: Register, notify: (message: string) => void) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationError = validateRegistration({
      fullName, email, password, confirmPassword, acceptTerms, acceptPrivacy
    });
    if (validationError) {
      notify(validationError);
      return;
    }

    try {
      setIsSubmitting(true);
      await register({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        acceptTerms,
        acceptPrivacy
      });
    } catch (cause) {
      notify(cause instanceof Error ? cause.message : 'No fue posible crear la cuenta');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    fullName, setFullName, email, setEmail, password, setPassword,
    confirmPassword, setConfirmPassword, showPassword, setShowPassword,
    showConfirmPassword, setShowConfirmPassword, acceptTerms, setAcceptTerms,
    acceptPrivacy, setAcceptPrivacy, isSubmitting, submit
  };
};
