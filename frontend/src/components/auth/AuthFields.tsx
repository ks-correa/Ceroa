import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { FieldErrors, RegistrationValues } from './auth.validation';
export const AuthField = ({ name, label, value, onChange, error, type = 'text', autoComplete, readOnly = false, inputMode, maxLength }: {
  name: string; label: string; value: string; onChange: (value: string) => void; error?: string; type?: string; autoComplete?: string; readOnly?: boolean;
  inputMode?: 'numeric'; maxLength?: number;
}) => {
  const [visible, setVisible] = useState(false);
  return <div className="space-y-1">
    <label htmlFor={'auth-' + name} className="block text-sm font-semibold">{label}</label>
    <div className="relative">
      <input id={'auth-' + name} name={name} type={type === 'password' && visible ? 'text' : type}
        value={value} onChange={event => onChange(event.target.value)} required readOnly={readOnly} inputMode={inputMode} maxLength={maxLength}
        autoComplete={autoComplete} aria-invalid={Boolean(error)} aria-describedby={error ? name + '-error' : undefined}
        className="w-full min-w-0 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent py-2.5 pl-3 pr-12 text-base" />
      {type === 'password' && <button type="button" onClick={() => setVisible(!visible)}
        aria-label={(visible ? 'Ocultar ' : 'Mostrar ') + label.toLowerCase()} aria-pressed={visible}
        className="absolute right-1 top-0 h-full px-3">{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button>}
    </div>
    {error && <p id={name + '-error'} className="text-sm text-red-700 dark:text-red-300">{error}</p>}
  </div>;
};
export const PersonalFields = ({ values, errors, change, emailReadOnly = false }: {
  values: RegistrationValues; errors: FieldErrors; change: (field: keyof RegistrationValues, value: string | boolean) => void; emailReadOnly?: boolean;
}) => <>
  <AuthField name="fullName" label="Nombre completo" autoComplete="name" value={values.fullName} onChange={value => change('fullName', value)} error={errors.fullName} />
  <AuthField name="email" label="Correo electrónico" type="email" autoComplete="email" value={values.email} onChange={value => change('email', value)} error={errors.email} readOnly={emailReadOnly} />
  <AuthField name="phone" label="Celular" type="tel" autoComplete="tel" value={values.phone} onChange={value => change('phone', value)} error={errors.phone} />
  <AuthField name="birthDate" label="Fecha de nacimiento" type="date" autoComplete="bday" value={values.birthDate} onChange={value => change('birthDate', value)} error={errors.birthDate} />
</>;
export const ConsentFields = ({ values, errors, change }: {
  values: RegistrationValues; errors: FieldErrors; change: (field: keyof RegistrationValues, value: string | boolean) => void;
}) => <div className="space-y-3">
  {(['acceptTerms', 'acceptPrivacy'] as const).map(name => <div key={name}>
    <label className="flex items-start gap-2 text-sm" htmlFor={'auth-' + name}>
      <input id={'auth-' + name} type="checkbox" className="mt-1" checked={values[name]} onChange={event => change(name, event.target.checked)}
        aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? name + '-error' : undefined} />
      {name === 'acceptTerms' ? 'Acepto los términos y condiciones de Ceroa.' : 'Acepto la política de privacidad y tratamiento de datos.'}
    </label>
    {errors[name] && <p id={name + '-error'} className="text-sm text-red-700 dark:text-red-300">{errors[name]}</p>}
  </div>)}
</div>;
