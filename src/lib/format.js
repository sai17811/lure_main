const rupees = new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0});
export const money = value => rupees.format(value);
export const pieces = value => Number(value).toLocaleString('en-IN');
export const clamp = (v,lo,hi) => Math.min(hi,Math.max(lo,v));
