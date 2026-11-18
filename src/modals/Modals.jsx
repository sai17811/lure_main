import {useEffect,useMemo,useRef} from 'react';
import {DELIVERY_ETA,deliveryAreas,destinations,product} from '../data/catalog.js';
import {artworkLimit,supportedImageTypes} from '../lib/artwork.js';
import {money,pieces} from '../lib/format.js';
import {cartTotals,lineSpecs,lineTotal,validQty} from '../lib/pricing.js';
import {useStore} from '../store/useStore.js';
import {studioBridge} from '../studio/bridge.js';
import {Icon} from '../components/Icon.jsx';
import {ProofSvg} from '../components/Proof.jsx';
import {SideSwitch} from '../components/Controls.jsx';
import {AddressForm,Addresses,Alerts,Chat,EditProfile,Logout,Settings,Support,Track} from './ProfileModals.jsx';

export function productionDetails(line) {
  const sides = line.sides === 2 && !line.pdfBoth ? [['Front',line],['Back',line.back]] : [[line.pdfBoth && line.sides === 2 ? 'Both sides' : 'Artwork',line]];
  return <>
    {sides.filter(([,design]) => design.filename).map(([side,design]) => <small key={side}>{side}: {design.filename}</small>)}
    {line.text && <small>Text: {line.text}</small>}
    {line.sides === 2 && line.back.text && <small>Back text: {line.back.text}</small>}
    {line.roster && <small>Roster: {line.roster.filename} · {pieces(line.roster.count)} names</small>}
    {line.notes && <small>Notes: {line.notes}</small>}
  </>;
}

function Checkout() {
  const {cart,shopper,location:loc} = useStore(), {closeModal,placeOrder} = useStore.getState();
  const available = shopper.signedIn ? shopper.addresses.filter(a => a.area === loc) : [];
  const found = available.find(a => a.id === shopper.defaultAddress) || available[0];
  const defaultAddress = (found?.line || 'Flat 4B, 12 Park View Road') + ', ' + loc;
  const {subtotal,delivery,total} = cartTotals(cart);
  return <>
    <p className="modal-copy">Review each delivery group. This is a simulated order.</p>
    <form className="job-form" id="checkout-form" onSubmit={e => {
      e.preventDefault();
      const address = e.currentTarget.elements.address;
      if (!address.value.trim()) { address.value = ''; address.reportValidity(); return; }
      placeOrder({address:address.value.trim(),payment:e.currentTarget.elements.payment.value});
    }}>
      <label className="field">Delivery address<input name="address" maxLength={160} required defaultValue={defaultAddress}/></label>
      <label className="field">Demo payment<select name="payment" defaultValue={shopper.signedIn ? shopper.payment : undefined}>
        {['Cash on delivery (demo)','Simulated online payment'].map(p => <option key={p}>{p}</option>)}</select></label>
      {cart.length > 0 && <div className="fulfillment"><strong>Production summary</strong>
        {cart.map((line,i) => { const item = product(line.id); return <div className="cart-line" key={i}>
          <div><strong>{item.name} · {pieces(line.qty)} pcs</strong><small>{lineSpecs(item,line)}</small>{productionDetails(line)}</div><strong>{money(lineTotal(line))}</strong></div>; })}
      </div>}
      <div className="fulfillment"><strong>Delivery to {loc}</strong><p><span>{destinations.create.name} · {DELIVERY_ETA}</span><span>{money(delivery)}</span></p></div>
      <div className="totals"><p><span>Items</span><strong>{money(subtotal)}</strong></p><p><span>Delivery</span><strong>{money(delivery)}</strong></p><p className="total"><span>Total</span><strong>{money(total)}</strong></p></div>
      <div className="modal-actions"><button className="button secondary" type="button" onClick={closeModal}>Back to cart</button><button className="button" type="submit">Place demo order <Icon name="arrow"/></button></div>
    </form>
  </>;
}

function Receipt() {
  const receipt = useStore(s => s.receipt), go = useStore.getState().go;
  if (!receipt) return null;
  const {ref,total,count,shipments,address,payment} = receipt;
  return <>
    <p className="modal-copy">Order <strong>{ref}</strong> contains {pieces(count)} {count === 1 ? 'item' : 'items'}. Simulated total: <strong>{money(total)}</strong>.</p>
    <div className="fulfillment"><strong>{payment}</strong><p>{address}</p></div>
    <div className="fulfillment"><strong>Demo delivery estimates</strong>{shipments.map(({name,eta}) => <p key={name}><span>{name}</span><span>{eta}</span></p>)}</div>
    <button className="button wide" onClick={() => go('orders')}>View orders</button>
  </>;
}

function ProofDialog() {
  const draft = useStore(s => s.draft), {closeModal,setFace} = useStore.getState();
  const item = product(draft.id);
  // Mug and tee proofs are rendered from the live studio layers for the face being viewed.
  const studioProof = useMemo(() => ['mug','tee'].includes(item.id) ? studioBridge.proof?.(draft.face) : null,[draft,item.id]);
  return <>
    <div id="proof-dialog-body">
      <div className="preview-stage" style={{'--tile':item.tile}}><div id="modal-mockup"><ProofSvg item={item} draft={{...draft,studioProof:studioProof || undefined}}/></div></div>
      <div className="preview-dialog-faces"><SideSwitch draft={draft} onPick={setFace} proof/></div>
      <p className="preview-caption">{lineSpecs(item,draft)}{validQty(item,draft) ? ' · ' + pieces(draft.qty) + ' pcs' : ''}</p>
    </div>
    <button className="button wide" onClick={closeModal}>Back to design</button>
  </>;
}

function Demo() {
  const startDemo = useStore.getState().startDemo;
  return <>
    <div className="modal-copy"><p>Try a 250-piece brochure run with front and back artwork, or start with a personalised tote.</p>
      <ol><li>Compare material grades and pick a finish.</li><li>Check both sides of the proof and try a different volume.</li><li>Add it to the Create cart and place a demo order.</li></ol>
      <p>Designs and orders are saved in this browser. No order is sent to a printer.</p></div>
    <button className="button wide" onClick={() => startDemo('bulk')}>Open bulk brochure demo <Icon name="arrow"/></button>
    <button className="button secondary wide" onClick={() => startDemo('tote')}>Open sample tote</button>
  </>;
}

function Location() {
  const loc = useStore(s => s.location), setLocation = useStore.getState().setLocation;
  return <>
    <p className="modal-copy">Choose a sample delivery area for your print order.</p>
    {deliveryAreas.map(area => <button key={area} className={'button ' + (area === loc ? '' : 'secondary') + ' wide'} onClick={() => setLocation(area)}>{area}{area === loc && <Icon name="check"/>}</button>)}
  </>;
}

function ArtworkGuide() {
  return <div className="modal-copy">
    <h3>Prepare your design</h3><p>Use PNG, JPG or WebP artwork up to 20 MB. Keep important content inside the indicated print area. Check both sides for double-sided products.</p>
    <h3>Review before ordering</h3><p>The 2D and 3D previews show placement and colour so you can check your idea. Mug and tee models, materials and print limits are approximations until supplier templates are approved.</p>
    <h3>Exports and production files</h3><p>Design exports and review PNGs are for placement checks only. Supplier-approved dimensions, margins, DPI and an output profile are required before anything is printed.</p>
    <h3>Your saved work</h3><p>Add your design to the cart to save it in this browser. Unsaved editor changes may be lost on refresh. Demo orders are not sent to a printer.</p>
  </div>;
}

function JobForm() {
  const {draft,customJob,saveCustomJob} = useStore();
  const item = draft && product(draft.id);
  const job = customJob || (item ? {type:item.name,qty:validQty(item,draft) ? draft.qty : ''} : {});
  const error = useRef(null);
  return <>
    <p className="modal-copy">Specify a product, unusual finish, or quantity beyond the catalogue. The prototype saves the details here for review.</p>
    <form id="job-form" className="job-form" onSubmit={e => {
      e.preventDefault();
      const form = new FormData(e.currentTarget);
      const type = form.get('type').trim(), spec = form.get('spec').trim(), file = form.get('reference');
      if (!type || !spec || file.size > artworkLimit || (file.size && !supportedImageTypes.includes(file.type) && file.type !== 'application/pdf')) {
        error.current.textContent = 'Enter the product and specifications. Attach an image or PDF up to 20 MB.';
        error.current.hidden = false;
        return;
      }
      const reference = file.size ? file : (form.has('clearReference') ? null : customJob?.reference);
      saveCustomJob({type,spec,qty:Number(form.get('qty')),needBy:form.get('needBy'),reference});
    }}>
      <label className="field">What are you making?<input name="type" maxLength={80} required placeholder="e.g. 16-page saddle-stitched booklets" defaultValue={job.type ?? ''}/></label>
      <label className="field">Quantity<input name="qty" type="number" min="1" max="1000000" step="1" required defaultValue={job.qty ?? ''}/></label>
      <label className="field">Needed by <span>Optional</span><input name="needBy" type="date" defaultValue={job.needBy ?? ''}/></label>
      <label className="field">Size, material, finish, and other requirements<textarea name="spec" rows={3} maxLength={500} required placeholder="e.g. A5, 170 GSM inside, matte cover" defaultValue={job.spec ?? ''}/></label>
      <label className="field">Reference file <span>Optional · image or PDF up to 20 MB</span><input name="reference" type="file" accept="image/png,image/jpeg,image/webp,application/pdf,.pdf"/></label>
      {job.reference && <><p className="hint">Current attachment: {job.reference.name}</p><label className="field pdf-both"><input name="clearReference" type="checkbox"/> Remove current attachment</label></>}
      <p className="qty-error" id="job-error" ref={error} hidden/>
      <button className="button wide" type="submit">Save demo request</button>
    </form>
  </>;
}

function JobSaved() {
  const job = useStore(s => s.customJob), openModal = useStore.getState().openModal;
  if (!job) return null;
  return <>
    <p className="modal-copy">Saved in this tab for review. This demo does not send a request or assign a price.</p>
    <div className="fulfillment job-summary"><strong>{job.type}</strong><br/>{pieces(job.qty)} pieces{job.needBy ? ' · Needed by ' + job.needBy : ''}<br/>{job.spec}{job.reference && <><br/>Reference: {job.reference.name}</>}</div>
    <button className="button wide" onClick={() => openModal('custom-job')}>Edit job details</button>
  </>;
}

const bodies = {
  checkout:Checkout,receipt:Receipt,preview:ProofDialog,demo:Demo,location:Location,'artwork-guide':ArtworkGuide,'custom-job':JobForm,'job-saved':JobSaved,
  'edit-profile':EditProfile,addresses:Addresses,'address-edit':AddressForm,alerts:Alerts,settings:Settings,support:Support,chat:Chat,track:Track,logout:Logout
};
const titles = {
  cart:'Your cart',checkout:'Demo checkout',receipt:'Demo order placed',preview:'Design proof',demo:'Try Grooso Create',location:'Choose a delivery area',
  'custom-job':'Request a custom spec','job-saved':'Custom job saved for demo','artwork-guide':'Artwork & ordering guide',
  'edit-profile':'Edit Profile',addresses:'My Addresses',alerts:'Notifications & Alerts',settings:'Account Settings',support:'Help & Support',chat:'Help Chat',track:'Track order',logout:'Log out of the demo?'
};

/** The single native <dialog> used for every modal (focus trap, Esc and inert background come from the platform). */
export function ModalHost() {
  const modal = useStore(s => s.modal), editing = useStore(s => s.shopper.editing), signedIn = useStore(s => s.shopper.signedIn);
  const ref = useRef(null);
  const Body = modal && bodies[modal];
  const profileOnly = ['edit-profile','addresses','address-edit','alerts','settings','support','chat','track','logout'].includes(modal);
  const visible = Body && !(profileOnly && !signedIn);
  const title = modal === 'address-edit' ? (editing === null ? 'Add address' : 'Edit address') : titles[modal];

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (visible) {
      if (!dialog.open) dialog.showModal();
      const field = dialog.querySelector('[data-autofocus],input:not([type=hidden]),select,textarea');
      (field || dialog.querySelector('.modal-close'))?.focus();
    } else if (dialog.open) dialog.close();
  },[visible,modal]);

  return <dialog id="dialog" ref={ref} aria-labelledby="dialog-title"
    onClose={() => useStore.getState().closeModal()}
    onClick={e => {
      if (e.target !== ref.current) return;
      const b = ref.current.getBoundingClientRect();
      if (e.clientX < b.left || e.clientX > b.right || e.clientY < b.top || e.clientY > b.bottom) useStore.getState().closeModal();
    }}>
    {visible && <>
      <div className="modal-head"><h2 id="dialog-title">{title}</h2><button className="modal-close" onClick={() => useStore.getState().closeModal()} aria-label="Close dialog">×</button></div>
      <Body/>
    </>}
  </dialog>;
}
