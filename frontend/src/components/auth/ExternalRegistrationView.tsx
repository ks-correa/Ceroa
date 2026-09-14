import { useEffect, useState } from 'react';
import { authService, PendingIdentity } from '../../services/authService';
import { AuthLayout, submitClass } from './AuthLayout';
import { ConsentFields, PersonalFields } from './AuthFields';
import { emptyRegistration, useRegisterForm } from './useRegisterForm';
const CompletionForm = ({ pending }: { pending: PendingIdentity }) => {
  const [cancelError, setCancelError] = useState('');
  const form = useRegisterForm(async payload => {
    await authService.completeExternal(payload);
    window.location.replace(window.location.pathname);
  }, { ...emptyRegistration, fullName: pending.fullName, email: pending.email }, true);
  const cancel = async () => {
    try { await authService.cancelExternal(); window.location.replace(window.location.pathname); }
    catch { setCancelError('No fue posible cancelar. Intenta nuevamente.'); }
  };
  return <AuthLayout title="Completa tu registro">
    <p className="mb-4">Confirma tus datos para crear tu cuenta de Ceroa.</p>
    <form noValidate onSubmit={form.submit} className="space-y-4" aria-busy={form.isSubmitting}>
      <fieldset disabled={form.isSubmitting} className="space-y-4">
        <PersonalFields {...form} emailReadOnly={Boolean(pending.email)} />
        <ConsentFields {...form} />
        {form.message && <p role="alert">{form.message}</p>}
        <button type="submit" className={submitClass}>{form.isSubmitting ? 'Creando cuenta…' : 'Finalizar registro'}</button>
        <button type="button" onClick={() => void cancel()} className="underline">Cancelar registro</button>
        {cancelError && <p role="alert">{cancelError}</p>}
      </fieldset>
    </form>
  </AuthLayout>;
};
export const ExternalRegistrationView = () => {
  const [pending, setPending] = useState<PendingIdentity | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { let active = true; authService.pendingExternal().then(value => { if (active) setPending(value); }).catch(() => { if (active) setError('El registro venció o fue cancelado. Inicia nuevamente con tu proveedor.'); }); return () => { active = false; }; }, []);
  if (pending) return <CompletionForm pending={pending} />;
  return <AuthLayout title="Completa tu registro">{error ? <><p role="alert">{error}</p><a href={window.location.pathname}>Volver a iniciar sesión</a></> : <p role="status">Consultando tus datos…</p>}</AuthLayout>;
};
