// Print configuration, layout maths and canvas painting for the studio. Geometry values are illustrative
// until supplier-approved templates are available (productConfig.*.verified === false).
const BASE = import.meta.env.BASE_URL || '/';
export const productConfig = {
  mug:{label:'Ceramic mug',type:'ceramic',verified:false,variants:{
    '325 ml':{url:`${BASE}models/ceramic_mug_325ml.glb`,dimensionsMM:[81,96],printMM:[90,66]},
    '450 ml':{url:`${BASE}models/ceramic_mug_450ml.glb`,dimensionsMM:[86,112],printMM:[98,78]}},
    zones:{front:{uv:[.56,.12,.94,.87]},wrap:{uv:[.06,.12,.94,.87]}}},
  tee:{label:'Cotton tee',type:'fabric',verified:false,variants:{default:{url:`${BASE}models/tshirt.glb`,dimensionsMM:null,printMM:null}},zones:{front:{uv:[.20,.20,.80,.80]},back:{uv:[.20,.20,.80,.80]}}}
};

/** Runtime guard: warn if a supplier template is used before verification. Call this before rendering any 3D product. */
export function assertVerified(id) {
  const cfg = productConfig[id];
  if (cfg && cfg.verified === false && import.meta.env.PROD) {
    console.warn(`[Grooso] Product config "${id}" is unverified (supplier template not approved). Print geometry is illustrative.`);
  }
}

export const variantFor = d => {const p = productConfig[d.id]; return p?.variants[d.variant] || p?.variants.default;};

const layer = () => ({x:.5,y:.40,width:.65,rotation:0});
const textLayer = () => ({x:.5,y:.78,size:.10,rotation:0,font:'sans-serif',color:'#4522ad'});
export const defaultLayout = () => ({version:1,mode:'front',front:{image:layer(),text:textLayer()},back:{image:layer(),text:textLayer()}});

/** Pure accessor: the stored layout merged over defaults (older saves may be partial). */
export function layoutFor(d) {
  const base = defaultLayout(), saved = d.studioLayout;
  if (!saved) return base;
  const side = key => ({image:{...base[key].image,...saved[key]?.image},text:{...base[key].text,...saved[key]?.text}});
  return {version:1,mode:saved.mode || 'front',front:side('front'),back:side('back')};
}

/** Return a new draft patch with `patch` applied to one layer ('image' | 'text') of one side. */
export function patchLayout(d,side,layerKey,patch) {
  const layout = layoutFor(d);
  return {studioLayout:{...layout,[side]:{...layout[side],[layerKey]:{...layout[side][layerKey],...patch}}}};
}

/** Constrain a rotated w×h layer (normalised units) inside the print area with a 2% margin. */
export function containTransform(t,w,h) {
  const r = t.rotation * Math.PI / 180;
  const ex = (Math.abs(Math.cos(r)) * w + Math.abs(Math.sin(r)) * h) / 2, ey = (Math.abs(Math.sin(r)) * w + Math.abs(Math.cos(r)) * h) / 2;
  const scale = Math.min(1,.96 / (2 * ex || 1),.96 / (2 * ey || 1));
  w *= scale; h *= scale;
  const bx = ex * scale, by = ey * scale;
  return {
    x:Math.max(bx + .02,Math.min(1 - bx - .02,t.x)),
    y:Math.max(by + .02,Math.min(1 - by - .02,t.y)),
    w,h,rotation:t.rotation,
    constrained:scale < 1 || t.x < bx + .02 || t.x > 1 - bx - .02 || t.y < by + .02 || t.y > 1 - by - .02
  };
}

export function paintDesign(canvas,d,side,image,{guides = false,base = 'transparent'} = {}) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return {constrained:false};
  const W = canvas.width, H = canvas.height, layout = layoutFor(d)[side], design = side === 'back' ? d.back : d;
  ctx.clearRect(0,0,W,H);
  if (base !== 'transparent') { ctx.fillStyle = base; ctx.fillRect(0,0,W,H); }
  let constrained = false;
  if (image && design.art) {
    const w = layout.image.width, h = w * W / H * image.height / image.width;
    const b = containTransform(layout.image,w,h);
    constrained ||= b.constrained;
    ctx.save(); ctx.translate(b.x * W,b.y * H); ctx.rotate(b.rotation * Math.PI / 180);
    ctx.drawImage(image,-b.w * W / 2,-b.h * H / 2,b.w * W,b.h * H); ctx.restore();
  }
  if (design.text) {
    const t = layout.text;
    ctx.font = `600 ${t.size * H}px ${t.font}`;
    const w = ctx.measureText(design.text).width / W, h = t.size * 1.4, b = containTransform(t,w,h);
    constrained ||= b.constrained;
    ctx.save(); ctx.translate(b.x * W,b.y * H); ctx.rotate(b.rotation * Math.PI / 180);
    ctx.scale(w ? b.w / w : 1,h ? b.h / h : 1);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = t.color; ctx.fillText(design.text,0,0); ctx.restore();
  }
  if (guides) {
    ctx.save(); ctx.strokeStyle = '#7652d4'; ctx.lineWidth = 2; ctx.setLineDash([8,6]);
    ctx.strokeRect(W * .02,H * .02,W * .96,H * .96); ctx.restore();
  }
  return {constrained};
}

/** Aspect ratio (width/height) of the flat print canvas for a draft. */
export function printRatio(d) {
  const v = variantFor(d);
  if (d.id === 'mug') return layoutFor(d).mode === 'wrap' ? (v.dimensionsMM[0] * Math.PI * .88) / v.printMM[1] : v.printMM[0] / v.printMM[1];
  if (d.id === 'tee') return .42 / .68;
  if (d.id === 'cap') return 2.1;
  return 1;
}
