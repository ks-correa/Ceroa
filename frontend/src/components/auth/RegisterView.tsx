import { useApp } from '../../context/AppContext';
import { useState } from 'react';
import { useRegisterForm } from './useRegisterForm';
import { AuthField, PersonalFields, ConsentFields } from './AuthFields';
import { AuthLayout, submitClass } from './AuthLayout';
import { ProviderButtons } from './ProviderButtons';
export const RegisterView = () => {
  const { handleRegister, setCurrentScreen } = useApp();
  const form = useRegisterForm(handleRegister);
  const [ssoBusy, setSsoBusy] = useState(false);
  return <AuthLayout title="Crear cuenta">
    <form noValidate onSubmit={form.submit} className="space-y-4" aria-busy={form.isSubmitting}>
      <fieldset disabled={form.isSubmitting || ssoBusy} className="space-y-4">
        <PersonalFields {...form} />
        <AuthField name="password" label="Contraseña" type="password" autoComplete="new-password" value={form.values.password} onChange={value => form.change('password', value)} error={form.errors.password} />
        <p className="text-sm text-slate-500">Mínimo 8 caracteres, una mayúscula y un carácter especial.</p>
        <AuthField name="confirmPassword" label="Confirmar contraseña" type="password" autoComplete="new-password" value={form.values.confirmPassword} onChange={value => form.change('confirmPassword', value)} error={form.errors.confirmPassword} />
        <ConsentFields {...form} />
        {form.message && <p role="alert">{form.message}</p>}
        <button type="submit" className={submitClass}>{form.isSubmitting ? 'Creando cuenta…' : 'Crear cuenta'}</button>
      </fieldset>
    </form>
    <ProviderButtons disabled={form.isSubmitting} onBusyChange={setSsoBusy} onStart={() => { form.change('password', ''); form.change('confirmPassword', ''); }} />
    <button type="button" disabled={form.isSubmitting || ssoBusy} onClick={() => setCurrentScreen('login')} className="mt-5 underline">¿Ya tienes una cuenta? Inicia sesión</button>
  </AuthLayout>;
};
