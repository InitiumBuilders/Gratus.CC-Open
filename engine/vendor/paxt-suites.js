/* PAXT voices: checking one signed line outside Dash.

   PAXT 1 lets a Dash masternode key speak by signing one line. This file checks the same kind of line when it was
   signed by a wallet on another chain: an Ethereum account (and every chain that shares its keys), a Bitcoin-style
   address, or an ed25519 key such as a Solana account; or by a key held on a phone or computer, named with did:key
   (P-256 or Ed25519, as WebCrypto makes them). It answers one question only: did this account sign this
   exact line? How much that account's voice weighs (a balance, a list, a set of owners) is a separate reading and
   is not in this file.

   Verification only. Nothing here makes a key, holds a key or signs. No dependencies; it needs the global WebCrypto
   that every browser and Node 20 or later has (Node 18 only with --experimental-global-webcrypto). The arithmetic is
   written to be read, not to be fast or secret: every input is public, so
   nothing needs to run in constant time. Each suite has ONE accepted form for an account, so two people who count
   the same record always get the same answer. (A Bitcoin-style signature can carry more than one header byte; a
   count that goes by key, keyOfAccount below, is unchanged by that.) Every input must be text: anything else is
   refused, because a record read from JSON could otherwise pass a list where an address belongs.
   Tests: node suites.test.mjs

   A draft beside PAXT 1 (../paxt.mjs), which stays as it is. The names PAXT and Dash PAXT are August's. */

/* ------------------------------------------------------------------ bytes */

const te = new TextEncoder();
export const utf8 = (s) => te.encode(String(s));
export function toHex(bytes) { let s = ''; for (const b of bytes) s += b.toString(16).padStart(2, '0'); return s; }
export function fromHex(s) {
  if (typeof s !== 'string' || s.length % 2 || /[^0-9a-fA-F]/.test(s)) return null;
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
  return out;
}
export function cat(...parts) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
const beInt = (bytes) => (bytes.length ? BigInt('0x' + toHex(bytes)) : 0n);
const leInt = (bytes) => beInt(Uint8Array.from(bytes).reverse());
const be32 = (n) => fromHex(n.toString(16).padStart(64, '0'));

const B64 = /^[A-Za-z0-9+/]+={0,2}$/;
export function fromBase64(s) {
  if (typeof s !== 'string' || s.length % 4 || !B64.test(s)) return null;
  const bin = atob(s);
  const out = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  /* one accepted form: the standard alphabet with its padding, and no stray bits */
  return toBase64(out) === s ? out : null;
}
export function toBase64(bytes) { let bin = ''; for (const b of bytes) bin += String.fromCharCode(b); return btoa(bin); }

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
/* Everything decoded here is short (a key, an address, a signature). The arithmetic grows with the square of the
   length, so a text longer than 128 characters is refused before it starts. */
export function base58Decode(s) {
  if (typeof s !== 'string' || !s.length || s.length > 128) return null;
  let n = 0n;
  for (const c of s) { const d = B58.indexOf(c); if (d < 0) return null; n = n * 58n + BigInt(d); }
  let h = n.toString(16); if (h.length % 2) h = '0' + h;
  const body = n === 0n ? new Uint8Array(0) : fromHex(h);
  let zeros = 0; while (zeros < s.length && s[zeros] === '1') zeros++;
  return cat(new Uint8Array(zeros), body);
}
export function base58Encode(bytes) {
  let n = beInt(bytes), s = '';
  while (n > 0n) { s = B58[Number(n % 58n)] + s; n /= 58n; }
  for (const b of bytes) { if (b !== 0) break; s = '1' + s; }
  return s;
}

/* ------------------------------------------------------------------ hashes */

export async function sha256(bytes) { return new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytes)); }
async function sha512(bytes) { return new Uint8Array(await globalThis.crypto.subtle.digest('SHA-512', bytes)); }

/* Keccak-f[1600], 64-bit lanes as BigInt. Ethereum hashes with the original Keccak padding (0x01); the SHA-3
   standard uses 0x06. Both are here so the tests can hold the permutation to a native SHA-3. */
const M64 = (1n << 64n) - 1n;
const RC = [0x0000000000000001n, 0x0000000000008082n, 0x800000000000808an, 0x8000000080008000n, 0x000000000000808bn,
  0x0000000080000001n, 0x8000000080008081n, 0x8000000000008009n, 0x000000000000008an, 0x0000000000000088n,
  0x0000000080008009n, 0x000000008000000an, 0x000000008000808bn, 0x800000000000008bn, 0x8000000000008089n,
  0x8000000000008003n, 0x8000000000008002n, 0x8000000000000080n, 0x000000000000800an, 0x800000008000000an,
  0x8000000080008081n, 0x8000000000008080n, 0x0000000080000001n, 0x8000000080008008n];
const ROT = [[0, 36, 3, 41, 18], [1, 44, 10, 45, 2], [62, 6, 43, 15, 61], [28, 55, 25, 21, 56], [27, 20, 39, 8, 14]];
const rotl64 = (x, n) => (n === 0 ? x : ((x << BigInt(n)) | (x >> BigInt(64 - n))) & M64);
function keccakF(s) {
  for (let round = 0; round < 24; round++) {
    const C = [0, 1, 2, 3, 4].map((x) => s[x] ^ s[x + 5] ^ s[x + 10] ^ s[x + 15] ^ s[x + 20]);
    for (let x = 0; x < 5; x++) { const D = C[(x + 4) % 5] ^ rotl64(C[(x + 1) % 5], 1); for (let y = 0; y < 5; y++) s[x + 5 * y] ^= D; }
    const B = new Array(25);
    for (let x = 0; x < 5; x++) for (let y = 0; y < 5; y++) B[y + 5 * ((2 * x + 3 * y) % 5)] = rotl64(s[x + 5 * y], ROT[x][y]);
    for (let x = 0; x < 5; x++) for (let y = 0; y < 5; y++) s[x + 5 * y] = B[x + 5 * y] ^ ((~B[((x + 1) % 5) + 5 * y] & M64) & B[((x + 2) % 5) + 5 * y]);
    s[0] ^= RC[round];
  }
}
function sponge256(bytes, pad) {
  const rate = 136, s = new Array(25).fill(0n);
  const padded = new Uint8Array(Math.ceil((bytes.length + 1) / rate) * rate);
  padded.set(bytes); padded[bytes.length] = pad; padded[padded.length - 1] |= 0x80;
  for (let off = 0; off < padded.length; off += rate) {
    for (let i = 0; i < rate / 8; i++) { let w = 0n; for (let j = 7; j >= 0; j--) w = (w << 8n) | BigInt(padded[off + i * 8 + j]); s[i] ^= w; }
    keccakF(s);
  }
  const out = new Uint8Array(32);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 8; j++) out[i * 8 + j] = Number((s[i] >> BigInt(8 * j)) & 0xffn);
  return out;
}
export const keccak256 = (bytes) => sponge256(bytes, 0x01);
export const sha3_256 = (bytes) => sponge256(bytes, 0x06);

/* RIPEMD-160, for Bitcoin-style addresses (an address is ripemd160(sha256(public key))). */
const RL = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 7, 4, 13, 1, 10, 6, 15, 3, 12, 0, 9, 5, 2, 14, 11, 8,
  3, 10, 14, 4, 9, 15, 8, 1, 2, 7, 0, 6, 13, 11, 5, 12, 1, 9, 11, 10, 0, 8, 12, 4, 13, 3, 7, 15, 14, 5, 6, 2,
  4, 0, 5, 9, 7, 12, 2, 10, 14, 1, 3, 8, 11, 6, 15, 13];
const RR = [5, 14, 7, 0, 9, 2, 11, 4, 13, 6, 15, 8, 1, 10, 3, 12, 6, 11, 3, 7, 0, 13, 5, 10, 14, 15, 8, 12, 4, 9, 1, 2,
  15, 5, 1, 3, 7, 14, 6, 9, 11, 8, 12, 2, 10, 0, 4, 13, 8, 6, 4, 1, 3, 11, 15, 0, 5, 12, 2, 13, 9, 7, 10, 14,
  12, 15, 10, 4, 1, 5, 8, 7, 6, 2, 13, 14, 0, 3, 9, 11];
const SL = [11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8, 7, 6, 8, 13, 11, 9, 7, 15, 7, 12, 15, 9, 11, 7, 13, 12,
  11, 13, 6, 7, 14, 9, 13, 15, 14, 8, 13, 6, 5, 12, 7, 5, 11, 12, 14, 15, 14, 15, 9, 8, 9, 14, 5, 6, 8, 6, 5, 12,
  9, 15, 5, 11, 6, 8, 13, 12, 5, 12, 13, 14, 11, 8, 5, 6];
const SR = [8, 9, 9, 11, 13, 15, 15, 5, 7, 7, 8, 11, 14, 14, 12, 6, 9, 13, 15, 7, 12, 8, 9, 11, 7, 7, 12, 7, 6, 15, 13, 11,
  9, 7, 15, 11, 8, 6, 6, 14, 12, 13, 5, 14, 13, 13, 7, 5, 15, 5, 8, 11, 14, 14, 6, 14, 6, 9, 12, 9, 12, 5, 15, 8,
  8, 5, 12, 9, 12, 5, 14, 6, 8, 13, 6, 5, 15, 13, 11, 11];
const KL = [0x00000000, 0x5a827999, 0x6ed9eba1, 0x8f1bbcdc, 0xa953fd4e];
const KR = [0x50a28be6, 0x5c4dd124, 0x6d703ef3, 0x7a6d76e9, 0x00000000];
const rotl32 = (x, n) => ((x << n) | (x >>> (32 - n))) >>> 0;
const rmdF = (j, x, y, z) => (j === 0 ? x ^ y ^ z : j === 1 ? (x & y) | (~x & z) : j === 2 ? (x | ~y) ^ z : j === 3 ? (x & z) | (y & ~z) : x ^ (y | ~z)) >>> 0;
export function ripemd160(bytes) {
  const bits = BigInt(bytes.length) * 8n;
  const padded = new Uint8Array(Math.ceil((bytes.length + 9) / 64) * 64);
  padded.set(bytes); padded[bytes.length] = 0x80;
  for (let i = 0; i < 8; i++) padded[padded.length - 8 + i] = Number((bits >> BigInt(8 * i)) & 0xffn);
  let h = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0];
  const view = new DataView(padded.buffer);
  for (let off = 0; off < padded.length; off += 64) {
    const X = []; for (let i = 0; i < 16; i++) X.push(view.getUint32(off + i * 4, true));
    let [al, bl, cl, dl, el] = h, [ar, br, cr, dr, er] = h;
    for (let j = 0; j < 80; j++) {
      const round = Math.floor(j / 16);
      let t = (rotl32((al + rmdF(round, bl, cl, dl) + X[RL[j]] + KL[round]) >>> 0, SL[j]) + el) >>> 0;
      al = el; el = dl; dl = rotl32(cl, 10); cl = bl; bl = t;
      t = (rotl32((ar + rmdF(4 - round, br, cr, dr) + X[RR[j]] + KR[round]) >>> 0, SR[j]) + er) >>> 0;
      ar = er; er = dr; dr = rotl32(cr, 10); cr = br; br = t;
    }
    const t = (h[1] + cl + dr) >>> 0;
    h = [t, (h[2] + dl + er) >>> 0, (h[3] + el + ar) >>> 0, (h[4] + al + br) >>> 0, (h[0] + bl + cr) >>> 0];
  }
  const out = new Uint8Array(20);
  const o = new DataView(out.buffer);
  h.forEach((w, i) => o.setUint32(i * 4, w, true));
  return out;
}
const hash160 = async (bytes) => ripemd160(await sha256(bytes));

/* ------------------------------------------------------------------ whole-number arithmetic */

const mod = (a, m) => { const r = a % m; return r >= 0n ? r : r + m; };
function inv(a, m) {
  let r0 = mod(a, m), r1 = m, s0 = 1n, s1 = 0n;
  while (r1 !== 0n) { const q = r0 / r1; [r0, r1] = [r1, r0 - q * r1]; [s0, s1] = [s1, s0 - q * s1]; }
  return mod(s0, m);
}
function pow(base, e, m) {
  let out = 1n, b = mod(base, m);
  while (e > 0n) { if (e & 1n) out = (out * b) % m; b = (b * b) % m; e >>= 1n; }
  return out;
}

/* ------------------------------------------------------------------ secp256k1: who signed this digest? */

const P = 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2fn;
const N = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;
const G = [0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n, 0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n];
/* a point is [x, y]; null is the point at infinity */
function add(a, b) {
  if (!a) return b;
  if (!b) return a;
  const [x1, y1] = a, [x2, y2] = b;
  let slope;
  if (x1 === x2) {
    if (mod(y1 + y2, P) === 0n) return null;
    slope = mod(3n * x1 * x1 * inv(2n * y1, P), P);
  } else slope = mod((y2 - y1) * inv(x2 - x1, P), P);
  const x3 = mod(slope * slope - x1 - x2, P);
  return [x3, mod(slope * (x1 - x3) - y1, P)];
}
function mul(k, point) {
  let out = null, q = point;
  while (k > 0n) { if (k & 1n) out = add(out, q); q = add(q, q); k >>= 1n; }
  return out;
}
/** The public key that made (r, s) over this 32-byte digest, or null. recid is 0 to 3: bit 0 is the parity of the
    signature point's y, bit 1 says its x was r + N. A signature with s in the upper half is refused: every signer
    in use writes the lower one, and accepting both would let a stranger rewrite a valid signature into a second
    valid signature for the same line. */
export function recover(digest, r, s, recid) {
  if (digest.length !== 32 || !(recid >= 0 && recid <= 3)) return null;
  if (r < 1n || r >= N || s < 1n || s > N / 2n) return null;
  const x = r + (recid >> 1 ? N : 0n);
  if (x >= P) return null;
  const y2 = mod(x * x * x + 7n, P);
  let y = pow(y2, (P + 1n) / 4n, P);
  if (mod(y * y, P) !== y2) return null;
  if (Number(y & 1n) !== (recid & 1)) y = P - y;
  const rInv = inv(r, N), e = mod(beInt(digest), N);
  /* Q = r^-1 (s R - e G) */
  return add(mul(mod(s * rInv, N), [x, y]), mul(mod(-e * rInv, N), G));
}
const pubCompressed = (q) => cat(Uint8Array.of(q[1] & 1n ? 3 : 2), be32(q[0]));
const pubUncompressed = (q) => cat(Uint8Array.of(4), be32(q[0]), be32(q[1]));
const ethAddress = (q) => '0x' + toHex(keccak256(cat(be32(q[0]), be32(q[1]))).slice(12));
/* A voice is one key in one signing format. The signed line does not name an account, so one signature answers for
   every account its key controls IN THAT FORMAT (each Ethereum chain, each address form of one Bitcoin-style
   chain); a count by key lets that voice speak once. Across formats the same key is a different voice: a wallet of
   one format can be led to sign another format's bytes shown only as hex, so a signature in one format must never
   unlock rows that belong to another. The family names: evm (EIP-191), btc ltc doge dash (each chain's signed
   message, and BIP-322 on Bitcoin), solana, ed25519-device and p256 (device keys); suite-*.mjs add near, cardano and
   cosmos. */
const NET_FAMILY = { bitcoin: 'btc', litecoin: 'ltc', dogecoin: 'doge', dash: 'dash' };
const secpName = (family, q) => family + ':' + toHex(pubCompressed(q));
/** the point of a secp256k1 key from its name (any family), or null */
function secpPoint(keyId) {
  const m = /^(?:evm|btc|ltc|doge|dash|cosmos):(0[23])([0-9a-f]{64})$/.exec(String(keyId));
  if (!m) return null;
  const x = BigInt('0x' + m[2]);
  if (x >= P) return null;
  const y2 = mod(x * x * x + 7n, P);
  let y = pow(y2, (P + 1n) / 4n, P);
  if (mod(y * y, P) !== y2) return null;
  if (Number(y & 1n) !== (m[1] === '03' ? 1 : 0)) y = P - y;
  return [x, y];
}
/** for the tests only: the curve itself, so a test can make signatures with published test keys */
export const _secp256k1 = { P, N, G, add, mul, inv, mod };

/* ------------------------------------------------------------------ suite: eip191 (Ethereum personal_sign) */

/** EIP-55: the mixed-case form of an Ethereum address, whose capitals are a checksum */
export function eip55(address) {
  const a = String(address).replace(/^0x/, '').toLowerCase();
  const h = toHex(keccak256(utf8(a)));
  let out = '0x';
  for (let i = 0; i < 40; i++) out += parseInt(h[i], 16) >= 8 ? a[i].toUpperCase() : a[i];
  return out;
}
/* what a wallet hashes when asked to sign a message: a fixed prefix, the length in bytes, then the text */
export function eip191Digest(line) {
  const text = utf8(line);
  return keccak256(cat(Uint8Array.of(0x19), utf8('Ethereum Signed Message:\n' + text.length), text));
}
const eip191 = {
  /** 0x and 40 hex. A mixed-case address must carry a correct EIP-55 checksum, so a mistyped one is caught. */
  account(input) {
    if (typeof input !== 'string') return null;
    const a = input.trim();
    if (!/^0x[0-9a-fA-F]{40}$/.test(a)) return null;
    const body = a.slice(2);
    if (body !== body.toLowerCase() && body !== body.toUpperCase() && eip55(a) !== a) return null;
    return '0x' + body.toLowerCase();
  },
  /** 0x and 130 hex: r, s, then v as 1b or 1c. A wallet that writes v as 00 or 01 is read the same way. */
  signature(input) {
    if (typeof input !== 'string') return null;
    const m = /^(?:0x)?([0-9a-fA-F]{128})([0-9a-fA-F]{2})$/.exec(input.trim());
    if (!m) return null;
    const v = parseInt(m[2], 16);
    const recid = v === 27 || v === 28 ? v - 27 : v === 0 || v === 1 ? v : -1;
    if (recid < 0) return null;
    return '0x' + m[1].toLowerCase() + (27 + recid).toString(16);
  },
  /* the point of the key that signed this line, or null */
  signerPoint(line, signature) {
    if (typeof line !== 'string' || eip191.signature(signature) !== signature) return null;
    const bytes = fromHex(signature.slice(2));
    return recover(eip191Digest(line), beInt(bytes.slice(0, 32)), beInt(bytes.slice(32, 64)), bytes[64] - 27);
  },
  /** the account that signed this line, or null */
  signer(line, signature) {
    const q = eip191.signerPoint(line, signature);
    return q ? ethAddress(q) : null;
  },
  async verify(account, line, signature) {
    return typeof account === 'string' && eip191.account(account) === account && eip191.signer(line, signature) === account;
  },
  /** the name of the key that signed, when the signature answers for this account; otherwise null */
  async key(account, line, signature) {
    return (await eip191.verify(account, line, signature)) ? secpName('evm', eip191.signerPoint(line, signature)) : null;
  },
};

/* ------------------------------------------------------------------ suite: bip137 (Bitcoin-style signed message) */

/** Chains whose wallets sign a message the Bitcoin way. Each differs only in its prefix and its address bytes.
    caip2 is the chain's name in the chain-agnostic scheme: bip122 and the first 32 hex of its first block's hash
    (each read from a public explorer on 2026-11-25). */
export const NETWORKS = {
  bitcoin: { magic: 'Bitcoin Signed Message:\n', p2pkh: 0x00, p2sh: 0x05, hrp: 'bc', caip2: 'bip122:000000000019d6689c085ae165831e93' },
  litecoin: { magic: 'Litecoin Signed Message:\n', p2pkh: 0x30, p2sh: 0x32, hrp: 'ltc', caip2: 'bip122:12a765e31ffd4059bada1e25190f6e98' },
  dogecoin: { magic: 'Dogecoin Signed Message:\n', p2pkh: 0x1e, p2sh: 0x16, hrp: null, caip2: 'bip122:1a91e3dace36e2be3bf030a65679fe82' },
  dash: { magic: 'DarkCoin Signed Message:\n', p2pkh: 0x4c, p2sh: 0x10, hrp: null, caip2: 'bip122:00000ffd590b1485b3caadc19b22e637' },
};

const B32 = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
function bech32Polymod(values) {
  const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (const v of values) {
    const top = chk >>> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) if ((top >>> i) & 1) chk ^= GEN[i];
  }
  return chk >>> 0;
}
/** { hrp, version, program } of a segwit address, or null */
export function segwitDecode(address) {
  const a = String(address ?? '');
  if (a.length < 8 || a.length > 90 || (a !== a.toLowerCase() && a !== a.toUpperCase())) return null;
  const s = a.toLowerCase(), cut = s.lastIndexOf('1');
  if (cut < 1 || cut + 7 > s.length) return null;
  const hrp = s.slice(0, cut), data = [];
  for (const c of s.slice(cut + 1)) { const d = B32.indexOf(c); if (d < 0) return null; data.push(d); }
  const expand = [...hrp].map((c) => c.charCodeAt(0) >> 5).concat([0], [...hrp].map((c) => c.charCodeAt(0) & 31));
  const sum = bech32Polymod(expand.concat(data));
  const version = data[0];
  /* version 0 uses the first checksum constant, later versions the second (BIP-350) */
  if (!(version === 0 ? sum === 1 : sum === 0x2bc830a3) || version > 16) return null;
  let acc = 0, bits = 0; const program = [];
  for (const v of data.slice(1, -6)) { acc = ((acc << 5) | v) & 0xfff; bits += 5; while (bits >= 8) { bits -= 8; program.push((acc >> bits) & 0xff); } }
  if (bits >= 5 || ((acc << (8 - bits)) & 0xff)) return null;
  if (program.length < 2 || program.length > 40 || (version === 0 && program.length !== 20 && program.length !== 32)) return null;
  return { hrp, version, program: Uint8Array.from(program) };
}
/* { type, hash } of an address on this network: p2pkh, p2sh or p2wpkh. Other kinds (taproot, script hashes behind
   segwit) come back as { type: 'other' }: they cannot be checked from a signed message of this form. */
async function addressOf(net, address) {
  const a = String(address ?? '');
  if (net.hrp) {
    const sw = segwitDecode(a);
    if (sw && sw.hrp === net.hrp) return sw.version === 0 && sw.program.length === 20 && a === a.toLowerCase() ? { type: 'p2wpkh', hash: sw.program } : { type: 'other' };
  }
  const raw = base58Decode(a);
  if (!raw || raw.length !== 25 || base58Encode(raw) !== a) return null;
  const check = (await sha256(await sha256(raw.slice(0, 21)))).slice(0, 4);
  if (!same(check, raw.slice(21))) return null;
  if (raw[0] === net.p2pkh) return { type: 'p2pkh', hash: raw.slice(1, 21) };
  if (raw[0] === net.p2sh) return { type: 'p2sh', hash: raw.slice(1, 21) };
  return null;
}
const varint = (n) => {
  if (n < 0xfd) return Uint8Array.of(n);
  if (n <= 0xffff) return Uint8Array.of(0xfd, n & 0xff, n >> 8);
  return Uint8Array.of(0xfe, n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff);
};
export async function bip137Digest(magic, line) {
  const m = utf8(magic), t = utf8(line);
  return sha256(await sha256(cat(varint(m.length), m, varint(t.length), t)));
}
function bip137(name) {
  const net = NETWORKS[name];
  if (!net) throw new Error('unknown network');
  const suite = {
    async account(input) {
      if (typeof input !== 'string') return null;
      const a = input.trim();
      if (a.length > 90) return null;
      const at = await addressOf(net, a);
      return at && at.type !== 'other' ? a : null;
    },
    /** standard base64 of 65 bytes (88 characters): a header byte from 27 to 42, then r and s */
    signature(input) {
      if (typeof input !== 'string') return null;
      const s = input.trim();
      if (s.length !== 88) return null;
      const bytes = fromBase64(s);
      return bytes && bytes.length === 65 && bytes[0] >= 27 && bytes[0] <= 42 ? s : null;
    },
    /* The header byte says which key signed (its low two bits) and whether the key is written compressed (27 to
       30: no; 31 and above: yes). BIP-137 also uses it to name the kind of address (35 to 38 a segwit key wrapped
       in a script hash, 39 to 42 a native segwit key), but wallets never agreed on that part, and strict checkers
       refused good signatures. So the rule here is the address's own: the recovered key, hashed the way that kind
       of address is made, must give the address. The header's kind is not read.
       So one signature can be written with more than one header byte. That never changes a count that goes by key. */
    async signerPoint(account, line, signature) {
      if (typeof account !== 'string' || typeof line !== 'string' || suite.signature(signature) !== signature) return null;
      const at = await addressOf(net, account);
      if (!at || at.type === 'other') return null;
      const bytes = fromBase64(signature), header = bytes[0];
      const q = recover(await bip137Digest(net.magic, line), beInt(bytes.slice(1, 33)), beInt(bytes.slice(33, 65)), (header - 27) & 3);
      if (!q) return null;
      if (at.type === 'p2pkh') return same(at.hash, await hash160(header < 31 ? pubUncompressed(q) : pubCompressed(q))) ? q : null;
      /* a segwit address is always made from a compressed key */
      if (header < 31) return null;
      const keyHash = await hash160(pubCompressed(q));
      if (at.type === 'p2wpkh') return same(at.hash, keyHash) ? q : null;
      return same(at.hash, await hash160(cat(Uint8Array.of(0x00, 0x14), keyHash))) ? q : null;
    },
    async verify(account, line, signature) {
      return (await suite.signerPoint(account, line, signature)) !== null;
    },
    /** the name of the key that signed, when the signature answers for this account; otherwise null */
    async key(account, line, signature) {
      const q = await suite.signerPoint(account, line, signature);
      return q ? secpName(NET_FAMILY[name], q) : null;
    },
  };
  return suite;
}

/* ------------------------------------------------------------------ suite: ed25519 (Solana and other ed25519 accounts) */

const EP = (1n << 255n) - 19n;
const EL = (1n << 252n) + 27742317777372353535851937790883648493n;
const ED = mod(-121665n * inv(121666n, EP), EP);
const EI = pow(2n, (EP - 1n) / 4n, EP);
/* a point is [X, Y, Z, T] in extended coordinates; the base point B and the neutral point */
const EB = [15112221349535400772501151409588531511454012693041857206046113283949847762202n, 46316835694926478169428394003475163141307993866256225615783033603165251855960n, 1n, 0n];
EB[3] = mod(EB[0] * EB[1], EP);
const E0 = [0n, 1n, 1n, 0n];
function eadd(p, q) {
  const [X1, Y1, Z1, T1] = p, [X2, Y2, Z2, T2] = q;
  const A = mod((Y1 - X1) * (Y2 - X2), EP), B = mod((Y1 + X1) * (Y2 + X2), EP);
  const C = mod(2n * ED * T1 * T2, EP), D = mod(2n * Z1 * Z2, EP);
  const E = B - A, F = D - C, H = B + A, Gq = D + C;
  return [mod(E * F, EP), mod(Gq * H, EP), mod(F * Gq, EP), mod(E * H, EP)];
}
function emul(k, point) {
  let out = E0, q = point;
  while (k > 0n) { if (k & 1n) out = eadd(out, q); q = eadd(q, q); k >>= 1n; }
  return out;
}
const eSame = (p, q) => mod(p[0] * q[2] - q[0] * p[2], EP) === 0n && mod(p[1] * q[2] - q[1] * p[2], EP) === 0n;
/* a point from its 32 bytes, or null. Only the one true spelling of a point is accepted. */
function edecode(bytes) {
  if (bytes.length !== 32) return null;
  const b = Uint8Array.from(bytes), sign = b[31] >> 7;
  b[31] &= 0x7f;
  const y = leInt(b);
  if (y >= EP) return null;
  const u = mod(y * y - 1n, EP), v = mod(ED * y * y + 1n, EP);
  let x = pow(u * inv(v, EP), (EP + 3n) / 8n, EP);
  if (mod(v * x * x - u, EP) !== 0n) x = mod(x * EI, EP);
  if (mod(v * x * x - u, EP) !== 0n) return null;
  if (x === 0n && sign) return null;
  if (Number(x & 1n) !== sign) x = EP - x;
  return [x, y, 1n, mod(x * y, EP)];
}
/** Strict ed25519 (RFC 8032, with the rules of a strict verifier): the scalar must be below the group order, both
    points must be spelled the one true way, neither may be one of the eight weak points, and both must lie in the
    prime-order group. Implementations differ on exactly these edge cases (a key with a small-order part passes a
    cofactored check and fails a plain one); taking the strictest rule means every counter agrees. */
export async function ed25519Verify(publicKey, message, signature) {
  if (!(publicKey instanceof Uint8Array) || !(signature instanceof Uint8Array) || !(message instanceof Uint8Array)) return false;
  if (publicKey.length !== 32 || signature.length !== 64) return false;
  const A = edecode(publicKey), R = edecode(signature.slice(0, 32));
  if (!A || !R) return false;
  if (eSame(emul(8n, A), E0) || eSame(emul(8n, R), E0)) return false;
  if (!eSame(emul(EL, A), E0) || !eSame(emul(EL, R), E0)) return false;
  const S = leInt(signature.slice(32));
  if (S >= EL) return false;
  const h = mod(leInt(await sha512(cat(signature.slice(0, 32), publicKey, message))), EL);
  return eSame(emul(S, EB), eadd(R, emul(h, A)));
}
/* solana-raw: the signed bytes are the line itself, as a wallet's "sign message" signs it. (A hardware wallet may
   sign Solana's off-chain message form instead, which wraps the line in a header; that is another suite.) */
const solanaRaw = {
  /** a 32-byte public key in base58, as Solana writes an account */
  account(input) {
    if (typeof input !== 'string') return null;
    const a = input.trim();
    if (a.length > 44) return null;
    const raw = base58Decode(a);
    return raw && raw.length === 32 && base58Encode(raw) === a ? a : null;
  },
  /** 64 bytes in base58. A signature pasted as base64 or hex is rewritten to base58. */
  signature(input) {
    if (typeof input !== 'string') return null;
    const s = input.trim();
    if (s.length > 130) return null;
    let raw = /^(?:0x)?[0-9a-fA-F]{128}$/.test(s) ? fromHex(s.replace(/^0x/, '')) : /[+/=]/.test(s) ? fromBase64(s) : base58Decode(s);
    if (raw && raw.length !== 64 && !/[+/=]/.test(s)) raw = fromBase64(s);
    return raw && raw.length === 64 ? base58Encode(raw) : null;
  },
  async verify(account, line, signature) {
    if (typeof line !== 'string' || solanaRaw.account(account) !== account || solanaRaw.signature(signature) !== signature) return false;
    return ed25519Verify(base58Decode(account), utf8(line), base58Decode(signature));
  },
  /** the name of the key that signed, when the signature answers for this account; otherwise null */
  async key(account, line, signature) {
    return (await solanaRaw.verify(account, line, signature)) ? 'solana:' + account : null;
  },
};

/* ------------------------------------------------------------------ suites: device keys (did:key) */

/** What a device key signs: this prefix, then the line. A key that an app also uses for something else can then
    never be led into signing a PAXT line by accident. (The wallet suites above keep their wallets' own forms.) */
export const DEVICE_PREFIX = 'PAXT Signed Line:\n';

const B64URL = /^[A-Za-z0-9_-]+$/;
/** base64url with no padding, in its one accepted form, or null */
export function fromBase64url(s) {
  if (typeof s !== 'string' || !B64URL.test(s) || s.length % 4 === 1) return null;
  return fromBase64(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4));
}
export const toBase64url = (bytes) => toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/* P-256, the curve every phone's WebCrypto has (Safari before 17 has no Ed25519 there) */
const P256 = {
  p: 0xffffffff00000001000000000000000000000000ffffffffffffffffffffffffn,
  n: 0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551n,
  b: 0x5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604bn,
};
/* the 65-byte form of a compressed P-256 key, or null when it is not a point on the curve */
function p256Uncompressed(c) {
  if (!(c instanceof Uint8Array) || c.length !== 33 || (c[0] !== 2 && c[0] !== 3)) return null;
  const { p, b } = P256, x = beInt(c.slice(1));
  if (x >= p) return null;
  const y2 = mod(x * x * x - 3n * x + b, p);
  let y = pow(y2, (p + 1n) / 4n, p);
  if (mod(y * y, p) !== y2) return null;
  if (Number(y & 1n) !== (c[0] & 1)) y = p - y;
  return cat(Uint8Array.of(4), be32(x), be32(y));
}
/* A sound Ed25519 key for an account: a canonical point that is not one of the weak points. The check that it lies
   in the prime-order group costs a full scalar multiplication, so it stays in ed25519Verify, where every signature
   meets it; a key that fails it can sit on a roll but can never speak. */
const edKeyOk = (bytes) => { const A = edecode(bytes); return !!A && !eSame(emul(8n, A), E0); };

/* A did:key address (the part after did:key:) read into its key: z, then base58 of a multicodec name and the key.
   Ed25519 is 0xed (written ed 01), P-256 is 0x1200 (written 80 24) with the key compressed. */
const DID_CODECS = { ed25519: [0xed, 0x01], p256: [0x80, 0x24] };
function didKeyOf(address) {
  if (typeof address !== 'string' || address.length < 2 || address.length > 64 || address[0] !== 'z') return null;
  const raw = base58Decode(address.slice(1));
  if (!raw || base58Encode(raw) !== address.slice(1)) return null;
  if (raw.length === 34 && raw[0] === 0xed && raw[1] === 0x01) return { kind: 'ed25519', key: raw.slice(2) };
  if (raw.length === 35 && raw[0] === 0x80 && raw[1] === 0x24) return { kind: 'p256', key: raw.slice(2) };
  return null;
}
/** the did:key address (after did:key:) of a raw key: 32 bytes for ed25519, 33 compressed bytes for p256 */
export const didKeyAddress = (kind, key) => 'z' + base58Encode(cat(Uint8Array.from(DID_CODECS[kind]), key));
/** For the signing side: a P-256 signature from WebCrypto (64 bytes, r then s) with s moved to the lower half, the one
    spelling the check accepts. WebCrypto returns either half. This rewrites a signature; it never makes one. */
export function p256LowS(sig) {
  if (!(sig instanceof Uint8Array) || sig.length !== 64) return null;
  const s = beInt(sig.slice(32));
  return s > P256.n / 2n ? cat(sig.slice(0, 32), be32(P256.n - s)) : Uint8Array.from(sig);
}
/** For the signing side: the did:key address of a P-256 public key as WebCrypto exports it ('raw', 65 bytes) */
export function p256DidKey(raw65) {
  if (!(raw65 instanceof Uint8Array) || raw65.length !== 65 || raw65[0] !== 4) return null;
  const c = cat(Uint8Array.of(raw65[64] & 1 ? 3 : 2), raw65.slice(1, 33));
  return p256Uncompressed(c) && same(p256Uncompressed(c), raw65) ? didKeyAddress('p256', c) : null;
}

function didKeySuite(kind) {
  const s = {
    /** z6Mk… for ed25519, zDn… for p256; the key must be a sound point (for ed25519, in the prime-order group) */
    account(input) {
      if (typeof input !== 'string') return null;
      const a = input.trim(), k = didKeyOf(a);
      if (!k || k.kind !== kind) return null;
      return (kind === 'ed25519' ? edKeyOk(k.key) : p256Uncompressed(k.key)) ? a : null;
    },
    /** 64 bytes in base64url with no padding (86 characters). For p256, r then s, with s in the lower half. */
    signature(input) {
      if (typeof input !== 'string') return null;
      const t = input.trim();
      if (t.length !== 86) return null;
      const raw = fromBase64url(t);
      return raw && raw.length === 64 ? t : null;
    },
    async verify(account, line, signature) {
      if (typeof line !== 'string' || s.account(account) !== account || s.signature(signature) !== signature) return false;
      const key = didKeyOf(account).key, sig = fromBase64url(signature), data = utf8(DEVICE_PREFIX + line);
      if (kind === 'ed25519') return ed25519Verify(key, data, sig);
      /* P-256 itself is checked by WebCrypto; the one-spelling rules are ours. The key is already known to be a point
         on the curve, so if WebCrypto refuses it, this runtime cannot check P-256 at all. That is an error to show,
         never a bad signature to set aside quietly: a phone and a server must not count one record two ways. */
      const r = beInt(sig.slice(0, 32)), z = beInt(sig.slice(32));
      if (r < 1n || r >= P256.n || z < 1n || z > P256.n / 2n) return false;
      const subtle = globalThis.crypto && globalThis.crypto.subtle;
      if (!subtle) throw new Error('This runtime has no WebCrypto, so it cannot check a P-256 device key.');
      let k;
      try { k = await subtle.importKey('raw', p256Uncompressed(key), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']); }
      catch (e) { throw new Error('This runtime\'s WebCrypto cannot check a P-256 device key: ' + (e && e.message ? e.message : e)); }
      return subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, k, sig, data);
    },
    /** The name of the key that signed, when the signature answers for this account; otherwise null. An Ed25519
        device key is named apart from the same key as a Solana account (ed25519-device: and ed25519:), because the
        two sign different bytes: a signature over the bare line must never unlock a device key's weight. */
    async key(account, line, signature) {
      if (!(await s.verify(account, line, signature))) return null;
      const key = didKeyOf(account).key;
      return kind === 'ed25519' ? 'ed25519-device:' + base58Encode(key) : 'p256:' + toHex(key);
    },
  };
  return s;
}
const didKeyEd25519 = didKeySuite('ed25519'), didKeyP256 = didKeySuite('p256');

/* ------------------------------------------------------------------ the suites, by name */

/** A suite by its name: eip191, solana-raw, or bip137:<network> (bitcoin, litecoin, dogecoin, dash).
    Each gives account(input) and signature(input), which return the one accepted spelling or null,
    and verify(account, line, signature), which is true only for accepted spellings and a true signature. */
export function suite(name) {
  if (name === 'eip191') return eip191;
  if (name === 'solana-raw') return solanaRaw;
  if (name === 'did-key:ed25519') return didKeyEd25519;
  if (name === 'did-key:p256') return didKeyP256;
  const m = /^bip137:([a-z]+)$/.exec(String(name));
  if (m && NETWORKS[m[1]]) return bip137(m[1]);
  return null;
}
export const SUITES = ['eip191', 'solana-raw', ...Object.keys(NETWORKS).map((n) => 'bip137:' + n), 'did-key:ed25519', 'did-key:p256'];

/** Solana mainnet's chain id. It is the only Solana reference taken: a key has the same address on every Solana
    cluster, so a second reference would give one key a second name. */
export const SOLANA = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

/** A chain-agnostic account id (CAIP-10: namespace:reference:address) read into its parts, with the suite a plain
    key on that chain signs with. An Ethereum key is the same key on every eip155 chain, so the chain number does
    not change the check; it matters only when a voice is weighed there (a count by key adds those rows together).
    Null for anything that is not text, and for an id this file cannot check. */
export function accountId(id) {
  if (typeof id !== 'string') return null;
  const m = /^([-a-z0-9]{3,8}):([-_a-zA-Z0-9]{1,32}):([-.%a-zA-Z0-9]{1,128})$/.exec(id);
  if (!m) return null;
  const [, namespace, reference, address] = m;
  const chain = namespace + ':' + reference;
  if (namespace === 'eip155') return /^[1-9][0-9]*$/.test(reference) ? { chain, address, suite: 'eip191' } : null;
  if (namespace === 'solana') return chain === SOLANA ? { chain, address, suite: 'solana-raw' } : null;
  if (namespace === 'bip122') {
    const net = Object.keys(NETWORKS).find((n) => NETWORKS[n].caip2 === chain);
    return net ? { chain, address, suite: 'bip137:' + net } : null;
  }
  /* a device key: did:key, read by the key's own kind */
  if (namespace === 'did') {
    const k = reference === 'key' ? didKeyOf(address) : null;
    return k ? { chain, address, suite: 'did-key:' + k.kind } : null;
  }
  return null;
}

/** The one accepted spelling of a chain-agnostic account id (an Ethereum address in lowercase; other addresses as
    their chain writes them), or null when this file cannot check the id. Records and rolls keep ids in this
    spelling, so one account always has one name. A checksummed Ethereum address is accepted here and rewritten. */
export async function canonicalId(id) {
  if (typeof id !== 'string') return null;
  const a = accountId(id.trim());
  const s = a && suite(a.suite);
  const address = s && (await s.account(a.address));
  return address ? a.chain + ':' + address : null;
}

/** a checker in the shape PAXT 1's count() takes: (account, line, signature) => true or false */
export function verifier(name) {
  const s = suite(name);
  if (!s) throw new Error('unknown suite: ' + name);
  return (account, line, signature) => s.verify(account, line, signature);
}

/** The same shape for a record whose entries come from several chains: each entry's account is a chain-agnostic
    id, and the id says which suite checks it. PAXT 1's count() can take this as its verify unchanged. */
export async function verifyAccount(id, line, signature) {
  if (typeof id !== 'string' || typeof line !== 'string' || typeof signature !== 'string') return false;
  const a = accountId(id);
  const s = a && suite(a.suite);
  return s ? s.verify(a.address, line, signature) : false;
}

/** The name of the key behind a signed entry (secp256k1:<compressed key in hex> or ed25519:<base58 key>), when the
    signature answers for that account; otherwise null. The line does not name an account, so one signature answers
    for every account of its key: each address form, and every eip155 chain. A count that goes by this name lets
    each key speak once (keyedBallots in roll.mjs). */
export async function keyOfAccount(id, line, signature) {
  if (typeof id !== 'string' || typeof line !== 'string' || typeof signature !== 'string') return null;
  const a = accountId(id);
  const s = a && suite(a.suite);
  return s ? s.key(a.address, line, signature) : null;
}

/** What a roll is searched for to find every row a voice controls, or null for a name that is not a voice's. Every
    kind belongs to one family, so a voice only ever reaches rows of its own signing format:
      evm                 its Ethereum address, on any eip155 chain
      <net>-h160          hash160 of its compressed and its uncompressed form: plain addresses (net: btc ltc doge dash)
      <net>-h160c         hash160 of its compressed form: native segwit addresses (btc, ltc)
      <net>-p2sh          hash160 of its segwit script: segwit wrapped in a script hash
      btc-p2tr            the x of a key with an even y: a bc1p address whose output key it is (checked by BIP-322)
      solana, edDevice    the base58 key: a Solana account, an Ed25519 device key
      p256                the compressed key in hex: a P-256 device key */
export async function keyLookups(keyId) {
  if (typeof keyId !== 'string' || keyId.length > 100) return null;
  if (keyId.startsWith('solana:')) { const k = keyId.slice(7); return solanaRaw.account(k) === k ? { solana: k } : null; }
  if (keyId.startsWith('ed25519-device:')) { const k = keyId.slice(15); return solanaRaw.account(k) === k ? { edDevice: k } : null; }
  if (keyId.startsWith('p256:')) { const h = keyId.slice(5); return /^0[23][0-9a-f]{64}$/.test(h) && p256Uncompressed(fromHex(h)) ? { p256: h } : null; }
  const family = keyId.slice(0, keyId.indexOf(':'));
  const q = family !== 'cosmos' && secpPoint(keyId);
  if (!q) return null;
  if (family === 'evm') return { evm: ethAddress(q) };
  const c = await hash160(pubCompressed(q)), u = await hash160(pubUncompressed(q));
  const out = { [family + '-h160']: [toHex(c), toHex(u)], [family + '-p2sh']: toHex(await hash160(cat(Uint8Array.of(0x00, 0x14), c))) };
  if (family === 'btc' || family === 'ltc') out[family + '-h160c'] = toHex(c);
  if (family === 'btc' && keyId[4] === '0' && keyId[5] === '2') out['btc-p2tr'] = keyId.slice(6);
  return out;
}

/** true for the 66-hex compressed form of a point on secp256k1 (for suites in other files that name such keys) */
export const secpKeyOk = (hex) => typeof hex === 'string' && secpPoint('evm:' + hex) !== null;

/** Where a roll row's account sits in that search: { kind, value }, or null. The id is taken as already checked
    (readRoll checks every row). */
export function rowLookup(id) {
  const a = accountId(id);
  if (!a) return null;
  if (a.suite === 'eip191') return { kind: 'evm', value: a.address };
  if (a.suite === 'solana-raw') return { kind: 'solana', value: a.address };
  if (a.suite === 'did-key:ed25519') return { kind: 'edDevice', value: base58Encode(didKeyOf(a.address).key) };
  if (a.suite === 'did-key:p256') return { kind: 'p256', value: toHex(didKeyOf(a.address).key) };
  const name = a.suite.slice('bip137:'.length), net = NETWORKS[name], family = NET_FAMILY[name];
  if (net.hrp) {
    const sw = segwitDecode(a.address);
    if (sw && sw.hrp === net.hrp) {
      if (sw.version === 0 && sw.program.length === 20) return { kind: family + '-h160c', value: toHex(sw.program) };
      if (sw.version === 1 && sw.program.length === 32 && family === 'btc') return { kind: 'btc-p2tr', value: toHex(sw.program) };
      return null;
    }
  }
  const raw = base58Decode(a.address);
  if (!raw || raw.length !== 25) return null;
  if (raw[0] === net.p2pkh) return { kind: family + '-h160', value: toHex(raw.slice(1, 21)) };
  if (raw[0] === net.p2sh) return { kind: family + '-p2sh', value: toHex(raw.slice(1, 21)) };
  return null;
}
