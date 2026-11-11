/* SJ homepage v4 (Off Leesh, Nov 2026): best-seller tabs, best-selling swap for rows, quick add for gift cards. */
(function () {
  'use strict';
  var root = document.querySelector('[data-sjh]'); if (!root) return;
  var cache = {};
  function row(h) {
    return cache[h] || (cache[h] = fetch('/collections/' + h + '?sort_by=best-selling&section_id=sj-card-row')
      .then(function (r) { return r.ok ? r.text() : ''; })
      .then(function (t) { var d = new DOMParser().parseFromString(t, 'text/html'); var u = d.querySelector('.sjh-cards'); return u ? u.innerHTML : ''; }));
  }
  function fill(list, h) {
    list.setAttribute('aria-busy', 'true');
    return row(h).then(function (html) { if (html) list.innerHTML = html; list.removeAttribute('aria-busy'); });
  }
  /* rows whose collection is not sorted by best selling by default get the best-selling list after load */
  root.querySelectorAll('[data-sjh-swap]').forEach(function (l) { fill(l, l.dataset.sjhSwap); });

  /* best seller tabs (arrow keys move between tabs) */
  var tabs = [].slice.call(root.querySelectorAll('[data-sjh-tab]')), panel = root.querySelector('#sjh-best-panel'), all = root.querySelector('[data-sjh-all]');
  function pick(t, focus) {
    tabs.forEach(function (x) { var on = x === t; x.setAttribute('aria-selected', on ? 'true' : 'false'); x.tabIndex = on ? 0 : -1; });
    panel.setAttribute('aria-labelledby', t.id); if (focus) t.focus();
    fill(panel, t.dataset.sjhTab);
    if (all) { all.href = '/collections/' + t.dataset.sjhTab + '?sort_by=best-selling'; all.firstChild.nodeValue = t.textContent === 'All' ? 'See all best sellers' : 'See all ' + t.textContent.toLowerCase(); }
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { pick(t); });
    t.addEventListener('keydown', function (e) {
      var n = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!n) return;
      e.preventDefault(); pick(tabs[(i + n + tabs.length) % tabs.length], true);
    });
    /* warm the other tabs once the page is idle, so switching is instant */
    if (i > 0) { var warmTab = function () { row(t.dataset.sjhTab); }; if ('requestIdleCallback' in window) requestIdleCallback(warmTab, { timeout: 2500 }); else setTimeout(warmTab, 2500); }
  });

  /* quick add on the gift cards, then open the theme's cart drawer */
  root.addEventListener('click', function (e) {
    var b = e.target.closest('[data-sjh-add]'); if (!b) return;
    b.classList.add('is-busy');
    fetch('/cart/add.js', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ items: [{ id: +b.dataset.sjhAdd, quantity: 1 }] }) })
      .then(function (r) { if (!r.ok) throw 0; b.classList.remove('is-busy'); b.classList.add('is-done'); document.dispatchEvent(new CustomEvent('cart:refresh:opend')); setTimeout(function () { b.classList.remove('is-done'); }, 2500); })
      .catch(function () { b.classList.remove('is-busy'); window.location.href = '/cart'; });
  });
})();
