import {STUDIO_IDS} from '../data/catalog.js';

let chunk;
/** Warm the lazy 3D chunk (and the product model) when a shopper shows intent, so the editor opens instantly. */
export function preloadStudioFor(id) {
  if (typeof window === 'undefined' || navigator.connection?.saveData) return;
  if (!['mug','tee','tote','cap'].includes(id)) return;
  chunk ||= import('./Studio.jsx').catch(() => { chunk = null; });
  chunk.then(mod => mod?.preloadModel?.(id));
}
export {STUDIO_IDS};
