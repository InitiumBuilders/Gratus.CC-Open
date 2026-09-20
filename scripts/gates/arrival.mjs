// G29 · THE ARRIVAL STILL OPENS.
//
// preload="none" is a real risk to a ceremony: if the film never starts, the door never
// opens. This watches the arrival from the outside and asks whether it began and ended.
import { serve, browser, PHONE } from './lib/harness.mjs';
const srv = await serve(4505);
const base = 'http://127.0.0.1:4505';
const b = await browser();
let bad = 0;
const say = (ok, m) => { if (!ok) bad++; console.log('  ' + (ok ? 'pass  ' : 'FAIL  ') + m); };

{
  const ctx = await b.newContext(PHONE);
  const page = await ctx.newPage();
  await page.goto(base + '/', { waitUntil: 'load' });
  await page.waitForTimeout(700);
  const up = await page.evaluate(() => {
    const sp = document.getElementById('splash');
    return { shown: !!sp && !sp.hidden, video: !!(sp && sp.querySelector('video')), preload: sp && sp.querySelector('video') ? sp.querySelector('video').preload : null };
  });
  say(up.shown && up.video, 'the arrival opens  (' + JSON.stringify(up) + ')');
  // it holds for a while, then hands the page over. Five seconds is the stall path.
  await page.waitForTimeout(7000);
  const after = await page.evaluate(() => {
    const sp = document.getElementById('splash');
    return { gone: !sp || sp.hidden, text: (document.body.innerText || '').trim().length };
  });
  say(after.gone, 'and it hands the page over rather than holding it  (' + JSON.stringify(after) + ')');
  say(after.text > 400, 'the landing is readable behind it  (' + after.text + ' characters)');
  await ctx.close();
}

// and the door still works when a tap asks it to
{
  const ctx = await b.newContext(PHONE);
  const page = await ctx.newPage();
  await page.goto(base + '/', { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.evaluate(() => { const sp = document.getElementById('splash'); if (sp && sp.onclick) sp.onclick(); });
  await page.waitForTimeout(2200);
  const gone = await page.evaluate(() => { const sp = document.getElementById('splash'); return !sp || sp.hidden; });
  say(gone, 'a tap still lets you past it');
  await ctx.close();
}

await b.close();
srv.close();
console.log('G29 arrival: ' + (bad ? 'FAIL - ' + bad : 'PASS'));
process.exit(bad ? 1 : 0);
