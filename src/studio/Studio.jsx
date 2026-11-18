import {Suspense,lazy,useEffect,useRef,useSyncExternalStore} from 'react';
import {download} from '../lib/dom.js';
import {clamp} from '../lib/format.js';
import {ErrorBoundary} from '../components/ErrorBoundary.jsx';
import {useStore} from '../store/useStore.js';
import {layoutFor,patchLayout,productConfig,variantFor} from './design.js';
import {composite,faceOf,paint,proofFor,resetRuntime,runtime,subscribe,webglAvailable} from './runtime.js';
import {studioBridge} from './bridge.js';
import {camera,useStudio} from './state.js';

const Viewport = lazy(() => import('./Scene.jsx'));
export const preloadModel = id => import('./Scene.jsx').then(m => m.preloadGlb(id)).catch(() => {});

/** Repaints the flat print layers whenever the design changes (coalesced to one paint per frame). */
function useStudioPainter(draft) {
  useEffect(() => {
    let cancelled = false;
    const raf = requestAnimationFrame(async () => {
      const messages = await paint(draft);
      if (!cancelled && messages) useStudio.getState().set({warning:[...new Set(messages)].join(' ')});
    });
    return () => { cancelled = true; cancelAnimationFrame(raf); };
  },[draft.id,draft.art,draft.text,draft.back,draft.studioLayout,draft.variant,draft.sides,draft.color]); // eslint-disable-line react-hooks/exhaustive-deps
}

function LoadingVeil() {
  return <div className="studio-veil" aria-hidden="true"><span className="spinner"/></div>;
}

/** 2D print-layout editor: drag the selected layer, or use arrow keys. */
function LayoutCanvas({draft}) {
  const ref = useRef(null), drag = useRef(null);
  const version = useSyncExternalStore(subscribe,() => runtime.version);
  const side = faceOf(draft), layer = useStudio(s => s.layer);
  const {commitDesign,undo,redo} = useStore.getState();

  useEffect(() => {
    const canvas = ref.current, base = composite(side,draft,1024);
    if (!canvas || !base) return;
    canvas.width = base.width; canvas.height = base.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(base,0,0);
    ctx.strokeStyle = '#7952cc'; ctx.lineWidth = 3; ctx.setLineDash([10,8]);
    ctx.strokeRect(20,20,canvas.width - 40,canvas.height - 40);
  },[version,draft.color,side]); // eslint-disable-line react-hooks/exhaustive-deps

  const move = (x,y,key) => {
    const d = useStore.getState().draft;
    commitDesign(patchLayout(d,side,layer,{x:clamp(x,0,1),y:clamp(y,0,1)}),key);
  };
  const current = () => layoutFor(useStore.getState().draft)[side][layer];
  return <canvas ref={ref} width={900} height={660} tabIndex={0} style={{touchAction:'none'}}
    aria-label="Print layout. Select a layer below; drag it or use position sliders."
    onPointerDown={e => { drag.current = {x:e.clientX,y:e.clientY,start:{...current()}}; e.currentTarget.setPointerCapture(e.pointerId); }}
    onPointerMove={e => {
      if (!drag.current) return;
      const rect = e.currentTarget.getBoundingClientRect(), s = drag.current.start;
      move(s.x + (e.clientX - drag.current.x) / rect.width,s.y + (e.clientY - drag.current.y) / rect.height,'drag');
    }}
    onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}
    onKeyDown={e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
      if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) return;
      e.preventDefault();
      const t = current();
      move(t.x + (e.key === 'ArrowRight' ? .01 : e.key === 'ArrowLeft' ? -.01 : 0),t.y + (e.key === 'ArrowDown' ? .01 : e.key === 'ArrowUp' ? -.01 : 0),'nudge');
    }}/>;
}

const CAMERA_BUTTONS = ['Front','Back','Side','Rotate left','Rotate right','Zoom in','Zoom out','Reset view'];
function cameraCommand(name) {
  const c = camera.current;
  if (!c) return;
  if (['Front','Back','Side'].includes(name)) c.view(name.toLowerCase());
  else if (name === 'Reset view') c.view('front');
  else if (name.startsWith('Rotate')) c.rotate(name.endsWith('left') ? -.3 : .3);
  else c.zoom(name.endsWith('in') ? .9 : 1.1);
}

function useStudioLifecycle(draftId) {
  useEffect(() => {
    useStudio.getState().reset();
    resetRuntime();
    studioBridge.proof = face => proofFor(face,useStore.getState().draft);
    if (!webglAvailable()) useStudio.getState().set({failed:true,mode:'2d',status:'3D is unavailable. Continue editing in the 2D layout, or retry.'});
    return () => { studioBridge.proof = null; camera.current = null; };
  },[draftId]);
}

export function StudioStage({item}) {
  const draft = useStore(s => s.draft);
  const {mode,auto,touchRotate,status,failed,retryKey} = useStudio();
  const set = useStudio.getState().set;
  useStudioLifecycle(item.id);
  useStudioPainter(draft);
  if (!draft || draft.id !== item.id) return null;
  const retry = () => { import('./Scene.jsx').then(m => m.clearGlb(draft)); set({failed:false,mode:'3d',retryKey:retryKey + 1,status:'Loading model…'}); };
  return <section className="studio" aria-label="3D customization studio">
    <div className="studio-heading"><span>PRODUCT STUDIO</span><span className="studio-badge">Live preview</span></div>
    <div className="studio-modes">
      <button type="button" className="chip" aria-pressed={mode === '3d'} onClick={() => set({mode:'3d'})}>3D product</button>
      <button type="button" className="chip" aria-pressed={mode === '2d'} onClick={() => set({mode:'2d'})}>Edit print layout</button>
    </div>
    <div className={'studio-stage ' + (touchRotate ? 'touch-rotate' : '')} hidden={mode !== '3d'}>
      {!failed && <ErrorBoundary key={retryKey} fallback={null} onError={() => set({failed:true,mode:'2d',status:'Model unavailable. Your design is safe; use the 2D layout or Retry.'})}>
        <Suspense fallback={<LoadingVeil/>}><Viewport draft={draft}/></Suspense>
      </ErrorBoundary>}
    </div>
    <div className="studio-layout" hidden={mode !== '2d'}><LayoutCanvas draft={draft}/></div>
    <p className="studio-status" role="status">{status}</p>
    <div className="studio-camera" hidden={mode !== '3d'}>
      {CAMERA_BUTTONS.map(name => <button key={name} type="button" className="chip" onClick={() => cameraCommand(name)}>{name}</button>)}
      <button type="button" className="chip" aria-pressed={auto} onClick={() => set({auto:!auto})}>Auto rotate</button>
      <button type="button" className="chip" aria-pressed={touchRotate} onClick={() => set({touchRotate:!touchRotate})}>Enable touch rotation</button>
    </div>
    <p className="hint">Drag to rotate, pinch or scroll to zoom. Print placement is approximate; check the 2D layout for position limits.</p>
    {failed && <button type="button" className="text-button" onClick={retry}>Retry model</button>}
  </section>;
}

const FONTS = [['sans-serif','Sans serif'],['serif','Serif'],['monospace','Monospace'],['cursive','Cursive']];

export function StudioTools({item}) {
  const draft = useStore(s => s.draft), history = useStore(s => s.history);
  const {layer,warning} = useStudio(), set = useStudio.getState().set;
  const {commitDesign,setFace,undo,redo,resetDesign} = useStore.getState();
  if (!draft || draft.id !== item.id) return null;
  const side = faceOf(draft), layout = layoutFor(draft), l = layout[side], t = l[layer];
  const edit = (patchObj,key) => commitDesign(patchLayout(draft,side,layer,patchObj),key);
  const editText = (patchObj,key) => commitDesign(patchLayout(draft,side,'text',patchObj),key);
  const range = (label,min,max,step,value,onChange) => <label className="field">{label}<input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(+e.target.value)}/></label>;
  const op = name => {
    const face = patchObj => commitDesign(side === 'back' ? {back:{...draft.back,...patchObj}} : patchObj,'op');
    if (name === 'Center layer') edit({x:.5,y:.5},'op');
    if (name === 'Delete layer') layer === 'image' ? face({art:'',filename:''}) : face({text:''});
  };
  const exportPng = () => runtime.canvases[side].toBlob(blob => blob && download(blob,`grooso-${draft.id}-${side}-REVIEW.png`));
  const exportJson = () => {
    const pack = {schema:'grooso-design-v1',productionReady:false,reason:'Supplier-approved print template and output profile required',createdAt:new Date().toISOString(),
      product:{id:draft.id,variant:draft.variant,color:draft.color,quality:draft.quality,specs:draft.specs,qty:draft.qty,notes:draft.notes,sides:draft.sides},
      layout,artwork:{front:{text:draft.text,original:draft.art,filename:draft.filename},back:draft.back},illustrativeConfig:productConfig[draft.id],variant:variantFor(draft)};
    download(new Blob([JSON.stringify(pack,null,2)],{type:'application/json'}),`grooso-${draft.id}-design.json`);
  };
  return <section className="studio-tools control" onKeyDown={e => {
    if (!(e.ctrlKey || e.metaKey) || e.target.tagName === 'INPUT' && e.target.type === 'text') return;
    const k = e.key.toLowerCase();
    if (k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); } else if (k === 'y') { e.preventDefault(); redo(); }
  }}>
    <h2>Fine-tune your design</h2>
    <p className="hint">One artwork layer and one text layer per side. Changes are saved with your cart design.</p>
    <div className="studio-fields">
      <label className="field">Print view<select value={side} onChange={e => { setFace(e.target.value); camera.current?.view(e.target.value); }}>
        <option value="front">Front</option>{draft.id === 'tee' && <option value="back" disabled={draft.sides !== 2}>Back (two-sided print)</option>}</select></label>
      {draft.id === 'mug' && <label className="field">Print coverage<select value={layout.mode} onChange={e => commitDesign({studioLayout:{...layout,mode:e.target.value}},'mode')}>
        <option value="front">Front area</option><option value="wrap">Wraparound (demo area)</option></select></label>}
      <label className="field">Selected layer<select value={layer} onChange={e => set({layer:e.target.value})}><option value="image">Artwork</option><option value="text">Text</option></select></label>
      {range('Horizontal position',0,1,.01,t.x,v => edit({x:v},'x'))}
      {range('Vertical position',0,1,.01,t.y,v => edit({y:v},'y'))}
      {range('Artwork width',.05,.95,.01,l.image.width,v => commitDesign(patchLayout(draft,side,'image',{width:v}),'width'))}
      {range('Layer rotation',-180,180,1,t.rotation,v => edit({rotation:v},'rotation'))}
      <label className="field">Text font<select value={l.text.font} onChange={e => editText({font:e.target.value},'font')}>{FONTS.map(([v,n]) => <option key={v} value={v}>{n}</option>)}</select></label>
      {range('Text size',.03,.3,.01,l.text.size,v => editText({size:v},'size'))}
      <label className="field">Text colour<input type="color" value={l.text.color} onChange={e => editText({color:e.target.value},'color')}/></label>
    </div>
    <div className="studio-actions">
      <button type="button" className="chip" onClick={() => op('Center layer')}>Center layer</button>
      <button type="button" className="chip" onClick={() => op('Delete layer')}>Delete layer</button>
      <button type="button" className="chip" onClick={resetDesign}>Reset design</button>
      <button type="button" className="chip" disabled={!history.past.length} onClick={undo}>Undo</button>
      <button type="button" className="chip" disabled={!history.future.length} onClick={redo}>Redo</button>
    </div>
    <p className="studio-warning" role="status">{warning}</p>
    <div className="studio-actions"><button type="button" className="button secondary" onClick={exportPng}>Export review PNG</button><button type="button" className="button secondary" onClick={exportJson}>Export design package</button></div>
    <p className="hint">Exports are for checking placement before you order.</p>
  </section>;
}

/** Simple 3D preview for procedural products (tote, cap). */
export function Preview3D({item}) {
  const draft = useStore(s => s.draft), touch = useStudio(s => s.touchRotate);
  useStudioLifecycle(item.id);
  useStudioPainter(draft);
  if (!draft || draft.id !== item.id) return null;
  const buttons = [['Rotate left',() => camera.current?.rotate(-.3)],['Rotate right',() => camera.current?.rotate(.3)],['Zoom in',() => camera.current?.zoom(.9)],['Zoom out',() => camera.current?.zoom(1.1)]];
  return <>
    <div className={'three-view ' + (touch ? 'touch-rotate' : '')} style={{height:360}}>
      <ErrorBoundary fallback={<p className="hint" style={{padding:16}}>3D preview unavailable on this device.</p>}><Suspense fallback={<LoadingVeil/>}><Viewport draft={draft}/></Suspense></ErrorBoundary>
    </div>
    <p className="hint">3D model · Drag to rotate, pinch to zoom. Use the 2D proof for exact print placement.</p>
    <button type="button" className="button secondary" onClick={() => camera.current?.reset()}>Reset view</button>
    <div className="viewer-controls">{buttons.map(([label,fn]) => <button key={label} type="button" className="chip" onClick={fn}>{label}</button>)}</div>
  </>;
}
