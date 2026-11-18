// Product catalogue, option tiers, delivery and brand data. Ported 1:1 from the original core.js.
import placeholders from './placeholders.json';

// Option arrays contain a display label, a per-piece surcharge, and optional detail.
export const printProducts = [
  {id:'brochure',name:'Folded Brochures',price:18,min:25,max:10000,tile:'#eee5ff',accent:'#6638da',shape:'fold',badge:'Bulk printing',desc:'Folded leaflets for menus, real estate, and product launches. Pick a flat sheet size before folding.',
    optionName:'Flat size',options:['A5 · 148 × 210 mm','A4 · 210 × 297 mm','A3 · 297 × 420 mm'],surcharge:{'A4 · 210 × 297 mm':4,'A3 · 297 × 420 mm':12},
    quality:[['Standard · 130 GSM coated',0,'Lightweight handouts'],['Plus · 170 GSM coated',3,'A sturdier everyday brochure'],['Premium · 250 GSM card',8,'A substantial folded piece']],
    specs:{Fold:[['Bi-fold',0],['Tri-fold',2],['Z-fold',2]],Finish:[['Unlaminated',0],['Matte laminate',3],['Gloss laminate',3]]},sides:true,defaultSides:2},
  {id:'id-card',name:'Custom ID Cards',price:45,min:1,max:5000,tile:'#dff2f1',accent:'#137f78',shape:'id',badge:'Variable names',desc:'Staff, student, and event badges. Use one design or attach a roster to personalise each card.',
    optionName:'Orientation',options:['Portrait · 54 × 86 mm','Landscape · 86 × 54 mm'],surcharge:{},
    quality:[['Standard · 0.76 mm PVC',0,'Rigid everyday card'],['Premium · composite PVC',14,'A reinforced card for frequent use']],
    specs:{Finish:[['Matte',0],['Gloss',0]],Attachment:[['Card only',0],['Slot punch',3],['Lanyard and holder',24]]},sides:true,roster:true},
  {id:'face-cutout',name:'Face Cutouts',price:79,min:5,max:5000,tile:'#ffe9d9',accent:'#cd5d32',shape:'face',badge:'Party favourite',desc:'Handheld face signs for parties and events. Add a clear head-on image and choose how to cut it.',
    optionName:'Longest edge',options:['20 cm','30 cm','45 cm'],surcharge:{'30 cm':25,'45 cm':69},
    quality:[['Standard · 350 GSM card',0,'Lightweight for handheld use'],['Plus · 3 mm foam board',25,'Rigid and easy to hold'],['Premium · 5 mm foam board',50,'Thicker for display']],
    specs:{Cut:[['Face contour',0],['Circle',0],['Rectangle',0]],Backing:[['Handheld stick',0],['No handle',0],['Display stand',19]]},imageOnly:true},
  {id:'business-card',name:'Business Cards',price:6,min:50,max:10000,tile:'#e9e5fb',accent:'#5f43a6',shape:'card',badge:'From 50 pieces',desc:'Cards for introductions, shops, and appointments. Choose your stock, finish, and corners.',
    optionName:'Size',options:['90 × 50 mm','85 × 55 mm','55 × 55 mm'],surcharge:{'55 × 55 mm':1},
    quality:[['Standard · 300 GSM card',0,'Everyday networking'],['Plus · 350 GSM card',2,'A firmer feel'],['Premium · 400 GSM card',4,'A thicker statement card']],
    specs:{Finish:[['Uncoated',0],['Matte laminate',2],['Soft-touch laminate',4]],Corners:[['Square',0],['Rounded',1]]},sides:true},
  {id:'flyer',name:'Flyers & Leaflets',price:8,min:25,max:10000,tile:'#fbe4ef',accent:'#af3a73',shape:'flyer',badge:'From 25 pieces',desc:'Single-sheet prints for promotions, inserts, and events.',
    optionName:'Size',options:['A6 · 105 × 148 mm','A5 · 148 × 210 mm','A4 · 210 × 297 mm'],surcharge:{'A5 · 148 × 210 mm':2,'A4 · 210 × 297 mm':5},
    quality:[['Standard · 100 GSM paper',0,'Lightweight distribution'],['Plus · 150 GSM coated',2,'A stronger everyday sheet'],['Premium · 250 GSM card',5,'Thick stock for handouts']],
    specs:{Finish:[['Matte',0],['Gloss',1]]},sides:true},
  {id:'sticker',name:'Custom Stickers',price:9,min:25,max:10000,tile:'#f9ebbc',accent:'#876016',shape:'sticker',badge:'Custom shapes',desc:'Individual peel-and-stick labels for packaging, giveaways, and merchandise.',
    optionName:'Longest edge',options:['3 cm','5 cm','8 cm'],surcharge:{'5 cm':3,'8 cm':7},
    quality:[['Standard · paper',0,'For dry indoor surfaces'],['Plus · white vinyl',4,'A more durable label'],['Premium · clear vinyl',6,'A transparent background']],
    specs:{Cut:[['Circle',0],['Rounded square',0],['Custom contour',2]],Finish:[['Matte',0],['Gloss',1]]}},
  {id:'poster',name:'Posters',price:59,min:1,max:5000,tile:'#dfeafc',accent:'#325aa2',shape:'flyer',badge:'Display prints',desc:'Wall prints for announcements, retail, and events.',
    optionName:'Size',options:['A3 · 297 × 420 mm','A2 · 420 × 594 mm','A1 · 594 × 841 mm'],surcharge:{'A2 · 420 × 594 mm':50,'A1 · 594 × 841 mm':120},
    quality:[['Standard · 170 GSM paper',0,'Indoor displays'],['Plus · 250 GSM coated',20,'Heavier display stock'],['Premium · synthetic sheet',45,'A tear-resistant option']],
    specs:{Finish:[['Matte',0],['Gloss',10]]}},
  {id:'banner',name:'Event Banners',price:299,min:1,max:1000,tile:'#e0f1df',accent:'#376e38',shape:'banner',badge:'Large format',desc:'Rollable signage for stalls, events, and shopfronts.',
    optionName:'Size',options:['2 × 3 ft','3 × 5 ft','4 × 6 ft'],surcharge:{'3 × 5 ft':220,'4 × 6 ft':450},
    quality:[['Standard · 280 GSM flex',0,'Lightweight display'],['Plus · 340 GSM flex',80,'A heavier banner'],['Premium · 440 GSM blockout',160,'Opaque display material']],
    specs:{Mounting:[['Hemmed edges',0],['Eyelets',30],['Pole pockets',55]]}}
].map(item => ({...item,kind:'create',category:'Printables',colors:['White'],surcharge:item.surcharge||{}}));

const merchandiseSpecs = {
  tee:{quality:[['Standard · 180 GSM cotton',0,'Soft everyday jersey'],['Premium · 220 GSM cotton',89,'Heavier cotton with more structure']],specs:{Method:[['Direct-to-garment print',0],['DTF transfer',30]]},mixed:true},
  tote:{quality:[['Standard · 240 GSM canvas',0,'Everyday carry'],['Premium · 320 GSM canvas',65,'Heavier canvas']],specs:{Method:[['Single-side transfer',0],['Screen print',35]]}},
  mug:{quality:[['Standard · glazed ceramic',0,'Everyday glossy finish'],['Premium · colour-change ceramic',95,'Heat-reactive finish']],specs:{Packaging:[['Protective sleeve',0],['Gift box',39]]}},
  cap:{quality:[['Standard · cotton twill',0,'Soft six-panel build'],['Premium · structured twill',85,'A firmer front panel']],specs:{Method:[['Heat transfer',0],['Embroidered patch',90]]}}
};

export const printTiers = [[50,5],[100,10],[250,15],[500,20],[1000,25],[2500,30]];
export const merchTiers = [[5,5],[10,10],[20,15],[50,20],[100,25],[250,30],[500,35]];

export const deliveryAreas = ['Danavaipeta, Rajahmundry','T. Nagar, Rajahmundry','Morampudi, Rajahmundry'];
export const DELIVERY_FEE = 69;
export const DELIVERY_ETA = '5–7 business days';
export const DOUBLE_SIDE_SURCHARGE = 4;
export const DEMO_PAYMENTS = ['Cash on delivery (demo)','Simulated online payment'];

export const colors = {
  Ivory:'#faf1dd', Lilac:'#bca5eb', Charcoal:'#3b3747', Natural:'#e6cda5', White:'#fbf9f5',
  Blush:'#ecb7cc', Navy:'#323851', Sage:'#a8bda1'
};

const base = import.meta.env.BASE_URL || '/';
const asset = name => `${base}assets/${name}`;
/** Responsive image sources: jpg fallback, webp (+ small webp) and a 20px blur-up placeholder. */
export const IMG = {
  hero:{jpg:asset('image-1.jpg'),webp:asset('image-1.webp'),sm:asset('image-1-sm.webp'),width:1196,height:593,ph:placeholders['image-1']},
  'hero-mobile':{jpg:asset('image-2.jpg'),webp:asset('image-2.webp'),sm:asset('image-2-sm.webp'),width:950,height:593,ph:placeholders['image-2']},
  tee:{jpg:asset('image-3.jpg'),webp:asset('image-3.webp'),width:383,height:430,ph:placeholders['image-3']},
  tote:{jpg:asset('image-4.jpg'),webp:asset('image-4.webp'),width:384,height:430,ph:placeholders['image-4']},
  mug:{jpg:asset('image-5.jpg'),webp:asset('image-5.webp'),width:384,height:430,ph:placeholders['image-5']},
  cap:{jpg:asset('image-6.jpg'),webp:asset('image-6.webp'),width:384,height:430,ph:placeholders['image-6']}
};

export const destinations = {
  create:{name:'Grooso Create',icon:'sparkle',service:'Print & personalise',eta:DELIVERY_ETA,fee:DELIVERY_FEE,search:'Search custom products…'}
};
export const appTabs = {
  home:{name:'Home',icon:'home'},
  categories:{name:'Categories',icon:'categories'},
  cart:{name:'Cart',icon:'bag'},
  orders:{name:'Orders',icon:'receipt'},
  profile:{name:'Profile',icon:'person'}
};
export const ROUTE_KINDS = ['create','categories','cart','orders','profile'];

const merchandise = [
  {id:'tee',kind:'create',category:'Apparel',name:'Classic Cotton Tee',price:499,badge:'Personalise it',tile:'#eee5fb',options:['S','M','L','XL','XXL'],optionName:'Size',surcharge:{XXL:50},colors:['Ivory','Lilac','Charcoal'],emoji:'👕',desc:'A soft 180 GSM cotton crewneck with a relaxed unisex fit. Printed on the front.'},
  {id:'tote',kind:'create',category:'Bags',name:'Everyday Canvas Tote',price:349,badge:'Everyday essential',tile:'#f9e7ad',options:['Standard','Large'],optionName:'Size',surcharge:{Large:70},colors:['Natural','Lilac','Charcoal'],emoji:'👜',desc:'A sturdy reusable canvas tote for market runs, workdays and weekend plans.'},
  {id:'mug',kind:'create',category:'Drinkware',name:'Ceramic Coffee Mug',price:299,badge:'Great for gifts',tile:'#f9e2eb',options:['325 ml','450 ml'],optionName:'Capacity',surcharge:{'450 ml':60},colors:['White','Blush','Lilac'],emoji:'☕',desc:'A glossy ceramic mug with a generous handle and a front-facing print area.'},
  {id:'cap',kind:'create',category:'Accessories',name:'Everyday Dad Cap',price:449,badge:'New',tile:'#e9e8ee',options:['Adjustable'],optionName:'Fit',surcharge:{},colors:['Charcoal','Navy','Sage'],emoji:'🧢',desc:'A low-profile six-panel cap with an adjustable back strap and a front print.'}
].map(item => ({min:1,max:5000,...item,...merchandiseSpecs[item.id],...(item.id==='tee'?{sides:true}:{})}));

export const products = [...merchandise, ...printProducts];
export const product = id => products.find(item => item.id === id);

/** Products that get the interactive 3D studio (UV-mapped GLB models + layout tools). */
export const STUDIO_IDS = ['mug','tee'];
/** Products that get the simple 3D preview toggle (procedural models). */
export const PREVIEW3D_IDS = ['tote','cap'];

export function newDraft(item) {
  return {
    id:item.id, variant:item.options[0], color:item.colors[0], quality:0,
    specs:Object.fromEntries(Object.keys(item.specs).map(label => [label,0])),
    sides:item.defaultSides||1, face:'front', text:'', art:'', filename:'', pdf:null, pdfBoth:false,
    back:{text:'',art:'',filename:'',pdf:null}, notes:'', roster:null, sizes:null,
    qty:item.min, editIndex:null
  };
}

export const icons = {
  bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12a2 2 0 0 0 4 0"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="m10 2-.5 3a8 8 0 0 0-1.5.7L5 4.5l-2 3.4 2.3 2a8 8 0 0 0 0 2.2L3 14l2 3.4 3-1.1a8 8 0 0 0 1.5.7l.5 3h4l.5-3a8 8 0 0 0 1.5-.7l3 1.1 2-3.4-2.3-1.9a8 8 0 0 0 0-2.2l2.3-2-2-3.4-3 1.2a8 8 0 0 0-1.5-.7L14 2z"/>',
  help:'<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 4.4 2.65c-.9.5-1.4 1.1-1.4 2.35m0 2.5v.1"/>',
  logout:'<path d="M11 4H4v16h7m-2-8h12m-4-4 4 4-4 4"/>',
  categories:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  receipt:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6m-6 4h6m-6 4h3"/>',
  person:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v2"/>',
  home:'<path d="m3 10 9-7 9 7v10h-6v-6H9v6H3V10Z"/>',
  brand:'<path d="M16 9a5 5 0 1 0 1 5v4a5 5 0 0 1-8 4" stroke-width="2.5"/><path d="M16 9v5m1-9 2-2m-1 5 3-1"/>',
  pin:'<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.6"/>',
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
  bag:'<path d="M5 8h14l1 13H4L5 8Z"/><path d="M9 10V6a3 3 0 0 1 6 0v4"/>',
  chevron:'<path d="m6 9 6 6 6-6"/>',
  shop:'<path d="m3 8 3-4h12l3 4v3a3 3 0 0 1-4 2.8 3 3 0 0 1-5-.8 3 3 0 0 1-5 .8A3 3 0 0 1 3 11V8Zm2 6v6h14v-6M3 8h18"/>',
  bolt:'<path d="m13 2-8 12h6l-1 8 9-12h-6l1-8Z"/>',
  basket:'<path d="M3 10h18l-2 10H5L3 10Zm4 0 4-7m6 7-4-7M9 14v2m6-2v2"/>',
  sparkle:'<path d="M12 2c.8 6 3.7 9 10 10-6.3 1-9.2 4-10 10-.8-6-3.7-9-10-10 6.3-1 9.2-4 10-10ZM19 3v4m-2-2h4"/>',
  arrow:'<path d="M4 12h15m-6-6 6 6-6 6"/>',
  back:'<path d="M20 12H5m6 6-6-6 6-6"/>',
  box:'<path d="m3 7 9-4 9 4v10l-9 4-9-4V7Zm0 0 9 4 9-4m-9 4v10M8 5l9 4"/>',
  eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  truck:'<path d="M3 5h12v12H3zm12 4h4l3 4v4h-7"/><circle cx="7" cy="18" r="2" fill="white"/><circle cx="18" cy="18" r="2" fill="white"/>',
  upload:'<path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  check:'<path d="m5 12 4 4L19 6"/>'
};
