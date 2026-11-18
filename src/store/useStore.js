import {create} from 'zustand';
import {flushSync} from 'react-dom';
import {
  DEMO_PAYMENTS,DELIVERY_ETA,ROUTE_KINDS,appTabs,deliveryAreas,destinations,newDraft,product
} from '../data/catalog.js';
import {cartTotals,hasBack,hasFront,validQty} from '../lib/pricing.js';
import {mockArtwork,readArtworkFile,samplePortrait} from '../lib/artwork.js';
import {parseRoster,sampleRoster as sampleRosterData} from '../lib/csv.js';
import {focusPage,focusSoon,prefersReducedMotion,scrollToCatalog} from '../lib/dom.js';
import {loadSession,saveSession} from '../lib/storage.js';
import {defaultLayout} from '../studio/design.js';
import {studioBridge} from '../studio/bridge.js';

/* ---------- helpers ---------- */
export function parseHash(hash = location.hash) {
  const [kind,id] = hash.slice(1).split('/');
  const valid = Object.hasOwn(destinations,kind) || Object.hasOwn(appTabs,kind);
  return {kind:valid ? (kind === 'home' ? 'create' : kind) : 'create',id:kind === 'create' && product(id)?.kind === 'create' ? id : null};
}

const initialShopper = () => ({
  signedIn:true,name:'Demo shopper',email:'',payment:DEMO_PAYMENTS[0],
  addresses:[{id:1,label:'Home',line:'Flat 4B, 12 Park View Road',area:deliveryAreas[0]}],
  defaultAddress:1,nextAddress:2,editing:null,
  notifications:{orders:true,offers:false},
  tracked:null,chat:[]
});

const designSnapshot = d => ({text:d.text,art:d.art,filename:d.filename,pdf:d.pdf,back:d.back,studioLayout:d.studioLayout,sourceDimensions:d.sourceDimensions});
const sameSnapshot = (a,b) => a.text === b.text && a.art === b.art && a.filename === b.filename && a.pdf === b.pdf &&
  a.back === b.back && (a.studioLayout === b.studioLayout || JSON.stringify(a.studioLayout) === JSON.stringify(b.studioLayout));
const emptyHistory = () => ({past:[],future:[],key:'',t:0});

/** Run a state change inside a View Transition (page cross-fade) when the browser supports it. */
function transition(update) {
  if (typeof document === 'undefined' || !document.startViewTransition || prefersReducedMotion() || import.meta.env.MODE === 'test') return update();
  try { document.startViewTransition(() => { flushSync(update); }); } catch { update(); }
}

let toastTimer;
let saveTimer;
let latestUpload = 0;
let rosterRequest = 0;
let saveQueue = Promise.resolve();

/* ---------- store ---------- */
export const useStore = create((set,get) => ({
  ...(() => { const r = typeof location === 'undefined' ? {kind:'create',id:null} : parseHash(); return r; })(),
  filter:'All',query:'',location:deliveryAreas[0],
  cart:[],orders:[],customJob:null,shopper:initialShopper(),
  draft:null,history:emptyHistory(),draftSession:0,
  modal:null,receipt:null,
  toast:{message:'',visible:false,id:0},
  hydrated:false,storageError:false,

  /* ----- navigation ----- */
  go(kind,id = null,preserveDraft = false,extra = {}) {
    if (kind === 'home' || !ROUTE_KINDS.includes(kind)) kind = 'create';
    const s = get();
    const changedKind = s.kind !== kind;
    const hash = '#' + kind + (id ? '/' + id : '');
    if (location.hash !== hash) history.pushState(null,'',hash);
    transition(() => {
      const cur = get();
      let draft = cur.draft, hist = cur.history, session = cur.draftSession;
      if (id && (!preserveDraft || draft?.id !== id)) { draft = newDraft(product(id)); hist = emptyHistory(); session++; }
      if (!id) { draft = null; hist = emptyHistory(); session++; }
      set({kind,id,draft,history:hist,draftSession:session,query:'',modal:null,...(changedKind ? {filter:'All'} : {}),...extra});
      window.scrollTo(0,0);
      focusPage();
    });
  },

  setFilter(filter) { set({filter}); },
  openCategory(category) {
    get().go('create',null,false,{filter:category});
    requestAnimationFrame(() => document.querySelector('#catalog')?.scrollIntoView());
  },
  setQuery(value) {
    const s = get();
    if (!Object.hasOwn(destinations,s.kind)) { s.go('home',null,false,{query:value}); return; }
    if (s.id) {
      history.replaceState(null,'','#' + s.kind);
      set({id:null,draft:null,history:emptyHistory(),draftSession:s.draftSession + 1,query:value});
      return;
    }
    set({query:value});
  },
  browse(prints = false) {
    if (prints) set({filter:'Printables',query:''});
    requestAnimationFrame(scrollToCatalog);
  },

  /* ----- toast & modal ----- */
  notify(message,action = null) {
    clearTimeout(toastTimer);
    set(s => ({toast:{message,visible:true,id:s.toast.id + 1,action}}));
    toastTimer = setTimeout(() => set(s => ({toast:{...s.toast,visible:false,action:null}})),action ? 6500 : 2800);
  },
  runToastAction() {
    const {action} = get().toast;
    clearTimeout(toastTimer);
    set(s => ({toast:{...s.toast,visible:false,action:null}}));
    action?.run();
  },
  openModal(modal) { set({modal}); },
  closeModal() { if (get().modal) set({modal:null}); },

  /* ----- draft editing ----- */
  patchDraft(patch) { set(s => s.draft ? {draft:{...s.draft,...patch}} : s); },
  patchSpec(label,index) { set(s => ({draft:{...s.draft,specs:{...s.draft.specs,[label]:index}}})); },
  /** Patch the design (text/art/file/layout) with undo history. Same `key` within 700ms coalesces into one step. */
  commitDesign(patch,key = 'edit') {
    const {draft,history:h} = get();
    if (!draft) return;
    const next = {...draft,...patch};
    const before = designSnapshot(draft);
    if (sameSnapshot(before,designSnapshot(next))) { set({draft:next}); return; }
    const now = performance.now();
    const past = h.key === key && now - h.t < 700 ? h.past : [...h.past.slice(-29),before];
    set({draft:next,history:{past,future:[],key,t:now}});
  },
  setFace(face) { get().patchDraft({face}); },
  setText(text) { const {draft} = get(); commitFace(draft,draft.face,{text},'text'); },
  undo() {
    const {draft,history:h} = get();
    if (!h.past.length) return;
    const past = h.past.slice(), snap = past.pop();
    set({draft:{...draft,...snap},history:{past,future:[...h.future,designSnapshot(draft)],key:'',t:0}});
  },
  redo() {
    const {draft,history:h} = get();
    if (!h.future.length) return;
    const future = h.future.slice(), snap = future.pop();
    set({draft:{...draft,...snap},history:{past:[...h.past,designSnapshot(draft)],future,key:'',t:0}});
  },
  resetDesign() {
    get().commitDesign({text:'',art:'',filename:'',back:{text:'',art:'',filename:'',pdf:null},studioLayout:defaultLayout()},'reset');
  },
  setSizeMode(mixed) {
    const {draft} = get(), item = product(draft.id);
    if (Boolean(draft.sizes) === mixed) return;
    if (mixed) {
      const count = validQty(item,draft) && (draft.editIndex !== null || draft.qty > item.min) ? draft.qty : 0;
      set({draft:{...draft,sizes:Object.fromEntries(item.options.map(size => [size,size === draft.variant ? count : 0])),qty:count}});
    } else {
      const variant = item.options.find(size => draft.sizes[size] > 0) || draft.variant;
      const next = {...draft,variant,sizes:null};
      if (!validQty(item,next)) next.qty = item.min;
      set({draft:next});
    }
  },
  setSizeQty(size,qty) {
    const sizes = {...get().draft.sizes,[size]:qty};
    set(s => ({draft:{...s.draft,sizes,qty:Object.values(sizes).reduce((sum,q) => sum + q,0)}}));
  },
  useSampleArt() {
    const {draft} = get(), item = product(draft.id);
    latestUpload++;
    commitFace(draft,draft.face,{art:item.imageOnly ? samplePortrait : mockArtwork,filename:item.imageOnly ? 'Sample portrait.svg' : 'Sunday Club sunshine.svg (sample)',pdf:null,sourceDimensions:undefined},'art');
    if (draft.face === 'front') get().patchDraft({pdfBoth:false});
  },
  removeArt() {
    const {draft} = get();
    latestUpload++;
    commitFace(draft,draft.face,{art:'',filename:'',pdf:null,sourceDimensions:undefined},'art');
    if (draft.face === 'front') get().patchDraft({pdfBoth:false});
  },
  async uploadArtwork(file) {
    const {draft,draftSession} = get(), face = draft.face, seq = ++latestUpload;
    const current = () => get().draftSession === draftSession && seq === latestUpload;
    try {
      const result = await readArtworkFile(file,product(draft.id));
      if (!current()) return;
      commitFace(get().draft,face,{art:result.art,filename:result.filename,pdf:result.pdf,sourceDimensions:result.sourceDimensions},'art');
      get().patchDraft({pdfBoth:false});
    } catch (error) {
      if (current()) get().notify(error.message);
    }
  },
  async uploadRoster(file) {
    const {draft,draftSession} = get(), seq = ++rosterRequest;
    const current = () => get().draftSession === draftSession && seq === rosterRequest;
    try {
      const roster = await parseRoster(file,product(draft.id));
      if (current()) get().applyRoster(roster);
    } catch (error) {
      if (current()) get().notify(error.message);
    }
  },
  applyRoster(roster) {
    const {draft} = get(), item = product(draft.id);
    const qtyBeforeRoster = roster && !draft.roster ? (validQty(item,draft) ? draft.qty : item.min) : draft.qtyBeforeRoster;
    set({draft:{...draft,roster,qtyBeforeRoster,qty:roster ? roster.count : (qtyBeforeRoster || item.min)}});
  },
  sampleRoster() { rosterRequest++; get().applyRoster(sampleRosterData()); },
  clearRoster() { rosterRequest++; get().applyRoster(null); },
  startDemo(kind) {
    let draft;
    if (kind === 'bulk') {
      draft = {...newDraft(product('brochure')),variant:'A4 · 210 × 297 mm',quality:1,qty:250,text:'Sunday Market',art:mockArtwork,filename:'Sample cover.svg'};
      draft.specs = {...draft.specs,Fold:1};
      draft.back = {text:'Meet the makers',art:mockArtwork,filename:'Sample reverse.svg',pdf:null};
    } else draft = {...newDraft(product('tote')),text:'Sunday Club',art:mockArtwork,filename:'Sunday Club sunshine.svg (sample)'};
    set(s => ({draft,history:emptyHistory(),draftSession:s.draftSession + 1}));
    get().go('create',kind === 'bulk' ? 'brochure' : 'tote',true);
  },

  /* ----- cart ----- */
  addCustom() {
    const {draft,notify} = get(), item = product(draft.id);
    if (!validQty(item,draft)) return;
    if (!hasFront(draft)) {
      set({draft:{...draft,face:'front'}});
      focusSoon('#design-text, [data-action="upload"]');
      return notify(item.imageOnly ? 'Add a face photo to continue.' : 'Add text or artwork for the front.');
    }
    if (draft.sides === 2 && !hasBack(draft)) {
      set({draft:{...draft,face:'back'}});
      focusSoon('[data-action="upload"]');
      return notify('Add text or artwork for the back, or choose front only.');
    }
    const {editIndex,...values} = draft;
    const studioProof = studioBridge.proof?.('front') || draft.studioProof;
    const line = {...values,text:draft.text.trim(),back:{...draft.back,text:draft.back.text.trim()},...(studioProof ? {studioProof} : {})};
    set(s => ({cart:editIndex === null ? [...s.cart,line] : s.cart.map((l,i) => i === editIndex ? line : l),draft:{...s.draft,editIndex:null}}));
    get().go('cart');
  },
  editLine(index) {
    const line = get().cart[index];
    set(s => ({draft:{...line,back:{...line.back},specs:{...line.specs},sizes:line.sizes ? {...line.sizes} : null,editIndex:index},history:emptyHistory(),draftSession:s.draftSession + 1}));
    get().go('create',line.id,true);
  },
  removeLine(index) {
    const line = get().cart[index];
    set(s => {
      const cart = s.cart.filter((_,i) => i !== index);
      let draft = s.draft;
      if (draft?.editIndex === index) draft = {...draft,editIndex:null};
      else if (draft && draft.editIndex > index) draft = {...draft,editIndex:draft.editIndex - 1};
      return {cart,draft};
    });
    if (line) get().notify(`Removed ${product(line.id)?.name || 'item'}.`,{label:'Undo',run:() => get().restoreLine(index,line)});
  },
  restoreLine(index,line) {
    set(s => {
      const cart = s.cart.slice();
      cart.splice(Math.min(index,cart.length),0,line);
      return {cart};
    });
    get().notify('Item restored.');
  },
  /** Cart quantity stepper. Roster and mixed-size lines are edited in the designer instead. */
  setLineQty(index,qty) {
    const {cart} = get(), line = cart[index];
    if (!line) return;
    const item = product(line.id);
    if (!item || line.roster || line.sizes) return;
    const next = Math.min(item.max,Math.max(item.min,Math.round(qty) || item.min));
    set(s => ({cart:s.cart.map((entry,i) => i === index ? {...entry,qty:next} : entry)}));
  },
  stepLineQty(index,delta) {
    const line = get().cart[index];
    if (!line) return;
    const item = product(line.id);
    const step = item?.shape && item.min >= 25 ? (line.qty >= 500 ? 100 : line.qty >= 100 ? 25 : 5) : 1;
    get().setLineQty(index,line.qty + delta * step);
  },
  placeOrder({address,payment}) {
    const s = get();
    if (!s.cart.length) return;
    const {total} = cartTotals(s.cart);
    const count = s.cart.reduce((sum,line) => sum + line.qty,0);
    const receipt = {
      ref:'GC-DEMO-' + crypto.randomUUID().slice(0,8).toUpperCase(),total,count,status:'Placed',placedAt:new Date().toISOString(),
      lines:s.cart,address,payment,shipments:[{name:destinations.create.name,eta:DELIVERY_ETA}]
    };
    get().go('orders',null,false,{receipt,orders:[receipt,...s.orders],cart:[],modal:'receipt'});
  },
  reorder(order) {
    let added = 0;
    const lines = [];
    for (const line of order.lines) {
      if (!product(line.id)) continue;
      lines.push(line);
      added += line.qty;
    }
    if (!added) {
      get().closeModal();
      get().notify('No more items from this order can be added.');
      return;
    }
    set(s => ({cart:[...s.cart,...lines]}));
    get().go('cart');
    get().notify(added < order.count ? `${added.toLocaleString('en-IN')} available items added to cart.` : 'Order items added to cart.');
  },
  setLocation(area) { set({location:area}); get().closeModal(); get().notify('Delivery area updated'); },
  saveCustomJob(job) { set({customJob:job,modal:'job-saved'}); },

  /* ----- profile ----- */
  patchShopper(patch) { set(s => ({shopper:{...s.shopper,...patch}})); },
  profileAction(name,value) {
    const s = get(), {shopper} = s;
    if (name === 'profile-sign-in') { set({shopper:{...shopper,signedIn:true}}); return; }
    if (!shopper.signedIn) return;
    const address = shopper.addresses.find(entry => entry.id === Number(value));
    const order = s.orders.find(entry => entry.ref === value);
    switch (name) {
      case 'profile-open': s.openModal(value); break;
      case 'profile-track': if (order) { set({shopper:{...shopper,tracked:order},modal:'track'}); } break;
      case 'profile-reorder': if (order) s.reorder(order); break;
      case 'profile-address-edit': set({shopper:{...shopper,editing:address?.id ?? null},modal:'address-edit'}); break;
      case 'profile-address-default': if (address) { s.selectDefaultAddress(address); set({modal:'addresses'}); } break;
      case 'profile-address-remove': {
        if (!address) break;
        const addresses = shopper.addresses.filter(entry => entry !== address);
        set({shopper:{...shopper,addresses}});
        if (shopper.defaultAddress === address.id) get().selectDefaultAddress(addresses[0]);
        set({modal:'addresses'});
        break;
      }
      case 'profile-sign-out': set({shopper:{...shopper,signedIn:false,tracked:null}}); s.go('profile'); break;
    }
  },
  selectDefaultAddress(address) {
    set(s => ({shopper:{...s.shopper,defaultAddress:address?.id ?? null},...(address ? {location:address.area} : {})}));
  },
  saveAddress({label,line,area}) {
    const {shopper} = get();
    if (!deliveryAreas.includes(area)) return;
    const current = shopper.addresses.find(a => a.id === shopper.editing);
    const address = current ? {...current,label,line,area} : {id:shopper.nextAddress,label,line,area};
    const addresses = current ? shopper.addresses.map(a => a === current ? address : a) : [...shopper.addresses,address];
    set({shopper:{...shopper,addresses,nextAddress:current ? shopper.nextAddress : shopper.nextAddress + 1}});
    if (get().shopper.defaultAddress === null || get().shopper.defaultAddress === address.id) get().selectDefaultAddress(address);
    set({modal:'addresses'});
  },
  sendChat(question) {
    const answer = /order|track|reorder/i.test(question) ? 'Open Orders to track or reorder a demo order.'
      : /address|delivery/i.test(question) ? 'You can change the delivery area in the header or update a saved address under My Addresses.'
      : /art|print|design/i.test(question) ? 'Open Grooso Create, choose a product and use Preview proof to check your design.'
      : 'Try asking about order tracking, delivery addresses, or custom print artwork.';
    set(s => ({shopper:{...s.shopper,chat:[...s.shopper.chat,{question,answer}]}}));
  },

  /* ----- persistence ----- */
  async hydrate() {
    try {
      const saved = await loadSession();
      if (saved) {
        set(s => ({
          cart:(saved.cart || []).filter(line => product(line.id)),orders:saved.orders || [],location:saved.location || s.location,
          customJob:saved.customJob || null,shopper:{...s.shopper,...(saved.shopper || {})}
        }));
      }
    } catch (error) {
      console.warn('Browser storage unavailable:',error);
      set({storageError:true});
      setTimeout(() => get().notify('Storage unavailable. Keep this tab open to retain your work.'),500);
    }
    // Normalise the initial route (e.g. #home or an unknown hash) before first paint of the page content.
    const initial = parseHash();
    const hash = '#' + initial.kind + (initial.id ? '/' + initial.id : '');
    if (location.hash !== hash) history.replaceState(null,'',hash);
    set(s => ({kind:initial.kind,id:initial.id,draft:initial.id ? newDraft(product(initial.id)) : null,history:emptyHistory(),draftSession:s.draftSession + 1,hydrated:true}));
  }
}));

/** Merge `patch` into the front or back design of `face`, recording undo history. */
function commitFace(draft,face,patch,key) {
  const {commitDesign} = useStore.getState();
  if (face === 'back') commitDesign({back:{...draft.back,...patch}},key);
  else commitDesign(patch,key);
}

/* ---------- persistence wiring ---------- */
const snapshotOf = s => ({cart:s.cart,orders:s.orders,location:s.location,customJob:s.customJob,shopper:s.shopper});
function flushSave() {
  clearTimeout(saveTimer);
  const s = useStore.getState();
  if (!s.hydrated || s.storageError) return;
  saveQueue = saveQueue.then(() => saveSession(snapshotOf(s))).catch(() => useStore.getState().notify('Could not save changes. Browser storage may be full.'));
}
export function startPersistence() {
  const unsubscribe = useStore.subscribe((s,prev) => {
    if (!s.hydrated) return;
    if (s.cart === prev.cart && s.orders === prev.orders && s.location === prev.location && s.customJob === prev.customJob && s.shopper === prev.shopper) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flushSave,400);
  });
  const onHide = () => flushSave();
  window.addEventListener('pagehide',onHide);
  window.addEventListener('beforeunload',onHide);
  document.addEventListener('visibilitychange',() => { if (document.visibilityState === 'hidden') flushSave(); });
  const onPop = () => { const next = parseHash(); useStore.getState().go(next.kind,next.id); };
  window.addEventListener('popstate',onPop);
  return () => { unsubscribe(); window.removeEventListener('pagehide',onHide); window.removeEventListener('beforeunload',onHide); window.removeEventListener('popstate',onPop); };
}
