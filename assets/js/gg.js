// A GRATUS PAGE, at /gg/<handle>.
// It lived inside gg.html until the content policy refused to run it there,
// which it had been doing on the live site. Scripts come from files.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Somebody sends a link with their name capitalised, because that is how a name is
// written. A handle is one case underneath.
const handle = decodeURIComponent(location.pathname.split('/').filter(Boolean)[1] || '').toLowerCase();
const page = document.getElementById('page');
const N = (n) => String(n || 0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
if (!handle) {
  page.innerHTML = '<div class="none"><h1>A Gratus page</h1><p>Every Gratus account has one. <a href="/app">Make yours</a>.</p></div>';
} else {
  document.title = '@' + handle + ' \u00b7 Gratus.CC';
  fetch('/api/account?handle=' + encodeURIComponent(handle)).then((r) => r.json()).then((d) => {
    if (!d.profile) {
      page.innerHTML = '<div class="none"><h1>Nothing here yet</h1><p>There is no public page at that handle. It may be private, or it may be free.</p><p><a href="/app">Grow your own garden</a></p></div>';
      return;
    }
    const p = d.profile, g = p.garden || {};
    page.innerHTML =
      '<div class="who"><img class="mark" src="/assets/art/gfx/logo.webp" alt="">' +
      '<h1>' + esc(p.name) + '</h1><p class="at">@' + esc(p.handle) + '</p>' +
      (p.line ? '<p class="line">' + esc(p.line) + '</p>' : '') +
      (p.since ? '<p class="kick" style="margin-top:14px">Growing since ' + esc(p.since) + '</p>' : '') + '</div>' +
      '<div class="shape"><div><b>' + N(g.plants) + '</b><span>Growing</span></div>' +
      '<div><b>' + N(g.days) + '</b><span>Days of care</span></div>' +
      '<div><b>' + N(g.ready) + '</b><span>Ready to give</span></div></div>' +
      ((g.faces || []).length ? '<div class="faces">' + g.faces.map((f) => '<i>' + esc(f) + '</i>').join('') + '</div>' : '') +
      '<p class="kick" style="text-align:center">The shape of a garden. Never a word of what is written in it.</p>' +
      '<p style="text-align:center;margin-top:30px"><a class="pill" href="/app" style="display:inline-flex">Grow your own</a></p>';
  }).catch(() => { page.innerHTML = '<div class="none"><h1>Could not read that page</h1><p><a href="/app">Open the app</a></p></div>'; });
}
