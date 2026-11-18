import {Fragment,useEffect,useRef} from 'react';
import {DEMO_PAYMENTS,deliveryAreas} from '../data/catalog.js';
import {useStore} from '../store/useStore.js';

const act = (name,value = '') => useStore.getState().profileAction(name,value);

/** Trimmed required text field; clears and flags the control when blank (mirrors the original validation). */
function requiredText(form,key) {
  const field = form.elements[key], value = field.value.trim();
  if (value) return value;
  field.value = '';
  field.reportValidity();
  return '';
}

export function EditProfile() {
  const shopper = useStore(s => s.shopper), {patchShopper,closeModal,notify} = useStore.getState();
  return <form className="job-form" onSubmit={e => {
    e.preventDefault();
    const name = requiredText(e.currentTarget,'name');
    if (!name) return;
    patchShopper({name,email:new FormData(e.currentTarget).get('email').trim()});
    closeModal(); notify('Profile updated');
  }}>
    <p className="modal-copy">Changes are saved in this browser.</p>
    <label className="field">Display name<input name="name" required maxLength={45} defaultValue={shopper.name}/></label>
    <label className="field">Email <span>Optional</span><input name="email" type="email" maxLength={100} placeholder="demo@example.com" defaultValue={shopper.email}/></label>
    <button className="button wide" type="submit">Save profile</button>
  </form>;
}

export function Addresses() {
  const shopper = useStore(s => s.shopper);
  return <>
    <p className="modal-copy">Use sample addresses in this demo. The default address fills in at checkout when its area is selected.</p>
    <div className="saved-addresses">
      {shopper.addresses.length ? shopper.addresses.map(address => <section className="saved-address" key={address.id}>
        <strong>{address.label}</strong> {shopper.defaultAddress === address.id && <span className="order-status">Default</span>}
        <p>{address.line}, {address.area}</p>
        <div className="address-actions">
          <button className="text-button" onClick={() => act('profile-address-edit',address.id)}>Edit <span className="sr">{address.label}</span></button>
          {shopper.defaultAddress !== address.id && <button className="text-button" onClick={() => act('profile-address-default',address.id)}>Make default</button>}
          <button className="text-button" onClick={() => act('profile-address-remove',address.id)}>Remove <span className="sr">{address.label}</span></button>
        </div>
      </section>) : <p className="modal-copy">No saved addresses yet.</p>}
    </div>
    <button className="button wide" onClick={() => act('profile-address-edit')}>Add address</button>
  </>;
}

export function AddressForm() {
  const shopper = useStore(s => s.shopper), loc = useStore(s => s.location), saveAddress = useStore.getState().saveAddress;
  const current = shopper.addresses.find(a => a.id === shopper.editing);
  const area = current?.area || loc;
  return <form className="job-form" onSubmit={e => {
    e.preventDefault();
    const label = requiredText(e.currentTarget,'label'); if (!label) return;
    const line = requiredText(e.currentTarget,'line'); if (!line) return;
    saveAddress({label,line,area:new FormData(e.currentTarget).get('area')});
  }}>
    <label className="field">Address label<input name="label" required maxLength={24} placeholder="e.g. Home" defaultValue={current?.label ?? ''}/></label>
    <label className="field">Street address<input name="line" required maxLength={120} placeholder="e.g. Flat 4B, 12 Park View Road" defaultValue={current?.line ?? ''}/></label>
    <label className="field">Delivery area<select name="area" defaultValue={area}>{deliveryAreas.map(option => <option key={option}>{option}</option>)}</select></label>
    <button className="button wide" type="submit">Save address</button>
  </form>;
}

export function Alerts() {
  const shopper = useStore(s => s.shopper), orders = useStore(s => s.orders), patchShopper = useStore.getState().patchShopper;
  const {orders:o,offers} = shopper.notifications;
  return <form onSubmit={e => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    patchShopper({notifications:{orders:form.has('orders'),offers:form.has('offers')}});
    useStore.getState().openModal('alerts');
  }}>
    <label className="profile-toggle"><span><strong>Order updates</strong><small>Show demo order activity here.</small></span><input type="checkbox" name="orders" defaultChecked={o}/></label>
    <label className="profile-toggle"><span><strong>Offers and promotions</strong><small>Show shopping tips and sample offers.</small></span><input type="checkbox" name="offers" defaultChecked={offers}/></label>
    <div className="fulfillment"><strong>Recent alerts</strong>
      {o && orders.length > 0 && <p>Demo order {orders[0].ref} was placed.</p>}
      {offers && <p>Explore custom merchandise and bulk printing.</p>}
      {(!o || !orders.length) && !offers && <p>No alerts to show.</p>}
    </div>
    <button className="button wide" type="submit">Save preferences</button>
  </form>;
}

export function Settings() {
  const shopper = useStore(s => s.shopper), {patchShopper,closeModal,notify} = useStore.getState();
  return <form className="job-form" onSubmit={e => {
    e.preventDefault();
    const payment = new FormData(e.currentTarget).get('payment');
    if (DEMO_PAYMENTS.includes(payment)) patchShopper({payment});
    closeModal(); notify('Settings saved');
  }}>
    <label className="field">Preferred demo payment<select name="payment" defaultValue={shopper.payment}>{DEMO_PAYMENTS.map(p => <option key={p}>{p}</option>)}</select></label>
    <p className="modal-copy">Profile, addresses, preferences and orders are saved in this browser only.</p>
    <button className="button wide" type="submit">Save settings</button>
  </form>;
}

export function Support() {
  return <>
    <p className="modal-copy">Find answers about the demo or open Help Chat.</p>
    <div className="support-faq">
      <details><summary>Where do I track an order?</summary><p>Open Orders and choose Track, or tap Track Now on your Profile.</p></details>
      <details><summary>How do I change my delivery area?</summary><p>Tap the delivery area in the header, or set a default from My Addresses.</p></details>
      <details><summary>How do I order a custom print?</summary><p>Open Grooso Create, choose your product and specs, then upload or preview your design.</p></details>
    </div>
    <button className="button wide" onClick={() => act('profile-open','chat')}>Open Help Chat</button>
  </>;
}

export function Chat() {
  const chat = useStore(s => s.shopper.chat), sendChat = useStore.getState().sendChat;
  const log = useRef(null), input = useRef(null);
  useEffect(() => { if (log.current) log.current.scrollTop = log.current.scrollHeight; },[chat.length]);
  return <>
    <p className="modal-copy">This demo chat uses automated replies and stays in this tab.</p>
    <div className="profile-chat" role="log" aria-label="Help chat conversation" ref={log}>
      <p>Hi! I can help with tracking, delivery, reordering, or print artwork.</p>
      {chat.map(({question,answer},i) => <Fragment key={i}><p className="chat-user">{question}</p><p>{answer}</p></Fragment>)}
    </div>
    <form className="chat-form" onSubmit={e => {
      e.preventDefault();
      const question = requiredText(e.currentTarget,'message');
      if (!question) return;
      sendChat(question); e.currentTarget.reset(); input.current?.focus();
    }}>
      <label className="sr" htmlFor="chat-message">Message</label>
      <input id="chat-message" ref={input} name="message" maxLength={240} required placeholder="Ask a demo question"/>
      <button className="button" type="submit">Send</button>
    </form>
  </>;
}

export function Track() {
  const order = useStore(s => s.shopper.tracked);
  if (!order) return null;
  const steps = ['Order placed','Packed','Out for delivery','Delivered'];
  const status = steps.indexOf(order.status === 'Packed' ? 'Packed' : 'Order placed');
  return <>
    <p className="modal-copy">{order.ref} · Simulated tracking</p>
    <ol className="track-steps">{steps.map((step,index) => <li key={step} className={index <= status ? 'reached' : ''} aria-current={index === status ? 'step' : undefined}><span>{index <= status ? '✓' : index + 1}</span>{step}</li>)}</ol>
    <div className="fulfillment"><strong>Delivery estimates</strong>{order.shipments.map(({name,eta}) => <p key={name}><span>{name}</span><span>{eta}</span></p>)}</div>
    <button className="button wide" onClick={() => act('profile-reorder',order.ref)}>Reorder</button>
  </>;
}

export function Logout() {
  const {closeModal} = useStore.getState();
  return <>
    <p className="modal-copy">You can continue as a guest. Your demo profile and orders will be available when you return as the demo shopper in this browser.</p>
    <div className="modal-actions"><button className="button secondary" onClick={closeModal}>Cancel</button><button className="button" onClick={() => act('profile-sign-out')}>Log out</button></div>
  </>;
}
