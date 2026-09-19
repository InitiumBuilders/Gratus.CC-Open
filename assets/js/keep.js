// THE KEEP · recordings stay on this device, in IndexedDB, keyed by the entry they belong to.
// Nothing here is sent anywhere. Clearing site data clears the keep.
const NAME = 'gratus-keep', STORE = 'voice';
function open() {
  return new Promise((ok, no) => {
    if (!('indexedDB' in window)) { no(new Error('no indexedDB')); return; }
    const r = indexedDB.open(NAME, 1);
    r.onupgradeneeded = () => { r.result.createObjectStore(STORE); };
    r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error);
  });
}
async function run(mode, fn) {
  const db = await open();
  return new Promise((ok, no) => {
    const tx = db.transaction(STORE, mode); const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => { ok(req && req.result); db.close(); };
    tx.onerror = () => { no(tx.error); db.close(); };
    tx.onabort = () => { no(tx.error); db.close(); };
  });
}
export const keepPut = (id, blob) => run('readwrite', (s) => s.put(blob, id));
export const keepGet = (id) => run('readonly', (s) => s.get(id));
export const keepDel = (id) => run('readwrite', (s) => s.delete(id));
