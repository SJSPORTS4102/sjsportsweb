/* SJ mega nav (Off Leesh, Nov 2026): desktop panels (click, keyboard, hover with a delay), lazy best sellers
   from /collections/<handle>?sort_by=best-selling&section_id=sj-nav-best, phone drawer that replaces the theme menu. */
(function () {
  'use strict';
  var root = document.querySelector('[data-sjn]'); if (!root) return;
  var desk = window.matchMedia('(min-width: 1025px)');
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  var cache = {};
  var html = document.documentElement;
  var hdr = document.querySelector('.t4s-section-header');
  var barEl = root.querySelector('.sjn-bar');

  /* ---------- best sellers: fetched once, kept for 30 minutes, filled straight into every panel ---------- */
  var TTL = 30 * 60 * 1000, queue = [], running = 0;
  function fromStore(h) {
    try { var o = JSON.parse(sessionStorage.getItem('sjn:' + h) || 'null'); if (o && Date.now() - o.t < TTL) return o.html; } catch (e) {}
    return null;
  }
  function toStore(h, txt) { try { sessionStorage.setItem('sjn:' + h, JSON.stringify({ t: Date.now(), html: txt })); } catch (e) {} }
  function pump() {
    while (running < 4 && queue.length) {
      var job = queue.shift(); running++;
      fetch('/collections/' + job.h + '?sort_by=best-selling&section_id=sj-nav-best')
        .then(function (r) { return r.ok ? r.text() : ''; })
        .then(function (job) { return function (txt) { running--; if (txt) toStore(job.h, txt); job.res(txt); pump(); }; }(job))
        .catch(function (job) { return function () { running--; job.res(''); pump(); }; }(job));
    }
  }
  function getBest(h, urgent) {
    if (cache[h]) return cache[h];
    var hit = fromStore(h);
    if (hit !== null) return (cache[h] = Promise.resolve(hit));
    return (cache[h] = new Promise(function (res) { var job = { h: h, res: res }; if (urgent) queue.unshift(job); else queue.push(job); pump(); }));
  }
  function loadBest(el, urgent) {
    if (!el || el.dataset.loaded) return;
    el.dataset.loaded = '1';
    getBest(el.dataset.sjnBest, urgent).then(function (txt) {
      var doc = new DOMParser().parseFromString(txt || '', 'text/html'), cards = doc.querySelector('.sjn-cards');
      if (!cards) { el.remove(); return; }
      var lim = +(el.dataset.limit || 6);
      [].slice.call(cards.children, lim).forEach(function (c) { c.remove(); });
      el.innerHTML = ''; el.appendChild(cards);
    });
  }
  function warm(scope, urgent) { (scope || root).querySelectorAll('[data-sjn-best]').forEach(function (el) { loadBest(el, urgent); }); }
  function idle(fn, ms) { if ('requestIdleCallback' in window) requestIdleCallback(fn, { timeout: ms }); else setTimeout(fn, ms); }
  /* desktop: everything in the panels loads in the background after the page, so panels open with images ready */
  window.addEventListener('load', function () {
    idle(function () { if (desk.matches) warm(barEl); else warm(root.querySelector('.sjn-view[data-view="main"]')); }, 800);
  });
  if (barEl) barEl.addEventListener('pointerenter', function () { if (desk.matches) warm(barEl, true); }, { once: true });

  /* ---------- header and category row: hide when scrolling down, show when scrolling up ---------- */
  var hidden = false, lastY = window.scrollY, ticking = false;
  function stack() {
    var hh = hdr ? Math.round(hdr.getBoundingClientRect().height) : 0;
    var nh = desk.matches && barEl ? Math.round(barEl.getBoundingClientRect().height) : 0;
    html.style.setProperty('--sjn-top', hh + 'px');
    html.style.setProperty('--sjn-stack', (hidden ? 0 : hh + nh) + 'px');
    return hh + nh;
  }
  function setHidden(h) { if (h === hidden) return; hidden = h; html.classList.toggle('sjn-up', h); stack(); }
  function onScroll() {
    ticking = false;
    var y = window.scrollY, dy = y - lastY;
    if (Math.abs(dy) < 6) return;
    var busy = openId || (drawer && !drawer.hidden) || document.body.classList.contains('t4s-lock-scroll') || document.body.classList.contains('sjn-lock');
    if (dy > 0 && y > stack() + 120 && !busy) setHidden(true);
    else if (dy < 0 || y < 120) setHidden(false);
    lastY = y;
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  window.addEventListener('resize', stack); stack();
  if (hdr && 'ResizeObserver' in window) new ResizeObserver(stack).observe(hdr);
  /* keyboard users: anything focused inside the header brings it back */
  document.addEventListener('focusin', function (e) { if (hidden && e.target.closest && e.target.closest('.t4s-section-header, #shopify-section-sj-mega-nav')) setHidden(false); });

  /* ---------- desktop panels ---------- */
  var tops = [].slice.call(root.querySelectorAll('[data-sjn-open]'));
  var openId = null, tOpen, tClose;
  function panel(id) { return root.querySelector('[data-sjn-panel="' + id + '"]'); }
  function open(id) {
    if (openId === id) return;
    close();
    var p = panel(id), t = root.querySelector('[data-sjn-open="' + id + '"]');
    if (!p || !t) return;
    p.hidden = false; t.setAttribute('aria-expanded', 'true'); openId = id;
    warm(p, true);
  }
  function close() {
    if (!openId) return;
    var p = panel(openId), t = root.querySelector('[data-sjn-open="' + openId + '"]');
    if (p) p.hidden = true; if (t) t.setAttribute('aria-expanded', 'false'); openId = null;
  }
  tops.forEach(function (t) {
    var id = t.dataset.sjnOpen;
    t.addEventListener('mouseenter', function () { if (!desk.matches || !fine.matches) return; clearTimeout(tClose); clearTimeout(tOpen); tOpen = setTimeout(function () { open(id); }, openId ? 0 : 140); });
    t.addEventListener('mouseleave', function () { clearTimeout(tOpen); });
    t.addEventListener('click', function (e) {
      if (!desk.matches) return;
      /* touch screens and keyboard: first press opens the panel, the panel has the "see all" link */
      if (!fine.matches || e.detail === 0) { if (openId !== id) { e.preventDefault(); open(id); } }
    });
    t.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === ' ') { e.preventDefault(); open(id); var f = panel(id) && panel(id).querySelector('a'); if (f) f.focus(); }
    });
  });
  var bar = root.querySelector('.sjn-bar');
  if (bar) {
    bar.addEventListener('mouseleave', function () { if (!fine.matches) return; clearTimeout(tOpen); tClose = setTimeout(close, 220); });
    bar.addEventListener('mouseenter', function () { clearTimeout(tClose); });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (openId) { var t = root.querySelector('[data-sjn-open="' + openId + '"]'); close(); if (t) t.focus(); }
    if (drawer && !drawer.hidden) closeDrawer();
  });
  document.addEventListener('click', function (e) { if (openId && !e.target.closest('.sjn-bar')) close(); });

  /* ---------- phone drawer ---------- */
  var drawer = root.querySelector('#sjn-drawer'), scrim = root.querySelector('.sjn-scrim'), lastFocus = null;
  function fillView(id) {
    var slot = root.querySelector('[data-sjn-fill="' + id + '"]');
    if (slot && !slot.dataset.filled) {
      var tpl = root.querySelector('template[data-sjn-groups="' + id + '"]');
      if (tpl) slot.appendChild(tpl.content.cloneNode(true));
      slot.dataset.filled = '1';
    }
  }
  function show(view) {
    drawer.querySelectorAll('.sjn-view').forEach(function (v) { v.hidden = v.dataset.view !== view; });
    if (view !== 'main') fillView(view);
    var v = drawer.querySelector('.sjn-view[data-view="' + view + '"]');
    warm(v, true);
    var f = v.querySelector('.sjn-back, .sjn-x'); if (f) f.focus();
    var b = v.querySelector('.sjn-db'); if (b) b.scrollTop = 0;
  }
  function openDrawer() {
    lastFocus = document.activeElement;
    drawer.hidden = false; scrim.hidden = false; document.body.classList.add('sjn-lock');
    requestAnimationFrame(function () { drawer.classList.add('is-open'); });
    show('main');
    /* start every category's best sellers now, so tapping into a category shows its images straight away */
    idle(function () { drawer.querySelectorAll('.sjn-view[data-view]:not([data-view="main"])').forEach(function (v) { warm(v); }); }, 300);
  }
  function closeDrawer() {
    drawer.classList.remove('is-open'); document.body.classList.remove('sjn-lock');
    setTimeout(function () { drawer.hidden = true; scrim.hidden = true; }, 250);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  if (drawer) {
    /* the theme's menu buttons (header and the bottom bar) open this menu instead of the theme's own */
    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('.t4s-push-menu-btn, [data-sjn-menu]');
      if (!btn || desk.matches) return;
      e.preventDefault(); e.stopImmediatePropagation(); openDrawer();
    }, true);
    drawer.addEventListener('click', function (e) {
      var go = e.target.closest('[data-sjn-go]'); if (go) { e.preventDefault(); show(go.dataset.sjnGo); return; }
      if (e.target.closest('[data-sjn-close]')) closeDrawer();
    });
    scrim.addEventListener('click', closeDrawer);
    drawer.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var v = drawer.querySelector('.sjn-view:not([hidden])'), f = [].slice.call(v.querySelectorAll('a,button,input')).filter(function (x) { return x.offsetParent; });
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    });
  }
})();
