import { useApp } from '../../context/AppContext';
import { useState } from 'react';
import { useLoginForm } from './useLoginForm';
import { AuthField } from './AuthFields';
import { AuthLayout, submitClass } from './AuthLayout';
import { ProviderButtons } from './ProviderButtons';
export const LoginView = () => {
  const { handleLogin, setCurrentScreen } = useApp();
  const form = useLoginForm(handleLogin);
  const [ssoBusy, setSsoBusy] = useState(false);
  return <AuthLayout title="Iniciar sesión">
    <form noValidate onSubmit={form.submit} className="space-y-4" aria-busy={form.isSubmitting}>
      <fieldset disabled={form.isSubmitting || ssoBusy} className="space-y-4">
        <AuthField name="email" label="Correo electrónico" type="email" autoComplete="username" value={form.email} onChange={form.setEmail} error={form.errors.email} />
        <AuthField name="password" label="Contraseña" type="password" autoComplete="current-password" value={form.password} onChange={form.setPassword} error={form.errors.password} />
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.remember} onChange={event => form.toggleRemember(event.target.checked)} />Recordar correo</label>
        {form.message && <p role="alert">{form.message}</p>}
        <button type="submit" className={submitClass}>{form.isSubmitting ? 'Ingresando…' : 'Iniciar sesión'}</button>
      </fieldset>
    </form>
    <button type="button" disabled={form.isSubmitting} onClick={() => { form.setPassword(''); setCurrentScreen('recovery'); }} className="mt-4 underline">¿Olvidaste tu contraseña?</button>
    <ProviderButtons disabled={form.isSubmitting} onBusyChange={setSsoBusy} onStart={() => form.setPassword('')} />
    <button type="button" disabled={form.isSubmitting || ssoBusy} onClick={() => setCurrentScreen('register')} className="mt-5 underline">¿Aún no tienes una cuenta? Crear cuenta</button>
  </AuthLayout>;
};
