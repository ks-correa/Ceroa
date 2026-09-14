import { useApp } from '../../context/AppContext';
import { AuthField } from './AuthFields';
import { AuthLayout, submitClass } from './AuthLayout';
import { useRecoveryForm } from './useRecoveryForm';

export const RecoveryView = () => {
  const { setCurrentScreen } = useApp();
  const form = useRecoveryForm();
  const title = { email: 'Recuperar acceso', code: 'Verificar código', password: 'Nueva contraseña', done: 'Contraseña actualizada' }[form.step];
  return <AuthLayout title={title}>
    {form.message && <p role="status" className="mb-4">{form.message}</p>}
    {form.step !== 'done' && <form noValidate onSubmit={form.submit} aria-busy={form.busy} className="space-y-4">
      <fieldset disabled={form.busy} className="space-y-4">
        {form.step === 'email' && <AuthField name="email" label="Correo electrónico" type="email" autoComplete="email" value={form.email} onChange={form.setEmail} error={form.errors.email} />}
        {form.step === 'code' && <AuthField name="code" label="Código de recuperación" autoComplete="one-time-code" inputMode="numeric" maxLength={8} value={form.code} onChange={form.setCode} error={form.errors.code} />}
        {form.step === 'password' && <>
          <p className="text-sm">Usa mínimo 8 caracteres, una mayúscula y un carácter especial. Máximo 72 bytes.</p>
          <AuthField name="password" label="Nueva contraseña" type="password" autoComplete="new-password" value={form.password} onChange={form.setPassword} error={form.errors.password} />
          <AuthField name="confirmPassword" label="Confirmar contraseña" type="password" autoComplete="new-password" value={form.confirmPassword} onChange={form.setConfirmPassword} error={form.errors.confirmPassword} />
        </>}
        {form.error && <p role="alert">{form.error}</p>}
        <button type="submit" className={submitClass}>{form.busy ? 'Procesando…' : { email: 'Solicitar código', code: 'Verificar código', password: 'Actualizar contraseña' }[form.step]}</button>
      </fieldset>
    </form>}
    {(form.step === 'code' || form.step === 'password') && <button type="button" disabled={form.busy} onClick={form.restart} className="mt-4 underline">Solicitar otro código o cambiar correo</button>}
    <button type="button" disabled={form.busy} onClick={() => setCurrentScreen('login')} className="mt-5 block underline">Volver a Inicio de sesión</button>
  </AuthLayout>;
};
