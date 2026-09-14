import { useState } from 'react';
import { validEmail } from './auth.validation';
export const REMEMBER_EMAIL_KEY = 'ceroa_remembered_email';
export const rememberedEmail = () => {
  try { const value = localStorage.getItem(REMEMBER_EMAIL_KEY) || ''; return validEmail(value) ? value : ''; } catch { return ''; }
};
export const saveRememberedEmail = (email: string, remember: boolean) => {
  try { if (remember) localStorage.setItem(REMEMBER_EMAIL_KEY, email); else localStorage.removeItem(REMEMBER_EMAIL_KEY); } catch { /* Storage may be unavailable. */ }
};
export const useLoginForm = (login: (email: string, password: string) => Promise<void>) => {
  const [email, setEmail] = useState(rememberedEmail);
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(() => Boolean(rememberedEmail()));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState(() => new URLSearchParams(location.search).get('auth') === 'error' ? 'El acceso con el proveedor fue cancelado o no pudo completarse. Intenta nuevamente.' : '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toggleRemember = (value: boolean) => { setRemember(value); if (!value) saveRememberedEmail('', false); };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    const next: Record<string, string> = {};
    if (!validEmail(email)) next.email = 'Ingresa un correo válido, sin espacios.';
    if (!password) next.password = 'Ingresa tu contraseña.';
    setErrors(next); setMessage('');
    if (Object.keys(next).length) { document.getElementById('auth-' + Object.keys(next)[0])?.focus(); return; }
    setIsSubmitting(true); saveRememberedEmail(email, remember);
    try { await login(email, password); }
    catch (cause) { setMessage(cause instanceof Error ? cause.message : 'No fue posible iniciar sesión.'); }
    finally { setPassword(''); setIsSubmitting(false); }
  };
  return { email, setEmail, password, setPassword, remember, toggleRemember, errors, message, isSubmitting, submit };
};
