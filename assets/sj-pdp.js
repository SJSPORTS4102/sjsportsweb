/* SJ product page v3 (Off Leesh, Nov 2026): variants, gallery, add to cart with add-ons,
   sticky bar and zoom for sections/sj-main-product.liquid. No dependencies. */
(function () {
  'use strict';
  function money(c) {
    var d = (c / 100).toFixed(2), parts = d.split('.'), whole = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return '$' + whole + (parts[1] === '00' ? '' : '.' + parts[1]);
  }
  function openCart(root) {
    var cfg = root._cfg || {};
    if (cfg.cartType === 'disable' || !window.T4SThemeSP) { window.location.href = (window.Shopify && Shopify.routes ? Shopify.routes.root : '/') + 'cart'; return; }
    document.dispatchEvent(new CustomEvent('cart:refresh:opend'));
  }
  function addItems(items) {
    var root = (window.Shopify && Shopify.routes) ? Shopify.routes.root : '/';
    return fetch(root + 'cart/add.js', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ items: items })
    }).then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.description || j.message || 'Could not add to cart'); return j; }); });
  }

  function init(root) {
    var cfgEl = root.querySelector('[data-sjp-json]');
    var cfg = cfgEl ? JSON.parse(cfgEl.textContent) : { variants: [] };
    root._cfg = cfg;
    var form = root.querySelector('[data-sjp-form]');
    var vidInput = root.querySelector('[data-vid]');
    var atc = root.querySelector('[data-atc]');
    var atcLabel = root.querySelector('[data-atc-label]');
    var qtyInput = root.querySelector('[data-qty-input]');
    var err = root.querySelector('[data-err]');
    var track = root.querySelector('[data-track]');
    var thumbs = root.querySelectorAll('[data-thumb]');
    var countEl = root.querySelector('[data-count]');
    var sticky = root.querySelector('[data-sticky]');
    var groups = root.querySelectorAll('[data-opt]');
    var current = cfg.variants.find(function (v) { return vidInput && String(v.id) === vidInput.value; }) || cfg.variants[0];

    /* gallery */
    function slideTo(i) {
      if (!track) return;
      track.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' });
    }
    function markThumb(i) {
      thumbs.forEach(function (t) { t.classList.toggle('on', +t.dataset.thumb === i); });
      if (countEl) countEl.textContent = i + 1;
    }
    thumbs.forEach(function (t) { t.addEventListener('click', function () { slideTo(+t.dataset.thumb); markThumb(+t.dataset.thumb); }); });
    if (track) {
      var tmr;
      track.addEventListener('scroll', function () {
        clearTimeout(tmr);
        tmr = setTimeout(function () { markThumb(Math.round(track.scrollLeft / Math.max(track.clientWidth, 1))); }, 60);
      }, { passive: true });
    }

    /* variants */
    function selected() {
      var vals = [];
      groups.forEach(function (g) { var c = g.querySelector('input:checked'); vals.push(c ? c.value : null); });
      return vals;
    }
    function addonTotal() {
      var s = 0;
      root.querySelectorAll('[data-addon]:checked').forEach(function (c) { s += +c.dataset.price || 0; });
      return s;
    }
    function qty() { return Math.max(1, parseInt(qtyInput && qtyInput.value, 10) || 1); }
    function renderAtc() {
      if (!atc || !current) return;
      if (!current.available) {
        atc.disabled = true; atcLabel.textContent = 'Sold out';
      } else {
        atc.disabled = false;
        atcLabel.innerHTML = 'Add to cart <span class="dot">&middot;</span> ' + money(current.price * qty() + addonTotal());
      }
      if (sticky) {
        var sb = sticky.querySelector('[data-sticky-atc]'), sp = sticky.querySelector('[data-sticky-price]');
        if (sb) { sb.disabled = !current.available; sb.textContent = current.available ? 'Add to cart' : 'Sold out'; }
        if (sp) sp.textContent = money(current.price);
      }
    }
    function renderVariant() {
      if (!current) return;
      vidInput.value = current.id;
      var now = root.querySelector('[data-now]'), was = root.querySelector('[data-was]'), save = root.querySelector('[data-save]');
      if (now) now.textContent = money(current.price);
      var onSale = current.compare > current.price;
      if (was) { was.hidden = !onSale; if (onSale) was.textContent = money(current.compare); }
      if (save) { save.hidden = !onSale; if (onSale) save.textContent = 'Save ' + money(current.compare - current.price); }
      var st = root.querySelector('[data-stock]');
      if (st) {
        st.classList.toggle('is-out', !current.available);
        st.textContent = !current.available ? 'Sold out' : (!current.stocked ? 'Available to order' : (cfg.prep ? 'In stock, ready to prep' : 'In stock'));
      }
      renderAtc();
      /* which other values are sold out with the current picks */
      var sel = selected();
      groups.forEach(function (g, gi) {
        var lab = g.querySelector('[data-optval]'); if (lab) lab.textContent = sel[gi] || '';
        g.querySelectorAll('.sjp-chip').forEach(function (chip) {
          var val = chip.querySelector('input').value;
          var ok = cfg.variants.some(function (v) {
            return v.available && v.options.every(function (o, oi) { return oi === gi ? o === val : o === sel[oi]; });
          });
          chip.classList.toggle('is-off', !ok);
        });
      });
      if (current.media && track) {
        var sl = track.querySelector('[data-media-id="' + current.media + '"]');
        if (sl) { slideTo(+sl.dataset.i); markThumb(+sl.dataset.i); }
      }
      if (window.history && history.replaceState && cfg.variants.length > 1) {
        var u = new URL(window.location.href); u.searchParams.set('variant', current.id); history.replaceState({}, '', u.toString());
      }
    }
    groups.forEach(function (g) {
      g.addEventListener('change', function () {
        var sel = selected();
        current = cfg.variants.find(function (v) { return v.options.every(function (o, i) { return o === sel[i]; }); }) || null;
        if (!current) { atc.disabled = true; atcLabel.textContent = 'Unavailable'; return; }
        renderVariant();
      });
    });
    root.querySelectorAll('[data-addon]').forEach(function (c) { c.addEventListener('change', renderAtc); });
    root.querySelectorAll('[data-qty]').forEach(function (b) {
      b.addEventListener('click', function () { qtyInput.value = Math.max(1, qty() + (+b.dataset.qty)); renderAtc(); });
    });
    if (qtyInput) qtyInput.addEventListener('input', renderAtc);
    if (groups.length) renderVariant(); else renderAtc();

    /* add to cart: main item with its properties, plus any ticked add-ons, then open the theme drawer */
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!current || !current.available) return;
        var props = {};
        new FormData(form).forEach(function (val, key) {
          var m = key.match(/^properties\[(.+)\]$/); if (m && val !== '') props[m[1]] = val;
        });
        var items = [{ id: current.id, quantity: qty(), properties: props }];
        root.querySelectorAll('[data-addon]:checked').forEach(function (c) { items.push({ id: +c.value, quantity: 1 }); });
        err.hidden = true; atc.classList.add('is-busy');
        addItems(items).then(function () {
          root.querySelectorAll('[data-addon]:checked').forEach(function (c) { c.checked = false; });
          renderAtc(); openCart(root);
        }).catch(function (x) {
          err.textContent = x.message; err.hidden = false;
        }).finally(function () { atc.classList.remove('is-busy'); });
      });
    }

    /* quick add in the "goes with" rail */
    root.querySelectorAll('[data-quick-add]').forEach(function (b) {
      b.addEventListener('click', function () {
        var label = b.textContent; b.disabled = true; b.textContent = 'Adding';
        addItems([{ id: +b.dataset.quickAdd, quantity: 1 }]).then(function () {
          b.textContent = 'Added'; b.classList.add('is-done'); openCart(root);
          setTimeout(function () { b.textContent = label; b.classList.remove('is-done'); b.disabled = false; }, 2500);
        }).catch(function (x) { b.textContent = label; b.disabled = false; alert(x.message); });
      });
    });

    /* sticky bar on phones: shows once the main Add to cart has scrolled off the top */
    var row = root.querySelector('[data-atc-row]');
    if (sticky && row) {
      var ticking = false;
      var check = function () {
        ticking = false;
        var show = row.getBoundingClientRect().bottom < 0;
        if (sticky.classList.contains('is-on') === show) return;
        sticky.classList.toggle('is-on', show); sticky.setAttribute('aria-hidden', show ? 'false' : 'true');
        var sb = sticky.querySelector('[data-sticky-atc]'); if (sb) sb.tabIndex = show ? 0 : -1;
      };
      window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(check); } }, { passive: true });
      window.addEventListener('resize', check); check();
      var sbtn = sticky.querySelector('[data-sticky-atc]');
      if (sbtn) sbtn.addEventListener('click', function () {
        if (form.requestSubmit) form.requestSubmit(atc); else atc.click();
      });
    }
  }
  function boot() { document.querySelectorAll('[data-sjp]').forEach(function (r) { if (!r._sjp) { r._sjp = 1; init(r); } }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  document.addEventListener('shopify:section:load', boot);
})();
