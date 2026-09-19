// G27 · THE STEWARD'S WALK. A browser runs the files and taps the claim.
//
// A walk over the surfaces this checkpoint touched, looking for the kind of fault that
// only shows up once a browser runs the file: a name that is not defined, a module that
// will not parse, a handler that throws on the first tap.
//
// The first version of this walk passed while every app view showed 56 characters,
// because the doorway ceremony was still on the screen and 56 characters cleared the
// floor it was checking. A floor low enough for the splash to pass is not a floor. It
// goes in through the same door the other gates use, and asks for real text.
import { serve, browser, PHONE, open } from './lib/harness.mjs';

const PORT = 4483;
const srv = await serve(PORT);
const base = 'http://127.0.0.1:' + PORT;
const b = await browser();
let bad = 0;
const say = (ok, msg) => { if (!ok) bad++; console.log('  ' + (ok ? 'pass  ' : 'FAIL  ') + msg); };

const ROUTES = ['/app', '/app/grow', '/app/give', '/app/giveth', '/app/vibes', '/app/guides', '/p/tree'];
for (const route of ROUTES) {
  const o = await open(b, base, route);
  const errs = [];
  o.page.on('pageerror', (e) => errs.push('throw: ' + String(e.message).slice(0, 120)));
  o.page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 120)); });
  await o.page.waitForTimeout(500);
  const real = errs.filter((e) => !/Failed to load resource|net::ERR|status of 40|status of 50/i.test(e));
  const body = await o.page.evaluate(() => (document.body.innerText || '').trim().length);
  say(real.length === 0 && body > 200, route.padEnd(13) + ' text ' + String(body).padStart(5) + (real.length ? '  ' + real.slice(0, 2).join(' | ') : ''));
  await o.close();
}

// The landing, which now loads its choreography from a file instead of carrying it.
{
  const ctx = await b.newContext(PHONE);
  const page = await ctx.newPage();
  const thrown = [];
  page.on('pageerror', (e) => thrown.push(String(e.message).slice(0, 140)));
  await page.goto(base + '/', { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  const state = await page.evaluate(() => ({
    anim: document.documentElement.classList.contains('anim'),
    landed: [...document.querySelectorAll('.hs, .line, .act')].filter((e) => e.classList.contains('on')).length,
    text: (document.body.innerText || '').trim().length,
  }));
  say(!thrown.length, 'the landing script throws nothing' + (thrown.length ? ' (' + thrown[0] + ')' : ''));
  say(state.text > 400, 'the landing still reads  (' + state.text + ' characters)');
  say(state.anim, 'and the choreography still arms itself from its own file');
  await ctx.close();
}

// The claim, tapped for real on the console that carries it.
{
  const o = await open(b, base, '/app/giveth');
  const thrown = [];
  o.page.on('pageerror', (e) => thrown.push(String(e.message).slice(0, 140)));
  let asked = null;
  await o.page.route('**/api/trace', async (r) => {
    const body = JSON.parse(r.request().postData() || '{}');
    if (body.act === 'claim') { asked = body; await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ step: 'prove', project: 'Tree Project', code: 'gratus-abc123', secret: 's3cr3t' }) }); return; }
    await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ project: 'tree', claimed: false, seeds: [], signal: null }) });
  });
  // the console is behind "I run a project", which is where a steward comes in
  await o.page.evaluate(() => {
    const door = [...document.querySelectorAll('button, a')].find((x) => /I run a project/i.test(x.textContent || ''));
    if (door) door.click();
  });
  await o.page.waitForTimeout(900);
  const where = await o.page.evaluate(() => {
    const el = [...document.querySelectorAll('button, a')].find((x) => /claim/i.test(x.textContent || ''));
    return el ? { text: el.textContent.trim().slice(0, 40), id: el.id || '' } : null;
  });
  if (!where) {
    // the console may live behind a control on this view; find it and say so rather than
    // reporting a pass for a button that was never on the screen
    const controls = await o.page.evaluate(() => [...document.querySelectorAll('button, a')].map((x) => (x.textContent || '').trim().slice(0, 24)).filter(Boolean).slice(0, 24));
    say(false, 'a claim control is on /app/giveth  (found: ' + controls.join(' / ') + ')');
  } else {
    await o.page.evaluate(() => {
      const inp = [...document.querySelectorAll('input')].find((x) => /slug|project/i.test(x.id + ' ' + x.placeholder));
      if (inp) { inp.value = 'tree'; inp.dispatchEvent(new Event('input', { bubbles: true })); }
      const el = [...document.querySelectorAll('button, a')].find((x) => /claim/i.test(x.textContent || ''));
      el.click();
    });
    await o.page.waitForTimeout(1200);
    const text = await o.page.evaluate(() => document.body.innerText || '');
    say(!thrown.length, 'the claim button throws nothing' + (thrown.length ? ' (' + thrown[0] + ')' : ''));
    say(!!asked && asked.act === 'claim', 'tapping "' + where.text + '" asks the trace for a code');
    say(/gratus-abc123/.test(text), 'and the code to paste is put in front of the person');
    say(!/^[\s\S]*your project key/i.test(text) || /show it is yours/i.test(text), 'no key is handed over at this step');
  }
  await o.close();
}

await b.close();
srv.close();
console.log('G27 steward: ' + (bad ? 'FAIL - ' + bad : 'PASS'));
process.exit(bad ? 1 : 0);
