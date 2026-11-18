// IndexedDB persistence. Database name/schema are unchanged from the vanilla app, so saved carts and
// orders carry over. Uploaded artwork lives in its own store and is referenced by id from the session.
const DB_NAME = 'grooso-create';
const DB_VERSION = 2;
const ASSET_KEY = '__groosoAsset';
const isBlob = v => typeof Blob !== 'undefined' && v instanceof Blob;

let dbPromise;
const knownIds = new Map();   // data URL -> asset id (avoids re-hashing and re-writing)
const storedIds = new Set();  // ids known to be in the artwork store

function openDb() {
  dbPromise ||= new Promise((resolve,reject) => {
    const request = indexedDB.open(DB_NAME,DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('session')) db.createObjectStore('session');
      if (!db.objectStoreNames.contains('artwork')) db.createObjectStore('artwork');
    };
    request.onsuccess = () => { request.result.onversionchange = () => request.result.close(); resolve(request.result); };
    request.onblocked = () => reject(new Error('Close other Grooso tabs and reload to upgrade saved design storage.'));
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

const req = request => new Promise((resolve,reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });

function hydrate(value,assets) {
  if (!value || typeof value !== 'object' || isBlob(value)) return value;
  if (Array.isArray(value)) return value.map(v => hydrate(v,assets));
  if (value[ASSET_KEY]) return assets.get(value[ASSET_KEY]) || '';
  return Object.fromEntries(Object.entries(value).map(([k,v]) => [k,hydrate(v,assets)]));
}

function detach(value,put,used) {
  if (typeof value === 'string' && value.startsWith('data:image/')) {
    let id = knownIds.get(value);
    if (!id) { id = crypto.randomUUID(); knownIds.set(value,id); }
    used.add(id);
    if (!storedIds.has(id)) { put(id,value); storedIds.add(id); }
    return {[ASSET_KEY]:id};
  }
  if (!value || typeof value !== 'object' || isBlob(value)) return value;
  if (Array.isArray(value)) return value.map(v => detach(v,put,used));
  return Object.fromEntries(Object.entries(value).map(([k,v]) => [k,detach(v,put,used)]));
}

/** Returns the saved session (artwork re-attached) or null. Throws if storage is unavailable. */
export async function loadSession() {
  const db = await openDb();
  const saved = await req(db.transaction('session').objectStore('session').get('current'));
  if (saved?.version !== 1) return null;
  const rows = await req(db.transaction('artwork').objectStore('artwork').getAll());
  const assets = new Map(rows.map(row => { knownIds.set(row.data,row.id); storedIds.add(row.id); return [row.id,row.data]; }));
  return hydrate(saved,assets);
}

/** Persist a snapshot. Only artwork that is not already stored is written; orphaned artwork is removed. */
export async function saveSession(snapshot) {
  const db = await openDb();
  const used = new Set();
  const tx = db.transaction(['session','artwork'],'readwrite');
  const artwork = tx.objectStore('artwork');
  const detached = detach({version:1,...snapshot},(id,data) => artwork.put({id,data},id),used);
  tx.objectStore('session').put(detached,'current');
  await new Promise((resolve,reject) => { tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); });
  // Garbage-collect artwork no longer referenced by the cart or orders.
  const keys = await req(db.transaction('artwork').objectStore('artwork').getAllKeys());
  const stale = keys.filter(key => !used.has(key));
  if (stale.length) {
    const cleanup = db.transaction('artwork','readwrite').objectStore('artwork');
    for (const key of stale) { cleanup.delete(key); storedIds.delete(key); }
  }
}
