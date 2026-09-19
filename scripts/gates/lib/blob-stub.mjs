// A Vercel Blob that lives in memory.
//
// The auth gates call the real API handlers and assert what they answer. Without
// this they would need a deployment, a token and a network, and a gate that needs
// those is a gate nobody runs. With it they exercise the handler's own logic and
// nothing leaves the machine.
const MEM = new Map();

export async function put(pathname, body, opts = {}) {
  MEM.set(pathname, String(body));
  return { pathname, url: 'memory://' + pathname, downloadUrl: 'memory://' + pathname };
}
export async function list({ prefix } = {}) {
  const blobs = [...MEM.keys()].filter((k) => !prefix || k.startsWith(prefix))
    .map((k) => ({ pathname: k, url: 'memory://' + k, size: MEM.get(k).length }));
  return { blobs };
}
export async function del(p) { MEM.delete(p); }
export async function head(p) { return MEM.has(p) ? { pathname: p } : null; }
export const __MEM = MEM;

// the handlers read a blob back over fetch, so memory:// has to answer
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  const u = String(url);
  if (u.startsWith('memory://')) {
    const key = u.slice('memory://'.length).split('?')[0];
    if (!MEM.has(key)) return { ok: false, status: 404, json: async () => ({}) };
    const body = MEM.get(key);
    return { ok: true, status: 200, json: async () => JSON.parse(body), text: async () => body };
  }
  // a gate must never reach the internet: anything else is refused out loud
  if (/^https?:/i.test(u)) {
    return { ok: false, status: 599, json: async () => ({ error: 'the gate blocked an outbound request to ' + u.slice(0, 60) }) };
  }
  return realFetch(url, init);
};
