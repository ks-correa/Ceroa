import { FormEvent, useEffect, useState } from 'react';
import { recoveryService } from '../../services/recoveryService';
import { ApiError } from '../../services/api';
import { validEmail, validatePasswords } from './auth.validation';

export function useRecoveryForm() {
  const [step, setStep] = useState<'email' | 'code' | 'password' | 'done'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [requestId, setRequestId] = useState('');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { document.querySelector<HTMLInputElement>('form input')?.focus(); }, [step]);
  const restart = () => {
    setCode(''); setPassword(''); setConfirmPassword(''); setRequestId('');
    setErrors({}); setMessage(''); setError(''); setStep('email');
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const validation: Record<string, string> = step === 'email'
      ? (validEmail(email) ? {} : { email: 'Ingresa un correo válido, sin espacios.' })
      : step === 'code' ? (/^[0-9]{8}$/.test(code) ? {} : { code: 'Ingresa los 8 dígitos del código.' })
        : validatePasswords(password, confirmPassword) as Record<string, string>;
    setErrors(validation); setError('');
    if (Object.keys(validation).length) {
      document.getElementById('auth-' + Object.keys(validation)[0])?.focus(); return;
    }
    setBusy(true);
    try {
      if (step === 'email') {
        const result = await recoveryService.request(email);
        setRequestId(result.requestId); setMessage(result.message); setStep('code');
      } else if (step === 'code') {
        await recoveryService.verify(requestId, code);
        setCode(''); setMessage('Código válido. Define tu nueva contraseña en los próximos 5 minutos.'); setStep('password');
      } else if (step === 'password') {
        await recoveryService.reset(requestId, password, confirmPassword);
        setPassword(''); setConfirmPassword(''); setRequestId(''); setMessage('Tu contraseña se actualizó. Ya puedes iniciar sesión.'); setStep('done');
      }
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'No fue posible completar la solicitud. Intenta nuevamente.');
      if (cause instanceof ApiError) setErrors(cause.fieldErrors);
      setPassword(''); setConfirmPassword('');
    } finally { setBusy(false); }
  };
  return { step, email, setEmail, code, setCode, password, setPassword, confirmPassword, setConfirmPassword,
    busy, errors, message, error, submit, restart };
}
