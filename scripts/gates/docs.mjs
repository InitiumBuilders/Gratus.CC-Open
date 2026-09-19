// G19 · THE DOCS CANNOT LIE.
//
// Every file path named in a doc exists. Every internal link resolves. Every
// environment variable named in a doc is in .env.example and the other way
// round. Every fenced bash block that is marked runnable runs and exits 0.
//
// A command in a guide that does not run is a fault with better formatting.
//
// Mutant: break one command inside a doc code block, or rename a file a doc
// names. This must go red.
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const RUN = process.argv.includes('--run');

function docs(d, out = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (['node_modules', '.git', '.vercel', 'attic'].includes(e.name)) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) docs(p, out);
    else if (e.name.toLowerCase().endsWith('.md')) out.push(p);
  }
  return out;
}

let fails = 0;
const files = docs(root);

// 1 · every path named in a doc exists
const PATH_RE = /`((?:[a-zA-Z0-9_.-]+\/)+[a-zA-Z0-9_.-]+\.[a-z0-9]{1,6})`/g;
for (const f of files) {
  const rel = path.relative(root, f);
  if (/^attic\//.test(rel)) continue;
  const t = fs.readFileSync(f, 'utf8');
  const named = new Set();
  for (const m of t.matchAll(PATH_RE)) named.add(m[1]);
  for (const p of named) {
    if (/^https?:/.test(p) || p.includes('*') || p.includes('<')) continue;
    if (!fs.existsSync(path.join(root, p))) { fails++; console.log('  MISSING PATH  ' + rel + '  ->  ' + p); }
  }
}

// 2 · every internal markdown link resolves
for (const f of files) {
  const rel = path.relative(root, f);
  if (/^attic\//.test(rel)) continue;
  const t = fs.readFileSync(f, 'utf8');
  for (const m of t.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const u = m[1].split('#')[0].trim();
    if (!u || /^(https?:|mailto:|tel:)/i.test(u)) continue;
    const target = u.startsWith('/') ? path.join(root, u.slice(1)) : path.join(path.dirname(f), u);
    if (!fs.existsSync(target)) { fails++; console.log('  DEAD LINK     ' + rel + '  ->  ' + u); }
  }
}

// 3 · environment variables, both directions
const envFile = path.join(root, '.env.example');
if (!fs.existsSync(envFile)) { fails++; console.log('  MISSING       .env.example'); }
else {
  const declared = new Set(fs.readFileSync(envFile, 'utf8').split('\n')
    .map((l) => (l.match(/^\s*([A-Z][A-Z0-9_]{3,})\s*=/) || [])[1]).filter(Boolean));
  const inDocs = new Set();
  for (const f of files) for (const m of fs.readFileSync(f, 'utf8').matchAll(/`([A-Z][A-Z0-9_]{5,})`/g)) {
    if (/^(GET|POST|HTTP|JSON|HTML|MIT|SVG|PNG|API|URL|TODO|README)$/.test(m[1])) continue;
    inDocs.add(m[1]);
  }
  const code = new Set();
  const scan = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (['node_modules', '.git', '.vercel', 'attic'].includes(e.name)) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) scan(p);
    else if (/\.(m?js|sh)$/.test(e.name)) for (const m of fs.readFileSync(p, 'utf8').matchAll(/process\.env\.([A-Z][A-Z0-9_]+)/g)) code.add(m[1]);
  } };
  scan(root);
  for (const v of code) if (!declared.has(v)) { fails++; console.log('  NOT IN .env.example  ' + v + '  (read by code)'); }
  for (const v of declared) if (!code.has(v)) { fails++; console.log('  IN .env.example ONLY  ' + v + '  (read by nothing)'); }
  for (const v of inDocs) if (!declared.has(v) && code.has(v)) { fails++; console.log('  DOCUMENTED, NOT DECLARED  ' + v); }
}

// 4 · runnable blocks. Only blocks tagged ```bash gate are executed, because a
// doc also shows commands that deploy, and a gate must never deploy.
if (RUN) {
  for (const f of files) {
    const rel = path.relative(root, f);
    const t = fs.readFileSync(f, 'utf8');
    for (const m of t.matchAll(/```bash gate\n([\s\S]*?)```/g)) {
      try { execSync(m[1], { cwd: root, stdio: 'pipe', timeout: 120000 }); console.log('  ran  ' + rel); }
      catch (e) { fails++; console.log('  COMMAND FAILED  ' + rel + '  ' + m[1].trim().split('\n')[0]); }
    }
  }
} else {
  console.log('  (run with --run to execute every ```bash gate block)');
}

console.log('G19 docs: ' + (fails ? 'FAIL - ' + fails : 'PASS - ' + files.length + ' docs checked'));
process.exit(fails ? 1 : 0);
