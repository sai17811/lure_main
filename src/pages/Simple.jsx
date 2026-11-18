import {Fragment} from 'react';
import {IMG,appTabs,destinations,printProducts,products,product} from '../data/catalog.js';
import {money,pieces} from '../lib/format.js';
import {cartTotals,lineSpecs,lineTotal} from '../lib/pricing.js';
import {useStore} from '../store/useStore.js';
import {Icon} from '../components/Icon.jsx';
import {PrintTile,ProofSvg} from '../components/Proof.jsx';
import {productionDetails} from '../modals/Modals.jsx';
import {preloadStudioFor} from '../studio/preload.js';

export function Picture({img,alt = '',className,fetchPriority,eager}) {
  return <picture>
    <source type="image/webp" srcSet={img.webp}/>
    <img className={className} src={img.jpg} alt={alt} width={img.width} height={img.height} decoding="async" loading={eager ? 'eager' : 'lazy'} fetchPriority={fetchPriority}
      style={{background:`center/cover url(${img.ph})`}}/>
  </picture>;
}

function Card({item}) {
  const go = useStore.getState().go;
  return <article className="card"><button className="card-button" aria-label={'Customise ' + item.name} onClick={() => go('create',item.id)}
    onPointerEnter={() => preloadStudioFor(item.id)} onFocus={() => preloadStudioFor(item.id)}>
    <div className="card-media" style={{'--tile':item.tile}}>
      {item.badge && <span className="badge">{item.badge}</span>}
      {item.shape ? <PrintTile item={item}/> : IMG[item.id] ? <Picture img={IMG[item.id]}/> : <span className="card-emoji" aria-hidden="true">{item.emoji}</span>}
    </div>
    <div className="card-copy"><small>{item.category}</small><h3>{item.name}</h3>
      <div className="card-bottom"><span>From {money(item.price)}{item.shape ? ' / pc' : ''}</span><span>Customise</span><Icon name="arrow"/></div></div>
  </button></article>;
}

export function Catalog() {
  const filter = useStore(s => s.filter), query = useStore(s => s.query);
  const {setFilter,openModal,browse,setQuery} = useStore.getState();
  const categories = ['All','Printables',...new Set(products.map(i => i.category).filter(c => c !== 'Printables'))];
  const q = query.trim().toLowerCase();
  const filtered = products.filter(i => (filter === 'All' || filter === i.category) && (i.name + ' ' + i.category).toLowerCase().includes(q));
  const steps = [['Pick a product','Find a blank that fits your idea.'],['Add your design','Upload artwork, add text and preview it.'],['Make it yours','Choose a quantity and place a demo order.']];
  return <>
    <section className="hero" aria-label="Introducing Grooso Create">
      <div className="hero-bg"></div>
      <div className="hero-overlay"></div>
      <div className="hero-glow"></div>
      <div className="hero-content">
        <span className="eyebrow"><Icon name="sparkle"/> Print &amp; merchandise · Rajahmundry</span>
        <h1>Your ideas.<br/><em className="brand-text">Beautifully printed.</em></h1>
        <p className="hero-lede">Brochures, badges and event signage, or your design on a tee. One piece or a full run, proofed before it goes to press.</p>
        <div className="hero-actions">
          <button className="button" onClick={() => browse()}>Explore products <Icon name="arrow"/></button>
          <button className="button secondary" onClick={() => document.getElementById('how-it-works')?.scrollIntoView({behavior:'smooth'})}>How ordering works <Icon name="chevron"/></button>
        </div>
        <div className="hero-stats">
          <div className="stat"><span className="stat-value">From 1 pc</span><span className="stat-label">minimum order</span></div>
          <div className="stat"><span className="stat-value">5–7 days</span><span className="stat-label">turnaround</span></div>
          <div className="stat"><span className="stat-value">12 products</span><span className="stat-label">customisable range</span></div>
        </div>
      </div>
      <div className="hero-badge"><span className="badge-dot" aria-hidden="true"></span>Live design studio · Proof before print</div>
    </section>
    <div className="benefits"><div className="benefit"><Icon name="box"/> Single pieces to bulk runs</div><div className="benefit"><Icon name="eye"/> Live design preview</div><div className="benefit"><Icon name="truck"/> Delivery in 5–7 days</div></div>
    <section id="catalog" tabIndex={-1}>
      <div className="section-head"><div><h2>What are you making?</h2><p>Browse print products and personalised merchandise.</p></div><button className="text-button" onClick={() => openModal('demo')}>Try the demo <Icon name="arrow"/></button></div>
      <div className="filters" aria-label="Filter by category">{categories.map(c => <button key={c} className={'chip ' + (filter === c ? 'active' : '')} aria-pressed={filter === c} onClick={() => setFilter(c)}>{c}</button>)}</div>
      <div className="grid">{filtered.length ? filtered.map(i => <Card key={i.id} item={i}/>) :
        <div className="empty"><p>No products match this search and filter.</p><button className="button secondary" onClick={() => { setFilter('All'); setQuery(''); }}>Show all products</button></div>}</div>
    </section>
    <section id="how-it-works" className="how"><div className="section-head"><div><h2>From idea to order</h2></div></div>
      <div className="steps">{steps.map(([name,desc],i) => <div className="step" key={name}><span>0{i + 1}</span><div><strong>{name}</strong><p>{desc}</p></div></div>)}</div></section>
    <section className="bulk-banner">
      <span className="bulk-icon"><Icon name="box"/></span>
      <div><span className="eyebrow">PRINT &amp; BULK STUDIO</span><h2>Print for the whole team.</h2><p>Compare materials, price a run, or specify a custom job.</p></div>
      <div className="bulk-actions"><button className="button" onClick={() => browse(true)}>Browse printables <Icon name="arrow"/></button><button className="button secondary" onClick={() => openModal('custom-job')}>Request a custom spec</button></div>
    </section>
  </>;
}

export function Categories() {
  const openCategory = useStore.getState().openCategory;
  const categories = [...new Set(products.map(i => i.category))];
  const service = destinations.create;
  return <section className="app-page"><h1>Categories</h1><p className="app-page-intro">Choose a print or merchandise category.</p>
    <div className="app-page-grid"><section className="app-panel" data-service="create">
      <div className="app-panel-heading"><span className="service-icon"><Icon name={service.icon}/></span><div><h2>{service.name}</h2><p>{service.service}</p></div></div>
      <div className="category-links">{categories.map(c => <button key={c} className="chip" onClick={() => openCategory(c)} aria-label={`${c} in ${service.name}`}>{c}</button>)}</div>
    </section></div></section>;
}

export function Orders() {
  const orders = useStore(s => s.orders), {profileAction,go} = useStore.getState();
  return <section className="app-page"><h1>Orders</h1><p className="app-page-intro">Your demo print orders, saved in this browser.</p>
    {orders.length ? orders.map(order => <article className="app-panel order-card" key={order.ref}>
      <div className="order-heading"><div><h2>{order.seller || order.ref}</h2><p>{pieces(order.count)} {order.count === 1 ? 'item' : 'items'} · {order.status}</p></div><strong>{money(order.total)}</strong></div>
      <div className="order-products">{order.lines.map((line,i) => { const item = product(line.id); return item && <div className="order-product" key={i}>
        <div className="saved-proof"><ProofSvg item={item} draft={{...line,face:'front'}}/></div>
        <div><strong>{item.name}</strong><p>{pieces(line.qty)} pieces · {line.text || 'Custom artwork'}</p></div></div>; })}</div>
      <p className="hint">{order.placedAt ? 'Placed ' + new Date(order.placedAt).toLocaleDateString('en-IN') : 'Saved demo order'} · Simulated fulfillment</p>
      <details><summary>Delivery details</summary><div className="fulfillment"><strong>{order.payment}</strong><p>{order.address}</p>{order.shipments.map(({name,eta}) => <p key={name}><span>{name}</span><span>{eta}</span></p>)}</div></details>
      <div className="order-actions"><button className="text-button" onClick={() => profileAction('profile-track',order.ref)}>Track</button><button className="text-button" onClick={() => profileAction('profile-reorder',order.ref)}>Reorder</button></div>
    </article>) : <div className="empty"><p>No orders yet. Create your first custom product.</p><button className="button" onClick={() => go('profile')}>Go to Profile</button></div>}
  </section>;
}

export function Cart() {
  const cart = useStore(s => s.cart), loc = useStore(s => s.location), {go,editLine,removeLine,stepLineQty,openModal} = useStore.getState();
  const {subtotal,delivery,total,remaining} = cartTotals(cart);
  return <section className="cart-page">
    <div className="cart-title"><div><span className="eyebrow"><Icon name="bag"/> CREATE CHECKOUT</span><h1>My Cart</h1><p><Icon name="pin"/> {loc}</p></div>
      <button className="text-button" onClick={() => go('home')}>Continue shopping <Icon name="arrow"/></button></div>
    {cart.length ? <div className="cart-layout">
      <div className="cart-groups"><section className="cart-group"><div className="cart-group-head"><h2>Custom printing</h2><p>Estimated delivery: 5–7 business days</p></div>
        {cart.map((line,index) => { const item = product(line.id); return <article className="cart-product" key={index}>
          <div className="cart-photo"><ProofSvg item={item} draft={{...line,face:'front'}}/></div>
          <div className="cart-product-copy"><h3>{item.name}</h3><small>{lineSpecs(item,line)}</small>{productionDetails(line)}
            <div className="cart-line-actions">
              {line.roster || line.sizes
                ? <span className="custom-qty">{pieces(line.qty)} pcs</span>
                : <div className="quantity" role="group" aria-label={`Quantity for ${item.name}`}>
                    <button type="button" onClick={() => stepLineQty(index,-1)} disabled={line.qty <= item.min} aria-label={`Decrease quantity for ${item.name}`}>−</button>
                    <output aria-live="polite">{pieces(line.qty)}</output>
                    <button type="button" onClick={() => stepLineQty(index,1)} disabled={line.qty >= item.max} aria-label={`Increase quantity for ${item.name}`}>+</button>
                  </div>}
              <button className="text-button" onClick={() => editLine(index)}>Edit design</button>
              <button className="text-button remove-item" onClick={() => removeLine(index)} aria-label={`Remove ${item.name}`}>Remove</button></div></div>
          <div className="line-price"><strong>{money(lineTotal(line))}</strong></div></article>; })}
      </section></div>
      <aside className="cart-summary" aria-label="Order summary"><h2>Order summary</h2>
        <div className="cart-price-details"><p><span>Items</span><strong>{money(subtotal)}</strong></p><p><span>Delivery</span><strong>{delivery ? money(delivery) : 'Free'}</strong></p>
          <p className="hint">{remaining > 0 ? `Add ${money(remaining)} more for free delivery.` : 'Free delivery applied.'}</p></div>
        <div className="cart-final"><div><small>Total</small><strong>{money(total)}</strong></div><button className="button" onClick={() => openModal('checkout')}>Proceed to checkout <Icon name="arrow"/></button></div>
        <p className="hint cart-demo-note">Demo prices and delivery windows</p></aside>
    </div> : <div className="empty"><p>Your cart is empty. Choose a product and personalise your design.</p><button className="button" onClick={() => go('home')}>Explore Create</button></div>}
  </section>;
}

export function Profile() {
  const {shopper,orders} = useStore(), {profileAction:act,go} = useStore.getState();
  const row = (icon,label,name,value = '',extra = '') => <button className={'profile-link ' + extra} onClick={() => act(name,value)}><span><Icon name={icon}/><strong>{label}</strong></span><Icon name="chevron"/></button>;
  if (!shopper.signedIn) return <section className="profile-page"><h1>Profile</h1><div className="app-panel guest-profile"><span className="profile-avatar"><Icon name="person"/></span><h2>You’re signed out</h2><p>Continue as the demo shopper to see your profile and orders.</p><button className="button" onClick={() => act('profile-sign-in')}>Continue as demo shopper</button></div></section>;
  const recent = orders[0];
  if (!recent) return <section className="profile-page"><h1>My profile</h1>
    <div className="app-panel"><h2>{shopper.name}</h2>{row('person','Edit profile','profile-open','edit-profile')}{row('home','My addresses','profile-open','addresses')}{row('settings','Account settings','profile-open','settings')}{row('help','Help & support','profile-open','support')}</div>
    <div className="app-panel"><h2>No orders yet</h2><p>Your completed demo orders will appear here.</p><button className="button" onClick={() => go('create')}>Explore products</button></div></section>;
  const service = recent.shipments.length === 1 ? recent.shipments[0].name : 'Multiple deliveries';
  return <section className="profile-page" aria-labelledby="profile-name">
    <div className="profile-identity"><span className="profile-avatar" aria-hidden="true"><Icon name="person"/></span><div><span className="eyebrow">MY PROFILE</span><h1 id="profile-name">{shopper.name}</h1><button className="text-button" onClick={() => act('profile-open','edit-profile')}>Edit Profile <Icon name="arrow"/></button></div></div>
    <nav className="app-panel profile-menu" aria-label="Profile options">
      <button className="profile-link" onClick={() => go('orders')}><span><Icon name="receipt"/><strong>My Orders</strong></span><Icon name="chevron"/></button>
      {row('home','My Addresses','profile-open','addresses')}{row('bell','Notifications & Alerts','profile-open','alerts')}{row('settings','Account Settings','profile-open','settings')}{row('help','Help & Support','profile-open','support')}{row('logout','Logout','profile-open','logout','logout-link')}
    </nav>
    <div className="profile-lower">
      <section className="app-panel profile-recent"><h2>Recent Orders</h2><div className="recent-order"><strong>{recent.seller || recent.ref}</strong><p>{service}</p><span className="order-status">{pieces(recent.count)} {recent.count === 1 ? 'item' : 'items'} · {recent.status}</span></div><button className="button" onClick={() => act('profile-track',recent.ref)}>Track Now <Icon name="arrow"/></button></section>
      <section className="app-panel profile-quick"><h2>Quick Links</h2><button className="text-button" onClick={() => act('profile-reorder',recent.ref)}>Reorder</button><button className="text-button" onClick={() => act('profile-open','edit-profile')}>Update Info</button><button className="text-button" onClick={() => act('profile-open','chat')}>Help Chat</button></section>
    </div>
  </section>;
}
