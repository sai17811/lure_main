import {DOUBLE_SIDE_SURCHARGE,DELIVERY_FEE,merchTiers,printTiers,product} from '../data/catalog.js';

export const tiersFor = item => (item.shape ? printTiers : merchTiers).filter(([qty]) => qty <= item.max);

/** Unit price, bulk-discount tier (%) and total for a draft or cart line. */
export function quote(item,draft) {
  const extras = item.quality[draft.quality][1]
    + Object.entries(draft.specs).reduce((sum,[label,index]) => sum + item.specs[label][index][1],0)
    + (draft.sides === 2 ? DOUBLE_SIDE_SURCHARGE : 0);
  const tier = tiersFor(item).reduce((rate,[minimum,discount]) => draft.qty >= minimum ? discount : rate,0);
  const unitFor = variant => Math.round((item.price + extras + (item.surcharge[variant] || 0)) * (100 - tier) / 100);
  const total = draft.sizes
    ? Object.entries(draft.sizes).reduce((sum,[size,qty]) => sum + qty * unitFor(size),0)
    : unitFor(draft.variant) * draft.qty;
  const unit = draft.sizes ? total / draft.qty : unitFor(draft.variant);
  return {unit,tier,total};
}

export const validQty = (item,draft) =>
  Number.isInteger(draft.qty) && draft.qty >= item.min && draft.qty <= item.max &&
  (!draft.sizes || Object.values(draft.sizes).every(qty => Number.isInteger(qty) && qty >= 0));

export const lineTotal = line => quote(product(line.id),line).total;

export const FREE_DELIVERY_FROM = 999;

export function cartTotals(cart) {
  const subtotal = cart.reduce((sum,line) => sum + lineTotal(line),0);
  const delivery = cart.length ? (subtotal >= FREE_DELIVERY_FROM ? 0 : DELIVERY_FEE) : 0;
  return {subtotal,delivery,remaining:Math.max(0,FREE_DELIVERY_FROM - subtotal),discount:0,total:subtotal + delivery};
}

export const cartCount = cart => cart.reduce((total,line) => total + line.qty,0);

export function lineSpecs(item,line) {
  const variants = line.sizes
    ? Object.entries(line.sizes).filter(([,qty]) => qty).map(([size,qty]) => `${size} × ${qty.toLocaleString('en-IN')}`).join(', ')
    : line.variant;
  return [
    variants,
    item.colors.length > 1 ? line.color : '',
    item.quality[line.quality][0],
    ...Object.entries(line.specs).map(([label,index]) => item.specs[label][index][0]),
    line.sides === 2 ? 'Front and back' : 'Front only'
  ].filter(Boolean).join(' · ');
}

/** The design (text/art/file) shown for the draft's current face. */
export const faceDesign = draft => draft.face === 'back' ? draft.back : draft;

export const hasFront = d => Boolean(d.text.trim() || d.art || d.pdf || d.roster);
export const hasBack = d => Boolean(d.back.text.trim() || d.back.art || d.back.pdf || (d.pdfBoth && d.pdf));
