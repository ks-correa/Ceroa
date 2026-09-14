import { useState } from 'react';
import { userService } from '../../services/userService';
import { validateEmail } from './profile.validation';

export type EmailChangeStep = 'request' | 'verify' | 'success';

export interface EmailChangeErrors {
  newEmail?: string;
  code?: string;
}

export interface UseEmailChangeFormReturn {
  step: EmailChangeStep;
  newEmail: string;
  setNewEmail: (v: string) => void;
  code: string;
  setCode: (v: string) => void;
  busy: boolean;
  errors: EmailChangeErrors;
  error: string | null;
  submitRequest: (event: React.FormEvent) => Promise<void>;
  submitVerify: (event: React.FormEvent, onSuccess: (email: string) => void) => Promise<void>;
  cancel: () => void;
}

/**
 * Manages the multi-step email change flow.
 * Step 1 'request': validate and send newEmail, get back requestId.
 * Step 2 'verify': submit code + requestId, call onSuccess with new email on success.
 * On any error, preserves values so user can retry.
 */
export function useEmailChangeForm(): UseEmailChangeFormReturn {
  const [step, setStep] = useState<EmailChangeStep>('request');
  const [newEmail, setNewEmail] = useState('');
  const [code, setCode] = useState('');
  const [requestId, setRequestId] = useState('');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<EmailChangeErrors>({});
  const [error, setError] = useState<string | null>(null);

  const submitRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const emailError = validateEmail(newEmail);
    if (emailError) {
      setErrors({ newEmail: emailError });
      return;
    }
    setErrors({});

    try {
      setBusy(true);
      const result = await userService.requestEmailChange(newEmail.trim());
      setRequestId(result.requestId);
      setStep('verify');
    } catch (cause) {
      // On request error: currentEmail unchanged, show error
      setError(cause instanceof Error ? cause.message : 'No fue posible enviar el código. Intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  const submitVerify = async (event: React.FormEvent, onSuccess: (email: string) => void) => {
    event.preventDefault();
    setError(null);

    if (!code.trim()) {
      setErrors({ code: 'Ingresa el código de verificación.' });
      return;
    }
    setErrors({});

    try {
      setBusy(true);
      const updatedProfile = await userService.verifyEmailChange(requestId, code.trim());
      setStep('success');
      onSuccess(updatedProfile.email);
    } catch (cause) {
      // On verify error: clear code but preserve newEmail, show error
      setCode('');
      setError(cause instanceof Error ? cause.message : 'Código inválido o expirado. Intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    setStep('request');
    setNewEmail('');
    setCode('');
    setRequestId('');
    setErrors({});
    setError(null);
  };

  return {
    step,
    newEmail,
    setNewEmail,
    code,
    setCode,
    busy,
    errors,
    error,
    submitRequest,
    submitVerify,
    cancel
  };
}
