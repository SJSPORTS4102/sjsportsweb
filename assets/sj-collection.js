/* SJ collection page (Off Leesh, Nov 2026): filter drawer on phones, auto-apply filters, sort, load more. */
(function () {
  'use strict';
  var root = document.querySelector('[data-sjcol]'); if (!root) return;
  var desk = window.matchMedia('(min-width: 1025px)');
  var panel = root.querySelector('[data-sjcol-filters]'), scrim = root.querySelector('.sjcol-fscrim'), openBtn = root.querySelector('[data-sjcol-fopen]');
  function openF() { if (!panel) return; panel.classList.add('is-open'); scrim.hidden = false; document.body.classList.add('sjn-lock'); openBtn && openBtn.setAttribute('aria-expanded', 'true'); var x = panel.querySelector('.fx'); x && x.focus(); }
  function closeF() { if (!panel) return; panel.classList.remove('is-open'); scrim.hidden = true; document.body.classList.remove('sjn-lock'); openBtn && openBtn.setAttribute('aria-expanded', 'false'); openBtn && openBtn.focus(); }
  if (openBtn) openBtn.addEventListener('click', openF);
  root.querySelectorAll('[data-sjcol-fclose]').forEach(function (b) { b.addEventListener('click', closeF); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panel && panel.classList.contains('is-open')) closeF(); });

  /* filters: on desktop apply as soon as a box is ticked; on phones wait for "Show results" */
  var form = root.querySelector('[data-sjcol-form]');
  function go(f) {
    var params = new URLSearchParams(new FormData(f));
    Array.from(params.keys()).forEach(function (k) { if (params.get(k) === '') params.delete(k); });
    window.location.href = f.getAttribute('action') + '?' + params.toString();
  }
  if (form) {
    form.addEventListener('change', function (e) { if (desk.matches && e.target.type === 'checkbox') go(form); });
    form.addEventListener('submit', function (e) { e.preventDefault(); go(form); });
  }

  /* sort */
  var sort = root.querySelector('[data-sjcol-sort]');
  if (sort) sort.addEventListener('change', function () {
    var u = new URL(window.location.href); u.searchParams.set('sort_by', sort.value); u.searchParams.delete('page'); window.location.href = u.toString();
  });

  /* load more: fetch the next page of this section and append the cards */
  root.addEventListener('click', function (e) {
    var a = e.target.closest('[data-sjcol-next]'); if (!a) return;
    e.preventDefault(); a.classList.add('is-busy'); a.textContent = 'Loading';
    var url = new URL(a.href, window.location.origin); url.searchParams.set('section_id', root.dataset.section);
    fetch(url.toString()).then(function (r) { return r.text(); }).then(function (html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var grid = root.querySelector('[data-sjcol-grid]');
      doc.querySelectorAll('[data-sjcol-grid] > .sjc-card').forEach(function (c) { grid.appendChild(c); });
      var more = doc.querySelector('[data-sjcol-more]'), cur = root.querySelector('[data-sjcol-more]');
      if (more && cur) cur.replaceWith(more);
    }).catch(function () { window.location.href = a.href; });
  });
})();
