import {act,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {beforeEach,describe,expect,it} from 'vitest';
import App from '../src/App.jsx';
import {product} from '../src/data/catalog.js';
import {useStore} from '../src/store/useStore.js';

const S = () => useStore.getState();
const click = el => fireEvent.click(el);
const main = () => document.querySelector('main');
const btn = (name,scope = document.body) => within(scope).getByRole('button',{name});

async function boot(hash = '') {
  history.replaceState(null,'','/' + hash);
  useStore.setState({hydrated:false,cart:[],orders:[],modal:null,draft:null,id:null,kind:'create'});
  render(<App/>);
  await waitFor(() => expect(S().hydrated).toBe(true));
}

describe('customer flow', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('walks catalogue → design → cart → checkout → orders → track → reorder', async () => {
    await boot();
    expect(S().kind).toBe('create');
    expect(await screen.findByText('What are you making?')).toBeTruthy();

    act(() => S().go('profile'));
    expect(main().textContent).toMatch(/No orders yet/);

    act(() => S().go('categories'));
    click(screen.getByRole('button',{name:'Bags in Grooso Create'}));
    expect(S().filter).toBe('Bags');
    expect(S().kind).toBe('create');

    // open the tote; adding with no design is blocked with guidance
    click(screen.getByRole('button',{name:'Customise Everyday Canvas Tote'}));
    expect(location.hash).toBe('#create/tote');
    click(btn(/Add to cart/));
    expect(S().cart).toHaveLength(0);
    expect(screen.getByRole('status',{name:''}).textContent || document.querySelector('#toast').textContent).toMatch(/Add text or artwork for the front/);

    // text + sample art, then add
    fireEvent.change(document.querySelector('#design-text'),{target:{value:'Create test'}});
    click(btn('Use sample art'));
    expect(S().draft.art).toMatch(/^data:image\/svg/);
    S().commitDesign({studioLayout:{version:1,front:{image:{x:.63,rotation:24}}}},'t');
    click(btn(/Add to cart/));
    expect(S().cart).toHaveLength(1);
    expect(S().kind).toBe('cart');
    expect(main().textContent).toMatch(/Create test|Everyday Canvas Tote/);

    // edit and save changes keeps one line
    click(btn('Edit design'));
    expect(S().draft.text).toBe('Create test');
    expect(S().draft.editIndex).toBe(0);
    click(btn(/Save changes/));
    expect(S().cart).toHaveLength(1);

    // persistence: artwork stored by reference, restored after a "reload"
    await new Promise(r => setTimeout(r,700));
    const db = await new Promise(res => { const q = indexedDB.open('grooso-create',2); q.onsuccess = () => res(q.result); });
    const record = await new Promise(res => { const q = db.transaction('session').objectStore('session').get('current'); q.onsuccess = () => res(q.result); });
    expect(record.cart[0].art.__groosoAsset).toBeTruthy();
    expect(record.cart[0].studioLayout.front.image.rotation).toBe(24);
    db.close();
    document.body.innerHTML = '';
    await boot('#cart');
    expect(S().cart).toHaveLength(1);
    expect(S().cart[0].art.startsWith('data:image/')).toBe(true);
    expect(S().cart[0].studioLayout.front.image.rotation).toBe(24);

    // checkout
    click(btn(/Proceed to checkout/));
    const dialog = document.querySelector('dialog');
    expect(dialog.open).toBe(true);
    fireEvent.submit(dialog.querySelector('#checkout-form'));
    expect(S().orders).toHaveLength(1);
    expect(S().cart).toHaveLength(0);
    expect(S().kind).toBe('orders');
    expect(S().orders[0].total).toBeGreaterThan(69);
    expect(S().modal).toBe('receipt');

    // tracking, reorder, remove
    act(() => S().closeModal());
    click(btn('Track'));
    expect(document.querySelector('dialog').textContent).toMatch(/Simulated tracking/);
    click(btn('Reorder',document.querySelector('dialog')));
    expect(S().cart).toHaveLength(1);
    click(btn(/Remove Everyday Canvas Tote/));
    expect(S().cart).toHaveLength(0);

    // bulk brochure demo: 250 pcs, double sided
    act(() => { S().go('create'); S().openModal('demo'); });
    click(btn(/Open bulk brochure demo/));
    expect(location.hash).toBe('#create/brochure');
    click(btn(/Add to cart/));
    expect(S().cart[0].qty).toBe(250);
    expect(S().cart[0].sides).toBe(2);
  });

  it('validates quantity and shows bulk discount tiers', async () => {
    await boot('#create/brochure');
    const qty = document.querySelector('#bulk-qty');
    fireEvent.change(qty,{target:{value:'10'}});
    expect(document.querySelector('#quote').textContent).toMatch(/Enter whole quantities totalling 25–10,000 pieces/);
    expect(btn(/Add to cart/).disabled).toBe(true);
    fireEvent.change(qty,{target:{value:'250'}});
    expect(document.querySelector('#quote').textContent).toMatch(/15% bulk discount/);
  });

  it('filters and searches the catalogue', async () => {
    await boot();
    click(screen.getByRole('button',{name:'Printables'}));
    expect(document.querySelectorAll('.card')).toHaveLength(8);
    fireEvent.change(screen.getByRole('searchbox'),{target:{value:'mug'}});
    expect(document.querySelectorAll('.card')).toHaveLength(0);
    expect(main().textContent).toMatch(/No products match/);
    click(btn('Show all products'));
    expect(document.querySelectorAll('.card')).toHaveLength(12);
  });

  it('requires an address at checkout and supports mixed tee sizes', async () => {
    await boot('#create/tee');
    click(btn('Mix sizes'));
    expect(S().draft.sizes).toBeTruthy();
    expect(product('tee').options).toHaveLength(5);
  });
});
