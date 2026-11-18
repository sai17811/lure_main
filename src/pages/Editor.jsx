import {Suspense,lazy,useEffect,useRef,useState} from 'react';
import {DOUBLE_SIDE_SURCHARGE,colors,PREVIEW3D_IDS,STUDIO_IDS,product} from '../data/catalog.js';
import {money,pieces} from '../lib/format.js';
import {faceDesign,quote,tiersFor,validQty} from '../lib/pricing.js';
import {useStore} from '../store/useStore.js';
import {ErrorBoundary} from '../components/ErrorBoundary.jsx';
import {ChoiceGroup,NumberField,SideSwitch} from '../components/Controls.jsx';
import {Icon} from '../components/Icon.jsx';
import {ProofSvg} from '../components/Proof.jsx';
import {AnimatedMoney} from '../components/AnimatedMoney.jsx';

const StudioStage = lazy(() => import('../studio/Studio.jsx').then(m => ({default:m.StudioStage})));
const StudioTools = lazy(() => import('../studio/Studio.jsx').then(m => ({default:m.StudioTools})));
const Preview3D = lazy(() => import('../studio/Studio.jsx').then(m => ({default:m.Preview3D})));

function ProofPanel({item,draft}) {
  return <>
    <div className="preview-stage" style={{'--tile':item.tile}}><span className="preview-label"><Icon name="eye"/> LIVE PREVIEW</span><div id="mockup-holder"><ProofSvg item={item} draft={draft}/></div></div>
    <p className="preview-caption" id="proof-caption">{draft.face === 'front' ? 'Front' : 'Back'} view · live print preview</p>
    <div className="preview-meta"><span>{item.category}</span><span>{item.shape ? 'Custom print' : 'Personalised merchandise'}</span></div>
  </>;
}

function PreviewPanel({item,draft}) {
  const [mode,setMode] = useState('proof');
  const proof = <ProofPanel item={item} draft={draft}/>;
  if (STUDIO_IDS.includes(item.id)) {
    return <section className="preview-panel" aria-label="Design preview">
      <ErrorBoundary fallback={<>{proof}<p className="hint">Studio unavailable. The original design controls remain available.</p></>}>
        <Suspense fallback={proof}><StudioStage item={item}/></Suspense>
      </ErrorBoundary>
    </section>;
  }
  if (PREVIEW3D_IDS.includes(item.id)) {
    return <section className="preview-panel" aria-label="Design preview">
      <div className="preview-modes" aria-label="Preview mode">
        <button type="button" className="chip" aria-pressed={mode === 'proof'} onClick={() => setMode('proof')}>Design proof</button>
        <button type="button" className="chip" aria-pressed={mode === '3d'} onClick={() => setMode('3d')}>3D preview</button>
      </div>
      {mode === 'proof' ? proof : <ErrorBoundary fallback={<>{proof}<p className="hint">3D preview unavailable on this device.</p></>}>
        <Suspense fallback={<div className="three-view skeleton" style={{height:320}}/>}><Preview3D item={item}/></Suspense></ErrorBoundary>}
    </section>;
  }
  return <section className="preview-panel" aria-label="Design preview">{proof}</section>;
}

function QualityChoices({item,draft}) {
  const patchDraft = useStore.getState().patchDraft;
  return <div className="quality-grid">{item.quality.map(([label,extra,detail],index) =>
    <button type="button" key={label} className={'quality-option ' + (index === draft.quality ? 'active' : '')} aria-pressed={index === draft.quality} onClick={() => patchDraft({quality:index})}>
      <strong>{label}</strong><span>{detail}</span><b>{extra ? `+${money(extra)} / pc` : 'Included'}</b></button>)}</div>;
}

function SpecSelect({label,values,current,onChange}) {
  return <label className="field spec-select">{label}<select value={current} onChange={e => onChange(Number(e.target.value))}>
    {values.map(([value,extra],index) => <option key={value} value={index}>{value}{extra ? ` · +${money(extra)}/pc` : ''}</option>)}</select></label>;
}

function ArtPanel({item,draft}) {
  const {setFace,setText,useSampleArt,removeArt,uploadArtwork,patchDraft} = useStore.getState();
  const design = faceDesign(draft), file = useRef(null);
  const accepts = item.shape && !item.imageOnly ? ',application/pdf,.pdf' : '';
  const hint = item.shape && !item.imageOnly ? 'PNG, JPG, WebP or PDF · up to 20 MB per side' : 'PNG, JPG or WebP · up to 20 MB';
  return <div id="art-panel">
    <div className="proof-controls"><SideSwitch draft={draft} onPick={setFace}/></div>
    {item.imageOnly ? <p className="hint">Upload a clear, head-on face photo for the best cutout.</p> : <>
      <label className="field" htmlFor="design-text">Print text{draft.sides === 2 ? ' · ' + draft.face : ''}</label>
      <input id="design-text" type="text" maxLength={60} placeholder="e.g. Sunday Club" value={design.text} onChange={e => setText(e.target.value)}/></>}
    <div className="upload-row">
      <input id="artwork" ref={file} type="file" accept={'image/png,image/jpeg,image/webp' + accepts} hidden onChange={e => { const f = e.target.files[0]; e.target.value = ''; if (f) uploadArtwork(f); }}/>
      <button type="button" className="button secondary" data-action="upload" onClick={() => file.current.click()}><Icon name="upload"/> Upload artwork</button>
      <button type="button" className="button secondary" onClick={useSampleArt}>Use sample art</button>
      <button type="button" className="text-button" onClick={removeArt} hidden={!design.filename}>Remove artwork</button>
    </div>
    {draft.face === 'front' && draft.sides === 2 && draft.pdf && <label className="field pdf-both"><input type="checkbox" id="pdf-both" checked={draft.pdfBoth} onChange={e => patchDraft({pdfBoth:e.target.checked})}/> This PDF contains both sides</label>}
    <p className="hint upload-name" aria-live="polite">{design.filename || hint}{design.pdf ? ' · PDF attached for production; on-screen proof shows image or text only.' : ''}</p>
  </div>;
}

function RosterPanel({draft}) {
  const {sampleRoster,clearRoster,uploadRoster} = useStore.getState(), file = useRef(null);
  return <div className="roster-panel" id="roster-panel">
    <strong>Personalise each card</strong><p className="hint">Attach a CSV with a name column. One row equals one card.</p>
    <div className="upload-row">
      <input id="roster" ref={file} type="file" accept=".csv,text/csv" hidden onChange={e => { const f = e.target.files[0]; e.target.value = ''; if (f) uploadRoster(f); }}/>
      <button type="button" className="button secondary" onClick={() => file.current.click()}>Upload roster CSV</button>
      <button type="button" className="button secondary" onClick={sampleRoster}>Use sample roster</button>
      {draft.roster && <button type="button" className="text-button" onClick={clearRoster}>Remove roster</button>}
    </div>
    <a className="text-button csv-link" download="grooso-roster-template.csv" href={'data:text/csv;charset=utf-8,' + encodeURIComponent('name,role,id\nAsha Rao,Staff,DEMO-001\n')}>Download CSV template</a>
    <p className="hint" id="roster-info" aria-live="polite">{draft.roster ? `${draft.roster.filename} · ${pieces(draft.roster.count)} cards · preview: ${draft.roster.sample}` : 'Example columns: name,role,id'}</p>
  </div>;
}

function QuantityPanel({item,draft}) {
  const {patchDraft,setSizeQty} = useStore.getState();
  if (draft.roster) return <p className="qty-lock">{pieces(draft.roster.count)} cards from the roster</p>;
  if (draft.sizes) return <><div className="size-mix">{item.options.map(size => <label className="field" key={size}>{size}
    <NumberField min={0} max={item.max} value={draft.sizes[size]} onValue={v => setSizeQty(size,Number.isNaN(v) ? 0 : v)}/></label>)}</div>
    <p className="hint">Add a quantity for each size. The discount uses the combined quantity.</p></>;
  const presets = [...new Set([item.min,5,10,25,50,100,250,500,1000,2500,5000,10000].filter(q => q >= item.min && q <= item.max))];
  return <><div className="qty-row"><label className="field">Pieces<NumberField id="bulk-qty" min={item.min} max={item.max} value={draft.qty} onValue={v => patchDraft({qty:v})}/></label>
    <p className="hint">Order {pieces(item.min)}–{pieces(item.max)} pieces per design.</p></div>
    <div className="choices qty-presets">{presets.map(q => <button type="button" key={q} className={'chip ' + (q === draft.qty ? 'active' : '')} aria-pressed={q === draft.qty} onClick={() => patchDraft({qty:q})}>{pieces(q)}</button>)}</div></>;
}

function Quote({item,draft}) {
  if (!validQty(item,draft)) return <div id="quote" aria-live="polite"><p className="qty-error">Enter whole quantities totalling {pieces(item.min)}–{pieces(item.max)} pieces.</p></div>;
  const {unit,tier,total} = quote(item,draft);
  const next = tiersFor(item).find(([minimum]) => minimum > draft.qty);
  return <div id="quote" aria-live="polite"><div className="quote-box">
    <div className="quote"><span><small>Estimated print total</small><strong><AnimatedMoney value={total}/></strong></span><span className="quote-unit">{money(unit)}{draft.sizes ? ' average / pc' : ' / pc'}</span></div>
    <div className="quote-meta"><span>{pieces(draft.qty)} pieces</span>{tier > 0 && <b>{tier}% bulk discount</b>}</div>
    <p className="hint">{next ? `Next tier: ${next[1]}% off from ${pieces(next[0])} pieces.` : 'Highest demo volume discount applied.'}</p>
  </div></div>;
}

/** The sticky buy bar only exists on small screens (and never during tests, where matchMedia is false). */
function useCompactLayout() {
  const [compact,setCompact] = useState(false);
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const query = matchMedia('(max-width: 900px)');
    const sync = () => setCompact(query.matches);
    sync();
    query.addEventListener?.('change',sync);
    return () => query.removeEventListener?.('change',sync);
  },[]);
  return compact;
}

export function Editor() {
  const draft = useStore(s => s.draft);
  const {go,patchDraft,setSizeMode,openModal,addCustom} = useStore.getState();
  const compact = useCompactLayout();
  if (!draft) return null;
  const item = product(draft.id);
  const valid = validQty(item,draft);
  const summary = valid ? quote(item,draft) : null;
  const studio = STUDIO_IDS.includes(item.id);
  return <>
    <button className="back text-button" onClick={() => go('create')}><Icon name="back"/> Back to Create</button>
    <div className="editor">
      <PreviewPanel key={item.id} item={item} draft={draft}/>
      <section className="editor-controls">
        <span className="eyebrow">{item.shape ? 'Print & bulk studio' : 'Create studio'}</span>
        <h1>{item.name}</h1><p className="desc">{item.desc}</p>
        <div className="control"><h2>1. Choose your specs <span>{item.optionName}</span></h2>
          {item.mixed && <ChoiceGroup values={[['single','One size'],['mixed','Mix sizes']]} current={draft.sizes ? 'mixed' : 'single'} onPick={v => setSizeMode(v === 'mixed')}/>}
          {!draft.sizes && <ChoiceGroup values={item.options.map(v => [v,v])} current={draft.variant} onPick={v => patchDraft({variant:v})}/>}
          {item.colors.length > 1 && <div className="choices color-choices">{item.colors.map(color => <button type="button" key={color} className={'chip color-chip ' + (color === draft.color ? 'active' : '')} aria-pressed={color === draft.color} onClick={() => patchDraft({color})}><span className="swatch" style={{background:colors[color]}}/>{color}</button>)}</div>}
          <h3 className="option-label">Material &amp; quality</h3><QualityChoices item={item} draft={draft}/>
          <div className="spec-fields">
            {Object.entries(item.specs).map(([label,values]) => <SpecSelect key={label} label={label} values={values} current={draft.specs[label]} onChange={i => patchSpec(label,i)}/>)}
            {item.sides && <SpecSelect label="Print sides" values={[['Front only',0],['Front and back',DOUBLE_SIDE_SURCHARGE]]} current={draft.sides - 1} onChange={i => patchDraft({sides:i + 1,...(i === 0 ? {face:'front'} : {})})}/>}
          </div>
          <button type="button" className="text-button spec-request" onClick={() => openModal('custom-job')}>Need a different specification? <Icon name="arrow"/></button>
        </div>
        <div className="control"><h2>2. Add your artwork</h2>
          <ArtPanel item={item} draft={draft}/>
          {studio && <ErrorBoundary fallback={<><p className="hint">Studio layout tools unavailable on this device. You can still add text, choose specs and preview your design.</p></>}><Suspense fallback={null}><StudioTools item={item}/></Suspense></ErrorBoundary>}
          {item.roster && <RosterPanel draft={draft}/>}
          <label className="field" htmlFor="production-notes">Production notes <span className="hint">Optional</span></label>
          <textarea id="production-notes" rows={2} maxLength={400} placeholder="e.g. Keep the logo centred. Pack in sets of 25." value={draft.notes} onChange={e => patchDraft({notes:e.target.value})}/>
        </div>
        <div className="control"><h2>3. Build your order</h2>
          <div id="editor-quantity"><QuantityPanel item={item} draft={draft}/></div>
          <Quote item={item} draft={draft}/>
          <div className="purchase"><button type="button" className="button secondary" onClick={() => openModal('preview')}>Preview proof</button>
            <button type="button" className="button" disabled={!valid} onClick={addCustom}><Icon name="bag"/> {draft.editIndex === null ? 'Add to cart' : 'Save changes'}</button></div>
          <p className="sample-note">Prices in ₹ · delivery calculated at checkout</p>
        </div>
      </section>
    </div>
    {compact && <div className="editor-buybar" aria-label="Order summary">
      <span className="editor-buybar-thumb"><ProofSvg item={item} draft={{...draft,face:'front'}}/></span>
      <span className="editor-buybar-copy"><strong>{summary ? money(summary.total) : 'Check quantity'}</strong><small>{item.name} · {pieces(draft.qty)} pcs</small></span>
      <button type="button" className="button" disabled={!valid} onClick={addCustom}><Icon name="bag"/> {draft.editIndex === null ? 'Add to cart' : 'Save'}</button>
    </div>}
  </>;
}
