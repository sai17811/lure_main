import {useEffect,useRef} from 'react';
import {appTabs,destinations} from '../data/catalog.js';
import {cartCount} from '../lib/pricing.js';
import {pieces} from '../lib/format.js';
import {scrollToCatalog} from '../lib/dom.js';
import {useStore} from '../store/useStore.js';
import {Icon} from './Icon.jsx';

export function Header() {
  const kind = useStore(s => s.kind), query = useStore(s => s.query), loc = useStore(s => s.location), cart = useStore(s => s.cart);
  const {go,setQuery,openModal} = useStore.getState();
  const count = cartCount(cart);
  const searchRef = useRef(null);
  const showProducts = () => {
    if (kind === 'create') return scrollToCatalog();
    go('create');
    requestAnimationFrame(scrollToCatalog);
  };
  const nav = (value,label,onClick = () => go(value)) => <button key={value} onClick={onClick} aria-current={value === kind ? 'page' : 'false'}>{label}</button>;
  return <header className="header">
    <div className="shell top">
      <button className="brand" onClick={() => go('home')} aria-label="Grooso home"><span className="brandmark"><Icon name="brand"/></span>grooso<span className="brand-create">create</span></button>
      <button className="location" onClick={() => openModal('location')}><span><Icon name="pin"/></span><span><small>DELIVER TO</small><strong id="location-text">{loc}</strong></span><span><Icon name="chevron"/></span></button>
      <form className="search" role="search" onSubmit={e => { e.preventDefault(); document.querySelector('#catalog')?.scrollIntoView(); }}>
        <label className="sr" htmlFor="search">Search products</label><span><Icon name="search"/></span>
        <input ref={searchRef} id="search" type="search" placeholder={destinations.create.search} autoComplete="off" value={query} onChange={e => setQuery(e.target.value)}/>
        <button type="button" id="clear-search" aria-label="Clear search" hidden={!query} onClick={() => { setQuery(''); searchRef.current?.focus(); }}>×</button>
      </form>
      <button className="cart-button" onClick={() => go('cart')} aria-label={`Cart, ${count} items`}><span><Icon name="bag"/></span><span className="cart-label">Cart</span><b id="cart-count" key={count} className="bump">{pieces(count)}</b></button>
    </div>
    <nav className="desktop-nav shell" aria-label="Main navigation">
      {nav('create','Products',showProducts)}{nav('categories','Categories')}
      {nav('orders','Orders')}{nav('profile','Account')}
    </nav>
  </header>;
}

export function Footer() {
  const {go,openModal} = useStore.getState();
  return <footer className="shell footer">
    <div><strong>grooso<span className="dot">.</span> create</strong><p>Thoughtful details. Personal creations.</p><small>Interactive demo · No real payments or fulfillment</small></div>
    <div className="footer-links">
      <a href={`${import.meta.env.BASE_URL}credits.html`}>Model credits</a>
      <button onClick={() => openModal('artwork-guide')}>Artwork &amp; ordering guide</button>
      <button onClick={() => openModal('custom-job')}>Custom specifications</button>
      <button onClick={() => go('orders')}>Your demo orders</button>
      <button onClick={() => openModal('demo')}>Try a sample design</button>
    </div>
  </footer>;
}

export function AppTabs() {
  const kind = useStore(s => s.kind), cart = useStore(s => s.cart), go = useStore.getState().go;
  const current = Object.hasOwn(destinations,kind) ? 'home' : kind;
  const count = cartCount(cart);
  return <nav className="app-tabs" aria-label="App tabs"><div id="app-tabs">
    {Object.entries(appTabs).map(([key,tab]) => <button key={key} className={'app-tab ' + (current === key ? 'active' : '')} onClick={() => go(key)} aria-current={current === key ? 'page' : undefined}
      aria-label={key === 'cart' ? (count ? `Cart, ${pieces(count)} ${count === 1 ? 'item' : 'items'}` : 'Cart') : undefined}>
      <span className="tab-icon"><Icon name={tab.icon}/>{key === 'cart' && <b id="tab-cart-count" aria-hidden="true" hidden={!count}>{pieces(count)}</b>}</span><span>{tab.name}</span>
    </button>)}
  </div></nav>;
}

export function Toast() {
  const {message,visible,action} = useStore(s => s.toast);
  const runToastAction = useStore(s => s.runToastAction);
  return <div className={'toast ' + (visible ? 'show' : '')} id="toast" role="status">{message}
    {action && <button type="button" onClick={runToastAction}>{action.label}</button>}
  </div>;
}

/** Keep <body data-page> in sync: the stylesheet themes pages (profile, cart) through it. */
export function usePageAttribute() {
  const kind = useStore(s => s.kind);
  useEffect(() => { document.body.dataset.page = kind; },[kind]);
}
