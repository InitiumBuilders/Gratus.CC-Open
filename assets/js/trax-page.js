// THE TRAX PAGE.
// It lived inside trax.html until the content policy refused to run it there,
// which it had been doing on the live site. Scripts come from files.
const N = (n) => (n == null ? '·' : String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','));
let data = null, win = 'today';
const draw = () => {
  if (!data) return;
  const w = (data.windows || {})[win] || {};
  document.getElementById('nums').innerHTML = [
    [N(w.views), 'Views'], [N(w.people), 'People'], [w.hours == null ? '·' : w.hours, 'Hours in the app'],
    [N(w.gifts), 'Gifts wrapped'], [N(w.planted), 'Gifts planted'], [N(w.seeds), 'Seeds planted'],
    [N(w.days), 'Days of care'], [N(data.growing), 'Out there growing'],
  ].map(([v, k]) => '<div class="num"><b>' + v + '</b><span>' + k + '</span></div>').join('');
  document.getElementById('note').textContent =
    'Counted across ' + N(data.counted) + ' days' + (data.since ? ', since ' + data.since : '') + '.';
};
fetch('/api/trax').then((r) => r.json()).then((d) => {
  if (d.error) { document.getElementById('note').textContent = d.error; return; }
  data = d; draw();
  const days = d.daily || [];
  const top = Math.max(1, ...days.map((x) => x.views));
  document.getElementById('spark').innerHTML = days.map((x) =>
    '<i style="height:' + Math.max(3, Math.round(x.views / top * 100)) + '%" title="' + x.day + ': ' + x.views + '"></i>').join('');
  document.getElementById('range').textContent = days.length
    ? days[0].day + ' to ' + days[days.length - 1].day
    : 'Nothing counted yet. The first view lands the first bar.';
  document.getElementById('acct').innerHTML = d.accounts == null
    ? '<div class="num"><b>\u00b7</b><span>Gratus accounts could not be counted</span></div>'
    : '<div class="num"><b>' + N(d.accounts) + (d.accountsMore ? '+' : '') + '</b><span>Gratus accounts, all time</span></div>';
  document.getElementById('not').innerHTML = Object.entries(d.notMeasured || {})
    .map(([k, v]) => '<li><b>' + k + '</b>: ' + v + '</li>').join('');
}).catch(() => { document.getElementById('note').textContent = 'Trax could not be reached.'; });
document.getElementById('win').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  win = b.dataset.w;
  [...document.querySelectorAll('#win button')].forEach((x) => x.classList.toggle('on', x === b));
  draw();
});
