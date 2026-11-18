import {describe,expect,it} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {newDraft,product,products} from '../src/data/catalog.js';
import {csvRows,sampleRoster} from '../src/lib/csv.js';
import {cartTotals,lineSpecs,quote,tiersFor,validQty} from '../src/lib/pricing.js';
import {containTransform,layoutFor,patchLayout,productConfig,variantFor} from '../src/studio/design.js';

describe('catalogue & pricing', () => {
  it('has the original 12 products, all customisable', () => {
    expect(products).toHaveLength(12);
    expect(products.every(p => p.kind === 'create')).toBe(true);
  });
  it('prices a single tote with no discount', () => {
    const item = product('tote'), d = newDraft(item);
    expect(quote(item,d)).toEqual({unit:349,tier:0,total:349});
  });
  it('applies size, quality, spec and double-sided surcharges', () => {
    const item = product('brochure'), d = {...newDraft(item),variant:'A4 · 210 × 297 mm',quality:1,qty:25,sides:2};
    d.specs = {...d.specs,Fold:1};
    // 18 base + 4 A4 + 3 plus + 2 tri-fold + 0 unlaminated + 4 double-sided = 31
    expect(quote(item,d).unit).toBe(31);
  });
  it('applies volume tiers (250 brochures = 15% off)', () => {
    const item = product('brochure'), d = {...newDraft(item),qty:250};
    expect(quote(item,d).tier).toBe(15);
    expect(tiersFor(item).at(-1)[0]).toBe(2500);
  });
  it('prices mixed-size tee orders by size', () => {
    const item = product('tee'), d = {...newDraft(item),sizes:{S:2,M:0,L:0,XL:0,XXL:3},qty:5};
    // tier 5% at 5 pcs: S = round(499*.95)=474, XXL = round(549*.95)=522
    expect(quote(item,d).total).toBe(2 * 474 + 3 * 522);
  });
  it('validates quantities', () => {
    const item = product('brochure');
    expect(validQty(item,{...newDraft(item),qty:24})).toBe(false);
    expect(validQty(item,{...newDraft(item),qty:NaN})).toBe(false);
    expect(validQty(item,{...newDraft(item),qty:25})).toBe(true);
  });
  it('adds delivery to cart totals and lists specs', () => {
    const item = product('mug'), line = {...newDraft(item),qty:1,text:'x'};
    expect(cartTotals([line])).toMatchObject({subtotal:299,delivery:69,total:368});
    expect(cartTotals([])).toMatchObject({delivery:0,total:0});
    expect(lineSpecs(item,line)).toBe('325 ml · White · Standard · glazed ceramic · Protective sleeve · Front only');
  });
});

describe('CSV roster', () => {
  it('parses quotes, escaped quotes and CRLF', () => {
    expect(csvRows('name,role\r\n"Rao, Asha","Said ""hi"""\r\n')).toEqual([['name','role'],['Rao, Asha','Said "hi"']]);
  });
  it('rejects broken quoting', () => { expect(() => csvRows('a,b"c"\n')).toThrow(); expect(() => csvRows('"open\n')).toThrow(); });
  it('ships a 12-name sample', () => expect(sampleRoster().count).toBe(12));
});

describe('studio layout', () => {
  it('keeps rotated layers inside the print boundary with aspect preserved', () => {
    for (const rotation of [-180,-95,-45,0,35,90,180]) for (const [w,h] of [[.8,.4],[2,3],[.05,.1]]) for (const [x,y] of [[-.5,.3],[.5,.5],[1.5,1.2]]) {
      const b = containTransform({x,y,rotation},w,h), r = rotation * Math.PI / 180;
      const ex = (Math.abs(Math.cos(r)) * b.w + Math.abs(Math.sin(r)) * b.h) / 2, ey = (Math.abs(Math.sin(r)) * b.w + Math.abs(Math.cos(r)) * b.h) / 2;
      expect(b.x - ex).toBeGreaterThanOrEqual(.02 - 1e-9); expect(b.x + ex).toBeLessThanOrEqual(.98 + 1e-9);
      expect(b.y - ey).toBeGreaterThanOrEqual(.02 - 1e-9); expect(b.y + ey).toBeLessThanOrEqual(.98 + 1e-9);
      expect(Math.abs(b.w / b.h - w / h)).toBeLessThan(1e-9);
    }
  });
  it('merges partial saved layouts over defaults without mutating the draft', () => {
    const d = {studioLayout:{version:1,front:{image:{x:.63,rotation:24}}}};
    const l = layoutFor(d);
    expect(l.front.image).toMatchObject({x:.63,rotation:24,width:.65});
    expect(l.back.text.font).toBe('sans-serif');
    expect(patchLayout({},'front','text',{size:.2}).studioLayout.front.text.size).toBe(.2);
    expect(d.studioLayout.front.text).toBeUndefined();
  });
  it('has distinct mug variants and an unverified supplier gate', () => {
    expect(variantFor({id:'mug',variant:'325 ml'}).url).not.toBe(variantFor({id:'mug',variant:'450 ml'}).url);
    expect(productConfig.mug.verified).toBe(false);
  });
});

describe('3D model assets', () => {
  const dir = path.resolve(__dirname,'../public/models');
  for (const name of ['ceramic_mug_325ml.glb','ceramic_mug_450ml.glb','tshirt.glb']) {
    it(`${name} is a valid GLB with UVs and required node names`,() => {
      const b = fs.readFileSync(path.join(dir,name));
      expect(b.toString('ascii',0,4)).toBe('glTF');
      const j = JSON.parse(b.subarray(20,20 + b.readUInt32LE(12)));
      expect(j.meshes.every(m => m.primitives.every(p => p.attributes.TEXCOORD_0 !== undefined))).toBe(true);
      const names = j.nodes.map(n => n.name || '');
      if (name.startsWith('ceramic')) expect(names).toContain('Mug_Body_Printable');
      else {
        expect(j.asset.extras.license).toMatch(/CC-BY-4.0/);
        expect(names.some(n => n.includes('Body_Front'))).toBe(true);
        expect(names.some(n => n.includes('Body_Back'))).toBe(true);
        const pos = j.accessors[j.meshes[0].primitives[0].attributes.POSITION];
        expect(pos.componentType).toBe(5126); // FLOAT: UV generation reads raw positions
      }
    });
  }
});
