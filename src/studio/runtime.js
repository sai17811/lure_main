import {colors} from '../data/catalog.js';
import {layoutFor,paintDesign,patchLayout,printRatio,productConfig,variantFor} from './design.js';

/**
 * Offscreen painter shared by the 2D layout editor, the 3D textures and the proof thumbnails.
 * `canvases.front/back` hold the flat print layer (transparent background) for each side.
 */
const make = () => typeof document === 'undefined' ? null : document.createElement('canvas');
export const runtime = {
  canvases:{front:make(),back:make()},
  images:{front:null,back:null},
  sources:{front:'',back:''},
  version:0,
  ticket:0
};
const listeners = new Set();
export const subscribe = fn => { listeners.add(fn); return () => listeners.delete(fn); };

const DARK = ['Charcoal','Navy'];
/** Simple 3D previews (tote, cap) have no layout tools, so pick a legible default ink for dark fabrics. */
function effectiveDraft(draft) {
  if (['mug','tee'].includes(draft.id)) return draft;
  let d = draft;
  // The cap's front panel is a wide, short strip: use a compact logo-over-text arrangement.
  if (d.id === 'cap') {
    d = {...d,...patchLayout(d,'front','image',{width:.3,y:.4})};
    d = {...d,...patchLayout(d,'front','text',{y:.82,size:.2})};
  }
  if (DARK.includes(d.color)) d = {...d,...patchLayout(d,'front','text',{color:'#f9ecff'})};
  return d;
}

/** Repaint both print layers for `draft`. Resolves to warning messages, or null if superseded. */
export async function paint(draft) {
  const ticket = ++runtime.ticket;
  const messages = [];
  for (const side of ['front','back']) {
    const design = side === 'front' ? draft : draft.back;
    const src = design?.art || '';
    if (src !== runtime.sources[side] || (src && !runtime.images[side])) {
      runtime.sources[side] = src;
      runtime.images[side] = null;
      if (src) {
        const img = new Image();
        img.src = src;
        try { await img.decode(); if (ticket !== runtime.ticket) return null; runtime.images[side] = img; }
        catch { messages.push('Artwork could not be decoded. Remove it and upload another image.'); }
      }
    }
  }
  if (ticket !== runtime.ticket) return null;
  const d = effectiveDraft(draft), ratio = printRatio(d), v = variantFor(d), wrap = layoutFor(d).mode === 'wrap';
  for (const side of ['front','back']) {
    const canvas = runtime.canvases[side];
    if (!canvas) continue;
    canvas.width = 1024; canvas.height = Math.round(1024 / ratio);
    const result = paintDesign(canvas,d,side,runtime.images[side]);
    if (result.constrained) messages.push(`${side}: artwork constrained to the safe area.`);
    const img = runtime.images[side];
    if (img && d.id === 'mug' && !runtime.sources[side].startsWith('data:image/svg+xml')) {
      const widthMM = wrap ? v.dimensionsMM[0] * Math.PI * .88 : v.printMM[0];
      const dpi = img.width / (widthMM * layoutFor(d)[side].image.width / 25.4);
      if (dpi < 150) messages.push(`${side}: artwork is about ${Math.round(dpi)} DPI at print size; a higher-resolution image will print sharper.`);
    }
  }
  runtime.version++;
  listeners.forEach(fn => fn());
  return messages;
}

/** The face currently being edited (only tees have a distinct back print). */
export const faceOf = d => d.id === 'tee' && d.sides === 2 && d.face === 'back' ? 'back' : 'front';

/** Flat print layer composited over the product colour: used by the 2D editor and thumbnails. */
export function composite(side,draft,width) {
  const src = runtime.canvases[side];
  if (!src || !src.width) return null;
  const out = document.createElement('canvas');
  out.width = width; out.height = Math.round(width * src.height / src.width);
  const ctx = out.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = colors[draft.color] || '#fff';
  ctx.fillRect(0,0,out.width,out.height);
  ctx.drawImage(src,0,0,out.width,out.height);
  return out;
}

/** 480px PNG data URL of one face, used as the cart/order thumbnail. */
export function proofFor(face,draft) {
  if (!draft || !productConfig[draft.id]) return null;
  try { return composite(face === 'back' ? 'back' : 'front',draft,480)?.toDataURL('image/png') ?? null; } catch { return null; }
}

let webgl;
export function webglAvailable() {
  if (webgl !== undefined) return webgl;
  try {
    const c = document.createElement('canvas');
    webgl = Boolean(window.WebGL2RenderingContext && c.getContext('webgl2')) || Boolean(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
  } catch { webgl = false; }
  return webgl;
}

export function resetRuntime() {
  runtime.sources.front = runtime.sources.back = '';
  runtime.images.front = runtime.images.back = null;
}
