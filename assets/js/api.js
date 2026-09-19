// The thin door to the server. Everything here is optional: the app runs whole without it.
// Journal text never passes through this file.
export const API = {
  token() { try { return localStorage.getItem('gratus.token') || ''; } catch (e) { return ''; } },
  setToken(t) { try { if (t) localStorage.setItem('gratus.token', t); else localStorage.removeItem('gratus.token'); } catch (e) {} },
  async call(path, body, opts) {
    const o = opts || {};
    const headers = { 'content-type': 'application/json' };
    const tok = this.token(); if (tok) headers.authorization = 'Bearer ' + tok;
    const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), o.timeout || 9000);
    try {
      const r = await fetch('/api/' + path, { method: body ? 'POST' : 'GET', headers, body: body ? JSON.stringify(body) : undefined, signal: ctrl.signal, cache: 'no-store' });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return { ok: false, status: r.status, error: j.error || ('http ' + r.status), data: j };
      return Object.assign({ ok: true }, j);
    } catch (e) { return { ok: false, offline: true, error: String(e && e.message || e) }; }
    finally { clearTimeout(timer); }
  },
  get(path) { return this.call(path); },
  post(path, body) { return this.call(path, body || {}); }
};
