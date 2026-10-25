import { useEffect, useRef, useState } from 'react';
import { UploadCloud, FileText, CheckCircle2, LoaderCircle, ShieldCheck, ArrowRight } from 'lucide-react';
import { apiRequest } from '../../services/api';
import { DebtFormState, DEBT_TYPES, RATE_OPTIONS } from './form/debtTypeSchemas';
import { TypeSpecificSection } from './form/TypeSpecificSection';
import { CategorySelect } from './form/CategorySelect';
import { DebtType, RateType } from '../../types';

export const DOCUMENT_FIELDS = [
  ['name','Nombre personalizado','text'],['entity','Entidad','text'],['type','Tipo de obligación','type'],
  ['categoryLabel','Categoría','text'],['originalAmount','Monto original o cupo total (COP)','number'],
  ['currentBalance','Saldo actual (COP)','number'],['interestRate','Tasa de interés (%)','number'],['rateType','Modalidad de tasa','rate'],
  ['monthlyPayment','Cuota mensual (COP)','number'],['minimumPayment','Pago mínimo (COP)','number'],
  ['dueDateDay','Día de pago','integer'],['nextDueDate','Próximo vencimiento','date'],['disbursementDate','Fecha de desembolso','date'],
  ['termRemainingMonths','Meses restantes','integer'],['accountNumber','Referencia de cuenta','text'],['notes','Notas','text']
] as const;
type Field = typeof DOCUMENT_FIELDS[number][0];

const FIELD_GUIDANCE: Record<Field, { example: string; help: string }> = {
  name: { example: 'Ej. Tarjeta principal', help: 'Escribe un nombre para reconocer esta obligación.' },
  entity: { example: 'Ej. Bancolombia', help: 'Nombre del banco, comercio o persona a quien debes.' },
  type: { example: '', help: 'Selecciona el tipo de obligación que aparece en el documento.' },
  categoryLabel: { example: '', help: 'Elige una de las categorías disponibles.' },
  originalAmount: { example: 'Ej. 5000000', help: 'Monto inicial o cupo total en pesos, sin símbolo $ ni separadores de miles.' },
  currentBalance: { example: 'Ej. 2500000', help: 'Lo que debes actualmente en pesos, sin símbolo $ ni separadores de miles.' },
  interestRate: { example: 'Ej. 24.5', help: 'Escribe el porcentaje sin el signo %. Ejemplo: 24.5 equivale a 24,5 %.' },
  rateType: { example: '', help: 'Elige la modalidad indicada en el documento, como E.A. o M.V.' },
  monthlyPayment: { example: 'Ej. 350000', help: 'Valor de la cuota mensual en pesos, sin símbolo $ ni separadores de miles.' },
  minimumPayment: { example: 'Ej. 95000', help: 'Monto mínimo exigido en el extracto, en pesos; no es el saldo total.' },
  dueDateDay: { example: 'Ej. 15', help: 'Número del día del mes, del 1 al 31. Ejemplo: 15 significa pagar el día 15 de cada mes.' },
  nextDueDate: { example: '', help: 'Selecciona la fecha completa del próximo pago. Ejemplo: 15 de noviembre de 2026.' },
  disbursementDate: { example: '', help: 'Selecciona la fecha completa en que recibiste el préstamo. Ejemplo: 10 de marzo de 2025.' },
  termRemainingMonths: { example: 'Ej. 24', help: 'Cantidad de meses que faltan para terminar de pagar; escribe un número entero.' },
  accountNumber: { example: 'Ej. 1234567890', help: 'Referencia o número de la obligación tal como aparece en el documento.' },
  notes: { example: 'Ej. La cuota incluye seguro de vida', help: 'Información adicional que quieras recordar (opcional).' },
};
type Evidence = {field:string;quote:string;location:string};
type Extraction = {format:string;sheets:string[];requiresSheetSelection:boolean;draft:Record<string,string|number|null>|null;evidence:Evidence[];warnings:string[]};
type Props = {debtId:string|null;onCancel:()=>void;onSaved:()=>Promise<void>};
const display=(value:unknown)=>value===null||value===undefined?'':String(value);
export function DocumentDebtReview({debtId,onCancel,onSaved}:Props) {
  const [file,setFile]=useState<File|null>(null),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [result,setResult]=useState<Extraction|null>(null),[sheet,setSheet]=useState('');
  const [values,setValues]=useState<Partial<Record<Field,string>>>({}),[original,setOriginal]=useState<Record<string,unknown>|null>(null);
  const [details,setDetails]=useState<Record<string,unknown>>({}),[edited,setEdited]=useState<Set<string>>(new Set()),[reviewed,setReviewed]=useState(false);
  const alive=useRef(true),generation=useRef(0),abort=useRef<AbortController|null>(null);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;generation.current++;abort.current?.abort();};},[]);
  const run=async(work:(signal:AbortSignal,turn:number)=>Promise<void>)=>{
    const turn=++generation.current;const controller=new AbortController();abort.current=controller;setBusy(true);setError('');
    try{await work(controller.signal,turn);}catch(e){if(alive.current&&turn===generation.current)setError(e instanceof Error?e.message:'No pude procesar el documento.');}
    finally{if(alive.current&&turn===generation.current)setBusy(false);}
  };
  const extract=()=>void run(async(signal,turn)=>{
    if(!file||!consent)return;
    if(file.size>8*1024*1024)throw new Error('El archivo supera 8 MB.');
    const current=debtId?await apiRequest<Record<string,unknown>>(`/debts/${debtId}`,{signal}):null;
    const body=new FormData();body.append('file',file);body.append('operation',debtId?'update':'create');body.append('consent','true');if(debtId)body.append('debtId',debtId);if(sheet)body.append('sheet',sheet);
    const response=await apiRequest<Extraction>('/documents/debt-draft',{method:'POST',body,signal});
    if(!alive.current||turn!==generation.current)return;
    setResult(response);setReviewed(false);setOriginal(current);setEdited(new Set());
    if(response.draft){setValues(Object.fromEntries(DOCUMENT_FIELDS.map(([key])=>[key,display(current?current[key]:response.draft?.[key])])));setDetails((current?.details as Record<string,unknown>)||{});setFile(null);}
  });
  const change=(key:Field,value:string)=>{setValues(old=>({...old,[key]:value}));setEdited(old=>new Set([...old,key]));setReviewed(false);};
  const changeDetail=(key:string,value:unknown)=>{setDetails(old=>({...old,[key]:value}));setEdited(old=>new Set([...old,`details.${key}`]));setReviewed(false);};
  const type=values.type as DebtType|undefined;
  const form:DebtFormState={name:values.name||'',entity:values.entity||'',type:type||'other',categoryLabel:values.categoryLabel||'',originalAmount:values.originalAmount?Number(values.originalAmount):undefined,
    currentBalance:Number(values.currentBalance),interestRate:Number(values.interestRate),rateType:(values.rateType||'') as RateType,monthlyPayment:Number(values.monthlyPayment),minimumPayment:Number(values.minimumPayment),dueDateDay:Number(values.dueDateDay),
    nextDueDate:values.nextDueDate||'',disbursementDate:values.disbursementDate||undefined,termRemainingMonths:Number(values.termRemainingMonths),accountNumber:values.accountNumber||'',notes:values.notes||'',color:display(original?.color),details};
  const save=(event:React.FormEvent)=>{event.preventDefault();if(!reviewed||busy)return;void run(async(signal,turn)=>{
    const payload:Record<string,unknown>={};
    for(const [key,,kind] of DOCUMENT_FIELDS){const value=values[key]?.trim()||'';payload[key]=!value?null:kind==='number'||kind==='integer'?Number(value):value;}
    if(debtId){
      const latest=await apiRequest<Record<string,unknown>>(`/debts/${debtId}`,{signal});
      for(const [key] of DOCUMENT_FIELDS){if(edited.has(key)&&JSON.stringify(latest[key]??null)!==JSON.stringify(original?.[key]??null))throw new Error('Esta obligación cambió mientras revisabas el documento. Vuelve a abrirla para revisar los datos actuales.');if(!edited.has(key))payload[key]=latest[key]??null;}
      const latestDetails=(latest.details as Record<string,unknown>)||{};const reviewedDetails={...latestDetails};
      for(const key of Object.keys(details)){if(edited.has(`details.${key}`)){if(JSON.stringify(latestDetails[key])!==JSON.stringify((original?.details as Record<string,unknown>)?.[key]))throw new Error('Los detalles de esta obligación cambiaron. Vuelve a abrirla antes de guardar.');reviewedDetails[key]=details[key];}}
      payload.details=reviewedDetails;payload.color=latest.color??null;
    }else{payload.color=null;payload.details=details;}
    await apiRequest(debtId?`/debts/${debtId}`:'/debts',{method:debtId?'PUT':'POST',body:JSON.stringify(payload),signal});
    if(alive.current&&turn===generation.current)await onSaved();
  });};
  return <section className="mt-5 min-w-0 space-y-5 text-slate-900 dark:text-slate-100" aria-label="Importar documento financiero">
    <div className="flex gap-2 text-xs font-semibold" aria-label="Pasos de lectura">
      {['Subir documento','Revisar datos','Guardar'].map((step,index)=><span key={step} className={`flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2.5 py-3 ${index===(result?.draft?1:0)?'bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-cyan-300':'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}><span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full border border-current">{index+1}</span><span>{step}</span></span>)}
    </div>
    <div><h4 className="text-lg font-bold">{result?.draft?'Revisa los datos del documento':'Sube tu documento financiero'}</h4><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{result?.draft?'Tú decides qué guardar. Comprueba los valores y completa lo que falte.':'Extraemos los datos para ayudarte a completar la obligación.'}</p></div>
    {!result?.draft&&<>
      <label className={`relative flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed px-4 py-7 text-center transition-colors focus-within:ring-4 focus-within:ring-teal-500/20 ${file?'border-teal-500 bg-teal-50/70 dark:bg-teal-950/30':'border-slate-300 bg-slate-50 hover:border-teal-500 hover:bg-teal-50/50 dark:border-slate-600 dark:bg-slate-800/40'} ${busy?'pointer-events-none opacity-60':''}`}>
        <input aria-label="Documento financiero" className="sr-only" type="file" accept=".pdf,.docx,.xlsx" disabled={busy} onChange={e=>{const selected=e.target.files?.[0];if(!selected)return;setFile(selected);setResult(null);setSheet('');setReviewed(false);setError('');}}/>
        <span className="mb-3 rounded-2xl bg-white p-3 text-teal-700 shadow-sm dark:bg-slate-900 dark:text-cyan-400">{file?<FileText className="h-7 w-7"/>:<UploadCloud className="h-7 w-7"/>}</span>
        {file?<><span className="max-w-full break-all text-sm font-bold">{file.name}</span><span className="mt-1 flex items-center gap-1.5 text-xs text-teal-700 dark:text-cyan-400"><CheckCircle2 className="h-4 w-4"/>Archivo seleccionado · {file.size<1024*1024?Math.max(1,Math.ceil(file.size/1024)).toLocaleString('es-CO')+' KB':(file.size/1024/1024).toLocaleString('es-CO',{maximumFractionDigits:2})+' MB'}</span></>:<><span className="text-base font-bold">Selecciona un archivo para comenzar</span><span className="mt-1 text-xs text-slate-500 dark:text-slate-400">PDF con texto, Word (.docx) o Excel (.xlsx) · Hasta 8 MB</span></>}
        <span className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white">{file?'Cambiar archivo':'Seleccionar archivo'}</span>
      </label>
      <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">Carga un documento de una sola obligación. Si es un PDF escaneado, puedes continuar con el formulario manual.</p>
      <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700"><div className="mb-2 flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-teal-700 dark:text-cyan-400"/>Tú mantienes el control</div><label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300"><input className="mt-1 h-4 w-4 shrink-0 accent-teal-700" type="checkbox" checked={consent} disabled={busy} onChange={e=>setConsent(e.target.checked)}/>Autorizo enviar el texto de este documento a Gemini para extraer un borrador. Puede contener datos financieros y personales.</label><p className="mt-2 pl-7 text-xs text-slate-500 dark:text-slate-400">Nada se guarda hasta que revises y confirmes los datos.</p></div>
      {result?.requiresSheetSelection&&<label className="block rounded-2xl bg-slate-50 p-4 text-sm font-semibold dark:bg-slate-800">Hoja a analizar<p className="mt-1 text-xs font-normal text-slate-500">Selecciona la hoja que contiene esta obligación.</p><select aria-label="Hoja a analizar" className="mt-3 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-600 dark:bg-slate-900" value={sheet} onChange={e=>setSheet(e.target.value)} disabled={busy}><option value="">Selecciona una hoja</option>{result.sheets.map(name=><option key={name}>{name}</option>)}</select></label>}
      <button type="button" disabled={busy||!file||!consent||!!result?.requiresSheetSelection&&!sheet} onClick={extract} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-40">{busy?<LoaderCircle className="h-4 w-4 animate-spin"/>:<ArrowRight className="h-4 w-4"/>}{busy?'Leyendo documento…':'Extraer borrador'}</button>
      {busy&&<p role="status" className="text-center text-xs text-slate-500 dark:text-slate-400">Estamos preparando tus datos. Esto puede tardar unos instantes.</p>}
    </>}
    {result?.warnings&&<ul className="text-sm text-amber-800 dark:text-amber-200 list-disc pl-5">{result.warnings.map((warning,i)=><li key={i}>{warning}</li>)}</ul>}
    {result?.draft&&<form onSubmit={save} className="space-y-4">
      <p className="text-sm">{debtId?'Conservamos los datos actuales. Usa cada propuesta que quieras aplicar o corrige el valor.':'Completa los datos que faltan y corrige las propuestas. Un campo vacío sigue siendo desconocido.'}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {DOCUMENT_FIELDS.map(([key,label,kind])=>{
          const proposal=result.draft?.[key],proof=result.evidence.filter(item=>item.field===key),id=`document-${key}`;
          return <div key={key} className="min-w-0 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-2 [&_input]:min-h-11 [&_input]:min-w-0 [&_select]:min-h-11 [&_blockquote]:break-words">
            <label htmlFor={id} className="block text-sm font-semibold">{label}</label>
            <p className="text-xs text-slate-500">{edited.has(key)?'Revisado o corregido por ti':debtId?'Valor actual conservado':proposal===null?'Sin dato verificable':'Propuesta del documento'}</p>
            {debtId&&<><p className="text-xs">Actual: {display(original?.[key])||'Sin dato'} · Propuesta: {display(proposal)||'Sin dato'}</p>{proposal!==null&&proposal!==undefined&&key!=='type'&&<button type="button" disabled={busy} className="underline text-xs text-teal-700 dark:text-cyan-400" onClick={()=>change(key,display(proposal))}>Usar propuesta de {label}</button>}</>}
            {key==='categoryLabel'?<CategorySelect id={id} value={values[key]||''} disabled={busy} className="w-full border rounded p-2 bg-transparent" onChange={value=>change(key,value)}/>:
              kind==='type'||kind==='rate'?<select id={id} value={values[key]||''} disabled={busy||key==='type'&&!!debtId} required aria-describedby={`${id}-help`} className="w-full border rounded p-2 bg-transparent" onChange={e=>{change(key,e.target.value);if(key==='type'){setDetails({});change('categoryLabel',DEBT_TYPES.find(t=>t.value===e.target.value)?.category||'');}}}><option value="">{kind==='type'?'Selecciona un tipo de obligación':'Selecciona una modalidad de tasa'}</option>{(kind==='type'?DEBT_TYPES:RATE_OPTIONS).map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select>:
              <input id={id} type={kind==='integer'?'number':kind} step={kind==='integer'?'1':'any'} min={key==='dueDateDay'?1:kind==='number'||kind==='integer'?0:undefined} max={key==='dueDateDay'?31:undefined} required={key==='name'||key==='currentBalance'} value={values[key]||''} disabled={busy} aria-describedby={`${id}-help`} className="w-full border rounded p-2 bg-transparent" placeholder={FIELD_GUIDANCE[key].example} onChange={e=>change(key,e.target.value)}/>}
            <p id={`${id}-help`} className="text-xs text-slate-500 dark:text-slate-400">{FIELD_GUIDANCE[key].help}</p>
            {proof.map((item,i)=><blockquote key={i} className="text-xs text-slate-600 dark:text-slate-300 border-l-2 pl-2 whitespace-pre-wrap">{item.quote}<span className="block text-slate-500">{item.location}</span></blockquote>)}
          </div>;
        })}
      </div>
      {type==='credit_card'&&<div className="grid sm:grid-cols-2 gap-4">
        <label className="text-sm">Día de corte (si no ingresaste una fecha)<input type="number" min={1} max={31} placeholder="Ej. 20 (d?a del mes)" value={display(details.statementDay)} className="block w-full border rounded p-2 bg-transparent" onChange={e=>changeDetail('statementDay',e.target.value?Number(e.target.value):null)}/></label>
        <label className="text-sm">Fecha de corte<input type="date" value={display(details.statementDate)} className="block w-full border rounded p-2 bg-transparent" onChange={e=>changeDetail('statementDate',e.target.value||null)}/><span className="block mt-1 text-xs text-slate-500">Selecciona la fecha completa. Ejemplo: 20 de octubre de 2026.</span></label>
      </div>}
      {(type==='retail_credit'||type==='installment_purchase')&&<div className="grid sm:grid-cols-2 gap-4">
        <label className="text-sm">Total de cuotas<input type="number" min={1} step={1} required placeholder="Ej. 36" value={display(details.totalInstallments)} className="block w-full border rounded p-2 bg-transparent" onChange={e=>changeDetail('totalInstallments',e.target.value?Number(e.target.value):null)}/></label>
        <label className="text-sm">Tipo de costo<select required value={display(details.costType)} className="block w-full border rounded p-2 bg-transparent" onChange={e=>changeDetail('costType',e.target.value)}><option value="">Selecciona el costo</option><option value="RATE">Tasa de interés</option><option value={type==='retail_credit'?'FEE':'FIXED_FEE'}>Costo fijo en COP</option></select></label>
        {(details.costType==='FEE'||details.costType==='FIXED_FEE')&&<label className="text-sm">Costo fijo (COP)<input type="number" min={0.01} step="any" required placeholder="Ej. 45000" value={display(details[type==='retail_credit'?'financialCost':'fixedFee'])} className="block w-full border rounded p-2 bg-transparent" onChange={e=>changeDetail(type==='retail_credit'?'financialCost':'fixedFee',e.target.value?Number(e.target.value):null)}/></label>}
      </div>}
      {type&&<><p className="text-xs text-slate-500">Los detalles específicos no se extraen automáticamente: completa los aplicables a tu obligación.</p><TypeSpecificSection preserveUnknownDefaults form={form} errors={{}} onFieldChange={(key,value)=>{if(key in values)change(key as Field,display(value));}} onDetailChange={changeDetail}/></>}
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={reviewed} disabled={busy} onChange={e=>setReviewed(e.target.checked)}/>Revisé los valores y quiero {debtId?'actualizar':'guardar'} esta obligación en Ceroa.</label>
      <button type="submit" disabled={busy||!reviewed} className="min-h-12 w-full rounded-xl bg-teal-700 text-white px-4 py-3 font-semibold disabled:opacity-40">{busy?'Guardando…':debtId?'Guardar cambios revisados':'Guardar obligación revisada'}</button>
    </form>}
    {error&&<p role="alert" className="text-sm text-red-700 dark:text-red-400">{error}</p>}
    <button type="button" onClick={onCancel} className="min-h-11 w-full rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Cancelar lectura y volver al formulario manual</button>
  </section>;
}
