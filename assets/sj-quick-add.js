/* SJ quick add on the product card (Off Leesh, 25 Nov 2026). Markup: snippets/sj-card.liquid, styles: sj-collection.css.
   One listener for the whole page, so cards that load later (homepage rows, search, recommendations) work too.
   Computers: the picker shows inside the card on hover. Phones and tablets: the bag button opens one shared
   bottom sheet with the same picker. English willow bats step through size, preferred weight and bat prep;
   the last pick adds to cart. Adds with /cart/add.js, then opens the theme's cart drawer like the product page. */
(function () {
  'use strict';
  if (window.__sjQuickAdd) return;
  window.__sjQuickAdd = true;
  var root = (window.Shopify && Shopify.routes && Shopify.routes.root) || '/';
  var desk = window.matchMedia('(hover: hover) and (pointer: fine)');
  var sheet, back, opener;

  function openCart(card) {
    /* cart page (sections/main-cart .sjcp): the cart is already on screen, so redraw it in place like the
       upsell does (Gecko's cart:refresh), and tell the recently viewed row which card was added.
       An empty cart page has no item list to redraw, so it reloads. */
    var page = document.querySelector('.sjcp');
    if (page) {
      document.dispatchEvent(new CustomEvent('sj:cart-page-added', { detail: { card: card || null } }));
      if (page.querySelector('[data-cart-item]') && window.T4SThemeSP) document.dispatchEvent(new CustomEvent('cart:refresh'));
      else setTimeout(function () { window.location.reload(); }, 700);
      return;
    }
    if (window.sjCartType === 'disable' || !window.T4SThemeSP) { window.location.href = root + 'cart'; return; }
    document.dispatchEvent(new CustomEvent('cart:refresh:opend'));
  }

  /* shoe sizes come in the store's variant order (10, 11, 7, 8); put plain number chips in number order */
  function sortChips(q) {
    if (!q || q.__sjSorted) return;
    q.__sjSorted = true;
    var box = q.querySelector('.sjq-chips');
    if (!box) return;
    var chips = [].slice.call(box.children);
    if (!chips.length || !chips.every(function (c) { return /^\d+(\.\d+)?$/.test(c.textContent.trim()); })) return;
    chips.sort(function (a, b) { return parseFloat(a.textContent) - parseFloat(b.textContent); })
      .forEach(function (c) { box.appendChild(c); });
  }
  document.addEventListener('pointerover', function (e) {
    var c = e.target.closest && e.target.closest('.sjc-card');
    if (c) sortChips(c.querySelector('[data-sjq]'));
  }, { passive: true });

  /* bat steps: back to the first step with nothing picked */
  function resetSteps(q) {
    if (!q) return;
    q._sjSel = null;
    q.querySelectorAll('.sjq-step').forEach(function (s, i) { s.hidden = i > 0; });
    q.querySelectorAll('[data-sjq-pick][aria-pressed]').forEach(function (b) { b.removeAttribute('aria-pressed'); });
  }

  /* in-card panel (computers, keyboard) */
  function setOpen(q, open) {
    q.classList.toggle('is-open', open);
    var t = q.querySelector('[data-sjq-toggle]');
    if (t) t.setAttribute('aria-expanded', String(open));
  }

  /* bottom sheet (phones, tablets) */
  function buildSheet() {
    back = document.createElement('div');
    back.className = 'sjq-back-drop';
    back.setAttribute('data-sjq-close', '');
    sheet = document.createElement('div');
    sheet.className = 'sjq-sheet';
    sheet.setAttribute('data-sjq', '');
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-labelledby', 'sjq-sheet-t');
    sheet.innerHTML = '<div class="sjq-sheet__hd"><div><p class="sjq-sheet__t" id="sjq-sheet-t"></p><p class="sjq-sheet__p"></p></div>' +
      '<button type="button" class="sjq-x" data-sjq-close aria-label="Close"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>' +
      '<div class="sjq-sheet__bd"></div>';
    document.body.appendChild(back);
    document.body.appendChild(sheet);
  }
  function openSheet(q, toggle) {
    if (!sheet) buildSheet();
    var card = q.closest('.sjc-card');
    var t = card && card.querySelector('.sjc-card__t');
    var p = card && card.querySelector('.sjc-card__price b');
    sheet.querySelector('.sjq-sheet__t').textContent = t ? t.textContent.trim() : '';
    sheet.querySelector('.sjq-sheet__p').textContent = p ? p.textContent.trim() : '';
    var bd = sheet.querySelector('.sjq-sheet__bd');
    bd.innerHTML = '';
    var panel = q.querySelector('.sjq-panel');
    if (panel) [].forEach.call(panel.children, function (c) { bd.appendChild(c.cloneNode(true)); });
    bd.querySelectorAll('.sjq-x').forEach(function (x) { x.remove(); });
    ['data-sjq-props', 'data-sjq-vid'].forEach(function (a) {
      if (q.hasAttribute(a)) sheet.setAttribute(a, q.getAttribute(a)); else sheet.removeAttribute(a);
    });
    resetSteps(sheet);
    var err = sheet.querySelector('[data-sjq-err]'); if (err) err.hidden = true;
    opener = toggle;
    sheet.offsetHeight; /* start the slide from the closed position */
    back.classList.add('is-open');
    sheet.classList.add('is-open');
    if (toggle) toggle.setAttribute('aria-expanded', 'true');
    var f = bd.querySelector('.sjq-chip'); if (f) f.focus({ preventScroll: true });
  }
  function closeSheet() {
    if (!sheet || !sheet.classList.contains('is-open')) return;
    sheet.classList.remove('is-open');
    back.classList.remove('is-open');
    if (opener) { opener.setAttribute('aria-expanded', 'false'); opener.focus({ preventScroll: true }); opener = null; }
  }

  function closeAll(except) {
    document.querySelectorAll('.sjq.is-open').forEach(function (q) { if (q !== except) { setOpen(q, false); resetSteps(q); } });
    closeSheet();
  }

  function add(btn, item) {
    var q = btn.closest('[data-sjq]');
    var err = q && q.querySelector('[data-sjq-err]');
    if (!item) {
      item = { id: +btn.getAttribute('data-sjq-add'), quantity: 1 };
      var props = q && q.getAttribute('data-sjq-props');
      if (props) { try { item.properties = JSON.parse(props); } catch (e) {} }
    }
    btn.classList.add('is-busy');
    if (err) err.hidden = true;
    fetch(root + 'cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ items: [item] })
    }).then(function (r) {
      return r.json().then(function (j) { if (!r.ok) throw new Error(j.description || j.message || 'Could not add to cart'); return j; });
    }).then(function () {
      var l = btn.querySelector('.sjq-l'), was = l && l.textContent;
      btn.classList.remove('is-busy');
      btn.classList.add('is-done');
      if (l) l.textContent = 'Added';
      openCart(q === sheet ? (opener && opener.closest('.sjc-card')) : btn.closest('.sjc-card'));
      if (q === sheet) setTimeout(function () { opener = null; closeSheet(); }, 700);
      setTimeout(function () {
        btn.classList.remove('is-done'); if (l) l.textContent = was;
        if (q && q !== sheet) { setOpen(q, false); resetSteps(q); }
      }, 1800);
    }).catch(function (x) {
      btn.classList.remove('is-busy');
      if (err) { err.textContent = x.message; err.hidden = false; if (q && q !== sheet && q.querySelector('.sjq-panel')) setOpen(q, true); }
    });
  }

  /* a bat pick: remember it, show the next step, and add to cart after the last one */
  function pick(btn, viaKeyboard) {
    var q = btn.closest('[data-sjq]');
    var step = btn.closest('.sjq-step');
    var sel = q._sjSel || (q._sjSel = { props: {} });
    var key = btn.getAttribute('data-sjq-pick'), val = btn.getAttribute('data-v');
    if (key === 'id') sel.id = +val; else sel.props[key] = val;
    step.querySelectorAll('[data-sjq-pick]').forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
    var next = step.nextElementSibling;
    while (next && !next.classList.contains('sjq-step')) next = next.nextElementSibling;
    if (next) {
      step.hidden = true; next.hidden = false;
      if (viaKeyboard || !desk.matches) { var f = next.querySelector('[data-sjq-pick]'); if (f) f.focus({ preventScroll: true }); }
      return;
    }
    var id = sel.id || +q.getAttribute('data-sjq-vid');
    if (!id) return;
    add(btn, { id: id, quantity: 1, properties: sel.props });
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-sjq-add]');
    if (a) { e.preventDefault(); if (!a.classList.contains('is-busy')) add(a); return; }
    var pk = e.target.closest('[data-sjq-pick]');
    if (pk) { e.preventDefault(); if (!pk.classList.contains('is-busy')) pick(pk, e.detail === 0); return; }
    var bk = e.target.closest('[data-sjq-back]');
    if (bk) {
      e.preventDefault();
      var st = bk.closest('.sjq-step'), prev = st.previousElementSibling;
      while (prev && !prev.classList.contains('sjq-step')) prev = prev.previousElementSibling;
      if (prev) { st.hidden = true; prev.hidden = false; var pf = prev.querySelector('[aria-pressed="true"]') || prev.querySelector('[data-sjq-pick]'); if (pf && e.detail === 0) pf.focus(); }
      return;
    }
    var t = e.target.closest('[data-sjq-toggle]');
    if (t) {
      e.preventDefault();
      var q = t.closest('[data-sjq]');
      sortChips(q);
      if (!desk.matches) { closeAll(); openSheet(q, t); return; }
      var open = !q.classList.contains('is-open');
      closeAll(q);
      setOpen(q, open);
      if (open && e.detail === 0) { var f = q.querySelector('.sjq-step:not([hidden]) .sjq-chip, .sjq-panel > .sjq-chips .sjq-chip'); if (f) f.focus(); }
      return;
    }
    if (e.target.closest('[data-sjq-close]')) {
      var c = e.target.closest('[data-sjq]');
      if (!c || c === sheet) { closeSheet(); return; }
      setOpen(c, false); resetSteps(c);
      var tg = c.querySelector('[data-sjq-toggle]'); if (tg && e.detail === 0) tg.focus();
      return;
    }
    if (!e.target.closest('[data-sjq]')) closeAll();
  });
  /* computers: a half-finished bat pick starts again once the mouse leaves the card */
  document.addEventListener('mouseout', function (e) {
    if (!desk.matches) return;
    var c = e.target.closest && e.target.closest('.sjc-card');
    if (!c || (e.relatedTarget && c.contains(e.relatedTarget))) return;
    var q = c.querySelector('[data-sjq]');
    if (q && !q.classList.contains('is-open') && !q.querySelector('.is-busy, .is-done')) resetSteps(q);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (sheet && sheet.classList.contains('is-open')) { closeSheet(); return; }
    var q = document.querySelector('.sjq.is-open');
    if (!q) return;
    setOpen(q, false); resetSteps(q);
    var tg = q.querySelector('[data-sjq-toggle]'); if (tg) tg.focus();
  });
})();
