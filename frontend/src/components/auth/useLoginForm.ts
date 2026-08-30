import { useState } from 'react';

type Login = (email: string, password: string) => Promise<void>;

export const useLoginForm = (login: Login, notify: (message: string) => void) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) {
      notify('Por favor completa todos los campos');
      return;
    }
    try {
      setIsSubmitting(true);
      await login(email.trim(), password);
    } catch (cause) {
      notify(cause instanceof Error ? cause.message : 'No fue posible iniciar sesión');
    } finally {
      setIsSubmitting(false);
    }
  };

  const sendRecovery = (event: React.FormEvent) => {
    event.preventDefault();
    if (!recoveryEmail.trim()) {
      notify('Ingresa tu correo para recuperar contraseña');
      return;
    }
    setIsForgotPasswordOpen(false);
    notify('La recuperación por correo estará disponible próximamente');
  };

  const requestSso = (provider: 'Google' | 'Microsoft') => {
    notify(`El acceso con ${provider} estará disponible próximamente`);
  };

  return {
    email, setEmail, password, setPassword, showPassword, setShowPassword,
    isSubmitting, isForgotPasswordOpen, setIsForgotPasswordOpen,
    recoveryEmail, setRecoveryEmail, submit, sendRecovery, requestSso
  };
};
