/** Focus an element once React has committed the current update. */
export function focusSoon(selector,options = {preventScroll:true}) {
  requestAnimationFrame(() => document.querySelector(selector)?.focus(options));
}
/** Move focus to the new page heading so keyboard and screen-reader users know the route changed. */
export function focusPage() {
  requestAnimationFrame(() => {
    const main = document.querySelector('#main');
    if (!main) return;
    const target = main.querySelector('h1') || main;
    target.tabIndex = -1;
    target.focus({preventScroll:true});
  });
}
export const prefersReducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
export function scrollToCatalog() {
  const catalog = document.querySelector('#catalog');
  if (!catalog) return;
  catalog.focus({preventScroll:true});
  catalog.scrollIntoView({behavior:prefersReducedMotion() ? 'auto' : 'smooth'});
}
export function download(blob,name) {
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url),1000);
}
