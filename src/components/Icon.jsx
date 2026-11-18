import {icons} from '../data/catalog.js';

/** Inline stroke icon. Paths are static strings from the catalogue, never user input. */
export function Icon({name}) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{__html:icons[name]}} />;
}
