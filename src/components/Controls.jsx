import {useEffect,useState} from 'react';

export function ChoiceGroup({values,current,onPick,className = ''}) {
  return <div className={'choices ' + className}>
    {values.map(([value,label]) => <button key={value} type="button" className={'chip ' + (value === current ? 'active' : '')} aria-pressed={value === current} onClick={() => onPick(value)}>{label}</button>)}
  </div>;
}

export function SideSwitch({draft,onPick}) {
  return draft.sides === 2 ? <ChoiceGroup values={[['front','Front'],['back','Back']]} current={draft.face} onPick={onPick}/> : null;
}

/** Number input that keeps what the user is typing (even "" or "-") while reporting a numeric value. */
export function NumberField({value,onValue,...props}) {
  const [text,setText] = useState(Number.isNaN(value) ? '' : String(value));
  useEffect(() => { setText(t => (t === '' && Number.isNaN(value)) || Number(t) === value ? t : (Number.isNaN(value) ? '' : String(value))); },[value]);
  return <input type="number" inputMode="numeric" step="1" value={text} onChange={e => { setText(e.target.value); onValue(e.target.value === '' ? NaN : e.target.valueAsNumber,e.target.value); }} {...props}/>;
}
