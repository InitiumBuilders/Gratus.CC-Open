#!/usr/bin/env node
// The open-source gate. Nothing private leaves this tree.
// Usage:  node scripts/gates/open-source.mjs [dir]          → scans, prints every hit, exits 1 on any
//         node scripts/gates/open-source.mjs [dir] --decoy  → plants one decoy per rule, proves each rule fires, removes them
// Rules are taught shapes. A new kind of secret needs a new rule AND a new decoy.
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, relative, extname, basename } from 'node:path';

const ROOT = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : process.cwd();
const DECOY = process.argv.includes('--decoy');
const SKIP_DIRS = new Set(['.git', 'node_modules', '.vercel']);
const BINARY = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico', '.mp4', '.mp3', '.wav', '.woff', '.woff2', '.ttf', '.pdf', '.zip']);
const SELF = 'scripts/gates/open-source.mjs';

// [name, regex, decoy line]
const RULES = [
  ['vercel blob token', /vercel_blob_rw_[A-Za-z0-9_]{10,}/, 'BLOB_READ_WRITE_TOKEN=vercel_blob_rw_DECOYDECOYDECOYDECOY'],
  ['openai style key', /\bsk-[A-Za-z0-9_-]{20,}/, 'key = "sk-DECOYDECOYDECOYDECOYDECOY"'],
  ['github token', /\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}/, 'token: ghp_DECOYDECOYDECOYDECOYDECOYDEC'],
  ['aws access key', /\bAKIA[0-9A-Z]{16}\b/, 'aws_access_key_id = AKIADECOYDECOYDECOY1'],
  ['private key block', /-----BEGIN [A-Z ]*PRIVATE KEY-----/, '-----BEGIN RSA PRIVATE KEY-----'],
  ['slack token', /\bxox[bpsa]-[A-Za-z0-9-]{10,}/, 'slack = xoxb-DECOYDECOYDECOY-1'],
  ['jwt', /\beyJ[A-Za-z0-9_-]{16,}\.eyJ[A-Za-z0-9_-]{16,}/, 'jwt eyJDECOYDECOYDECOYDECOY.eyJDECOYDECOYDECOYDECOY.sig'],
  ['anthropic key', /\bsk-ant-[A-Za-z0-9_-]{10,}/, 'ANTHROPIC_API_KEY=sk-ant-DECOYDECOYDECOY'],
  ['elevenlabs key', /\bsk_[a-f0-9]{32,}\b/, 'ELEVENLABS_API_KEY=sk_0123456789abcdef0123456789abcdef01234567'],
  ['private relay name', /[Ss]emble[ -]?[Cc]ortex/, 'relay: SembleCortex'],
  ['tailscale funnel host', /[a-z0-9-]+\.ts\.net\b/, 'https://decoy-host.ts.net/oc'],
  ['personal home path', /\/home\/[a-z][a-z0-9_-]*\/|Users[\\/]Initi/, 'cd /home/initium/hermes-workspace'],
  ['vercel project or team id', /\b(prj|team)_[A-Za-z0-9]{12,}\b/, '"projectId": "prj_DECOYDECOYDECOY12"'],
  ['personal email', /[A-Za-z0-9._%+-]+@(gmail|googlemail|outlook|hotmail|proton|protonmail|yahoo|icloud|me)\.[a-z]{2,}/i, 'contact augustdecoy@gmail.com'],
  ['secret assignment', /(TOKEN|SECRET|PASSWORD|PASSPHRASE|API_KEY)\s*[:=]\s*["'][^"'\s]{12,}["']/, 'const SECRET = "decoydecoydecoy123"'],
];
const FORBIDDEN_FILES = [/^\.env(\..*)?$/, /^\.vercel$/];
// .env.example is the one file in that family a public repository should carry: it is how
// somebody cloning this knows which secrets the code expects. It is allowed only while it
// holds no values, which is a thing this gate can check rather than a filename it has to
// trust. The docs gate requires the file; this one decides what may be in it.
const envExampleIsSafe = (text) => !String(text).split('\n')
  .some((l) => /^\s*[A-Z][A-Z0-9_]*\s*=\s*\S/.test(l));

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name); const rel = relative(ROOT, p).split('\\').join('/');
    if (FORBIDDEN_FILES.some((r) => r.test(name))) { out.push({ forbidden: rel }); continue; }
    if (SKIP_DIRS.has(name)) continue;
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (!BINARY.has(extname(name).toLowerCase()) && rel !== SELF && st.size < 4_000_000) out.push({ file: p, rel });
  }
  return out;
}

function scan() {
  const hits = []; const fired = new Set();
  for (const e of walk(ROOT)) {
    if (e.forbidden) {
      if (basename(e.forbidden) === '.env.example') {
        let text = null;
        try { text = readFileSync(join(ROOT, e.forbidden), 'utf8'); } catch (err) { text = null; }
        if (text === null) { hits.push(`${e.forbidden}: could not be opened, so it has not been cleared`); fired.add('env.example unreadable'); continue; }
        if (envExampleIsSafe(text)) continue;
        hits.push(`${e.forbidden}: a value is filled in; this file carries names only`); fired.add('env.example with a value'); continue;
      }
      hits.push(`${e.forbidden}: forbidden file (env or vercel state)`); fired.add('forbidden file'); continue;
    }
    const lines = readFileSync(e.file, 'utf8').split('\n');
    lines.forEach((line, i) => { for (const [name, re] of RULES) if (re.test(line)) { hits.push(`${e.rel}:${i + 1}: ${name} · ${line.trim().slice(0, 90)}`); fired.add(name); } });
  }
  return { hits, fired };
}

if (DECOY) {
  const dir = join(ROOT, '.decoys'); mkdirSync(dir, { recursive: true });
  RULES.forEach(([name, , decoy], i) => writeFileSync(join(dir, `decoy-${i}.txt`), decoy + '\n'));
  writeFileSync(join(ROOT, '.env.decoy'), 'X=1\n');
  const realExample = existsSync(join(ROOT, '.env.example')) ? readFileSync(join(ROOT, '.env.example'), 'utf8') : null;
  writeFileSync(join(ROOT, '.env.example'), '# a decoy\nGRATUS_SALT=this-is-a-real-looking-secret\n');
  const { fired } = scan();
  if (realExample === null) rmSync(join(ROOT, '.env.example'), { force: true });
  else writeFileSync(join(ROOT, '.env.example'), realExample);
  // and now the other half: the real file, which holds names only, must pass
  const after = scan().hits.filter((h) => h.includes('.env.example'));
  rmSync(dir, { recursive: true, force: true }); rmSync(join(ROOT, '.env.decoy'), { force: true });
  if (realExample !== null && after.length) {
    console.log('open-source gate DECOY TEST: FAIL \u00b7 the real .env.example is being blocked: ' + after[0]);
    process.exit(1);
  }
  const missed = RULES.map(([n]) => n).concat(['forbidden file', 'env.example with a value']).filter((n) => !fired.has(n));
  if (missed.length) { console.log('open-source gate DECOY TEST: FAIL · rules that did not fire:', missed.join(', ')); process.exit(1); }
  console.log(`open-source gate DECOY TEST: PASS · ${RULES.length + 2} rules, every decoy caught`);
  process.exit(0);
}

const { hits } = scan();
for (const h of hits) console.log('  BLOCK', h);
console.log(`open-source gate: ${hits.length} hit${hits.length === 1 ? '' : 's'} in ${relative(process.cwd(), ROOT) || '.'}`);
console.log(hits.length ? 'OPEN-SOURCE GATE: BLOCK' : 'OPEN-SOURCE GATE: PASS');
process.exit(hits.length ? 1 : 0);
