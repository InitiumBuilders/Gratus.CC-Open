// THE VAULT, SEALED ON THIS DEVICE.
//
// The password never leaves. It derives an AES-GCM key here, with PBKDF2 and a quarter of
// a million rounds, and the garden is encrypted here before anything is sent. What the
// server receives is a box it has no key to, which is the only way an account and the
// promise on every page of this site can both be true at once.
//
// Losing the password loses the vault. There is no reset, because a reset anybody here
// could perform is a door anybody here could be made to open. The app says so at signup.

const KDF = { name: 'PBKDF2', hash: 'SHA-256', iterations: 250000 };
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function keyFrom(password, saltB64) {
  const salt = unb64(saltB64);
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ ...KDF, salt }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function seal(password, garden) {
  const salt = b64(crypto.getRandomValues(new Uint8Array(16)));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await keyFrom(password, salt);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key,
    new TextEncoder().encode(JSON.stringify(garden)));
  return { ct: b64(ct), iv: b64(iv), kdf: { salt, iterations: KDF.iterations, hash: 'SHA-256' } };
}

export async function unseal(password, vault) {
  const key = await keyFrom(password, vault.kdf.salt);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(vault.iv) }, key, unb64(vault.ct));
  return JSON.parse(new TextDecoder().decode(plain));
}

const API = '/api/account';
async function ask(body) {
  const r = await fetch(API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'that did not work');
  return d;
}

const TK = 'gratus.account.token';
export const token = () => { try { return localStorage.getItem(TK) || ''; } catch (e) { return ''; } };
export const setToken = (t) => { try { t ? localStorage.setItem(TK, t) : localStorage.removeItem(TK); } catch (e) {} };
export const signedIn = () => !!token();

export const signUp = (email, password, handle, name) =>
  ask({ act: 'signup', email, password, handle, name }).then((d) => { setToken(d.token); return d; });
export const signIn = (email, password) =>
  ask({ act: 'signin', email, password }).then((d) => { setToken(d.token); return d; });
export const signOut = () => setToken('');
export const me = () => ask({ act: 'me', token: token() });
export const handleFree = (handle) => ask({ act: 'handle-free', handle });
export const setProfile = (p) => ask(Object.assign({ act: 'profile', token: token() }, p));

export async function saveVault(password, garden) {
  const vault = await seal(password, garden);
  return ask({ act: 'save', token: token(), vault });
}
export async function loadVault(password) {
  const d = await ask({ act: 'load', token: token() });
  return unseal(password, d.vault);
}
