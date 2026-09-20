// The reading pages carry one live list: the partners, read from the same file the app
// reads, so the story and the product can never disagree about who they are.
const slot = document.getElementById('partners');
if (slot) {
  fetch('/config/partners.json?v=18').then((r) => r.json()).then((d) => {
    slot.innerHTML = (d.partners || []).map((p) =>
      '<a class="card" href="' + p.url + '" style="text-decoration:none;display:block">' +
      '<h3>' + p.name + '</h3><p class="kick">' + p.role + '</p><p>' + p.what + '</p></a>').join('');
  }).catch(() => { slot.innerHTML = '<p>Giveth.IO &middot; Intuition.Systems &middot; Dash.org &middot; Outlier.Systems</p>'; });
}
