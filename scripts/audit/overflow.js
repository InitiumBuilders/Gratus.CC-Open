// THE OVERFLOW AUDIT · paste this into the console on any Gratus page, at any width.
//
// The law it enforces: a grid or flex child that holds text needs `min-width: 0`,
// or it refuses to shrink and widens the whole document. Three separate bugs in
// v17 were this one shape, and each looked different on the screen.
//
// It measures ELEMENTS against clientWidth, not the document's scrollWidth,
// because `html { overflow-x: clip }` makes the document width always agree with
// itself. A net that hides the reading would make the reading useless.
//
// The culprit is the element whose right edge is past the viewport while its
// parent's is not. Parents that scroll sideways on purpose are skipped, and so
// are fixed layers, which are one viewport width by definition and include the
// scrollbar gutter.
(() => {
  const d = document.documentElement, w = d.clientWidth, out = [];
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.position === 'fixed' || cs.display === 'none') continue;
    const r = el.getBoundingClientRect();
    if (r.right <= w + 1 && r.left >= -1) continue;
    const p = el.parentElement;
    if (!p) continue;
    const pr = p.getBoundingClientRect();
    if (pr.right > w + 1) continue;                       // the parent is already guilty
    if (/auto|scroll/.test(getComputedStyle(p).overflowX)) continue;  // scrolls on purpose
    out.push({
      el: el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).trim().replace(/\s+/g, '.') : ''),
      right: Math.round(r.right), over: Math.round(r.right - w), minWidth: cs.minWidth,
    });
  }
  console.log('viewport', w, '· document', d.scrollWidth, '· culprits', out.length);
  if (out.length) console.table(out); else console.log('clean');
  return out;
})();
