import { DEBT_TYPES } from './debtTypeSchemas';

const categories = [...new Set(DEBT_TYPES.map(type => type.category))];

export function CategorySelect({ id, value, disabled, className, onChange }: {
  id: string;
  value: string;
  disabled?: boolean;
  className?: string;
  onChange: (value: string) => void;
}) {
  return <select id={id} value={value} disabled={disabled} className={className} onChange={event => onChange(event.target.value)}>
    <option value="">Selecciona una categoría</option>
    {value && !categories.includes(value) && <option value={value}>{value}</option>}
    {categories.map(category => <option key={category} value={category}>{category}</option>)}
  </select>;
}
