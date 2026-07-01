(function () {
  const root = document.getElementById('editor-root');
  if (!root) return;

  const saveUrl = root.dataset.saveUrl;
  const previewUrl = root.dataset.previewUrl;
  const exportUrl = root.dataset.exportUrl;
  let status = root.dataset.status || 'draft';
  let previewVisible = true;
  let mobileTab = 'edit';
  let zoom = 0.65;
  let saveTimer;
  let previewTimer;

  function uuid() {
    return crypto.randomUUID ? crypto.randomUUID() : `id_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }

  function setNested(obj, path, value) {
    const parts = path.split('.');
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const k = parts[i];
      if (!cur[k] || typeof cur[k] !== 'object') cur[k] = {};
      cur = cur[k];
    }
    cur[parts[parts.length - 1]] = value;
  }

  function collectForm() {
    const form = {
      supplements: [],
      cancellationRows: [],
      passengers: [],
      hidePricingOnPdf: false,
    };

    document.querySelectorAll('[data-field]').forEach((el) => {
      const path = el.getAttribute('data-field');
      if (!path) return;
      let val;
      if (el.type === 'checkbox') val = el.checked;
      else val = el.value;
      setNested(form, path, val);
    });

    document.querySelectorAll('#supplements-list [data-row]').forEach((row) => {
      form.supplements.push({
        id: row.dataset.id || uuid(),
        desc: row.querySelector('[data-sup-field="desc"]')?.value || '',
        amount: row.querySelector('[data-sup-field="amount"]')?.value || '',
        chargeType: row.querySelector('[data-sup-field="chargeType"]')?.value || 'Pay at hotel',
      });
    });

    document.querySelectorAll('#cancellation-list [data-row]').forEach((row) => {
      form.cancellationRows.push({
        id: row.dataset.id || uuid(),
        rule: row.querySelector('[data-can-field="rule"]')?.value || '',
        charge: row.querySelector('[data-can-field="charge"]')?.value || '',
      });
    });

    document.querySelectorAll('#passengers-list .passenger-card').forEach((card) => {
      const p = { id: card.dataset.passengerId || uuid() };
      card.querySelectorAll('[data-passenger-field]').forEach((el) => {
        p[el.getAttribute('data-passenger-field')] = el.value;
      });
      form.passengers.push(p);
    });

    if (!form.passengers.length) {
      form.passengers.push({ id: uuid(), honorific: 'MR.', passengerType: 'Adult' });
    }

    const totals = window.LyziusMoney.deriveMoneyTotals(form);
    form.adultTotalFare = totals.adultTotalFareFmt;
    form.totalRoomRate = totals.totalRoomRateFmt;
    form.originalTotal = totals.originalTotalFmt;
    form.totalDue = totals.totalDueFmt;

    const map = {
      adultTotalFare: 'adultTotalFare',
      totalRoomRate: 'totalRoomRate',
      originalTotal: 'originalTotal',
      totalDue: 'totalDue',
    };
    Object.entries(map).forEach(([k]) => {
      const el = document.querySelector(`[data-field="${k}"]`);
      if (el) el.value = form[k];
    });

    return form;
  }

  function payload() {
    return {
      title: document.getElementById('itinerary-title')?.value || '',
      status,
      form: collectForm(),
    };
  }

  async function saveNow() {
    const res = await fetch(saveUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload()),
    });
    if (!res.ok) throw new Error('Save failed');
    return res.json();
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveNow().catch(() => {});
    }, 450);
  }

  async function refreshPreview() {
    const canvas = document.getElementById('preview-canvas');
    const exportRoot = document.getElementById('pdf-export-root');
    if (!canvas) return;
    const form = collectForm();
    const res = await fetch(previewUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ form }),
    });
    const html = await res.text();
    canvas.innerHTML = `<div class="preview-pages">${html}</div>`;
    if (exportRoot) {
      const ex = await fetch(exportUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ form }),
      });
      exportRoot.innerHTML = await ex.text();
    }
    const pages = canvas.querySelectorAll('.pdf-page');
    const meta = document.getElementById('preview-meta');
    const hide = form.hidePricingOnPdf ? ' · prices hidden' : '';
    if (meta) meta.textContent = `A4 · ${pages.length} page${pages.length === 1 ? '' : 's'}${hide}`;
    applyZoom();
    window.LyziusIcons?.hydrate();
  }

  function schedulePreview() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => refreshPreview().catch(console.error), 280);
  }

  function applyZoom() {
    const canvas = document.getElementById('preview-canvas');
    if (!canvas) return;
    canvas.querySelectorAll('.pdf-page').forEach((page) => {
      const wrap = page.parentElement;
      if (!wrap || wrap.classList.contains('pdf-page')) return;
      page.style.transform = `scale(${zoom})`;
      page.style.transformOrigin = 'top center';
      page.style.marginBottom = `${842 * zoom * 0.15}px`;
    });
    document.querySelectorAll('#zoom-controls [data-zoom]').forEach((btn) => {
      btn.classList.toggle('is-active', parseFloat(btn.dataset.zoom) === zoom);
    });
  }

  document.querySelectorAll('#zoom-controls [data-zoom]').forEach((btn) => {
    btn.addEventListener('click', () => {
      zoom = parseFloat(btn.dataset.zoom);
      applyZoom();
    });
  });

  document.querySelectorAll('[data-section] .section__toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const sec = btn.closest('[data-section]');
      if (!sec) return;
      const open = sec.classList.toggle('is-collapsed');
      btn.setAttribute('aria-expanded', open ? 'false' : 'true');
      const chevron = btn.querySelector('.section-chevron');
      if (chevron) chevron.setAttribute('data-icon', open ? 'chevron-down' : 'chevron-up');
      window.LyziusIcons?.hydrate();
    });
  });

  function bindDynamicRows() {
    document.querySelector('[data-add-supplement]')?.addEventListener('click', () => {
      const tpl = document.getElementById('tpl-supplement-row');
      const list = document.getElementById('supplements-list');
      if (!tpl || !list) return;
      const node = tpl.content.firstElementChild.cloneNode(true);
      node.dataset.id = uuid();
      list.appendChild(node);
      bindRemoveRow(node);
      window.LyziusIcons?.hydrate();
      onChange();
    });

    document.querySelector('[data-add-cancellation]')?.addEventListener('click', () => {
      const tpl = document.getElementById('tpl-cancellation-row');
      const list = document.getElementById('cancellation-list');
      if (!tpl || !list) return;
      const node = tpl.content.firstElementChild.cloneNode(true);
      node.dataset.id = uuid();
      list.appendChild(node);
      bindRemoveRow(node);
      window.LyziusIcons?.hydrate();
      onChange();
    });

    document.querySelector('[data-add-passenger]')?.addEventListener('click', () => {
      const tpl = document.getElementById('tpl-passenger-card');
      const list = document.getElementById('passengers-list');
      if (!tpl || !list) return;
      const node = tpl.content.firstElementChild.cloneNode(true);
      node.dataset.passengerId = uuid();
      list.insertBefore(node, document.querySelector('[data-add-passenger]'));
      bindPassengerRemove(node);
      window.LyziusIcons?.hydrate();
      onChange();
    });

    document.querySelectorAll('[data-remove-row]').forEach(bindRemoveRow);
    document.querySelectorAll('[data-remove-passenger]').forEach(bindPassengerRemove);
  }

  function bindRemoveRow(el) {
    if (!(el instanceof Element)) return;
    const btn = el.matches('[data-remove-row]') ? el : el.querySelector('[data-remove-row]');
    btn?.addEventListener('click', () => {
      el.closest('[data-row]')?.remove();
      onChange();
    });
  }

  function bindPassengerRemove(el) {
    if (!(el instanceof Element)) return;
    const btn = el.matches('[data-remove-passenger]') ? el : el.querySelector('[data-remove-passenger]');
    btn?.addEventListener('click', () => {
      const cards = document.querySelectorAll('#passengers-list .passenger-card');
      if (cards.length <= 1) return;
      el.closest('.passenger-card')?.remove();
      onChange();
    });
  }

  function onChange() {
    scheduleSave();
    if (previewVisible) schedulePreview();
  }

  document.getElementById('itinerary-form-root')?.addEventListener('input', onChange);
  document.getElementById('itinerary-form-root')?.addEventListener('change', onChange);
  document.getElementById('itinerary-title')?.addEventListener('input', onChange);

  document.getElementById('status-toggle')?.addEventListener('click', () => {
    status = status === 'draft' ? 'ready' : 'draft';
    const btn = document.getElementById('status-toggle');
    if (btn) {
      btn.className = `status-pill status-pill--${status}`;
      btn.innerHTML = status === 'ready' ? '✓ Ready' : '◷ Draft';
    }
    onChange();
  });

  document.getElementById('save-draft')?.addEventListener('click', async () => {
    await saveNow();
    const label = document.getElementById('save-label');
    if (label) {
      label.textContent = 'Saved';
      setTimeout(() => { label.textContent = 'Save draft'; }, 2000);
    }
  });

  function setPreviewVisible(v) {
    previewVisible = v;
    const panel = document.getElementById('editor-preview-panel');
    const label = document.getElementById('preview-toggle-label');
    if (panel) panel.style.display = v ? '' : 'none';
    if (label) label.textContent = v ? 'Hide preview' : 'Show preview';
    if (v) schedulePreview();
  }

  document.getElementById('toggle-preview')?.addEventListener('click', () => setPreviewVisible(!previewVisible));
  document.getElementById('toggle-preview-mobile')?.addEventListener('click', () => {
    mobileTab = mobileTab === 'edit' ? 'preview' : 'edit';
    updateMobileLayout();
  });

  document.querySelectorAll('#mobile-tabs [data-mobile-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      mobileTab = btn.getAttribute('data-mobile-tab');
      updateMobileLayout();
    });
  });

  function updateMobileLayout() {
    const formPanel = document.getElementById('editor-form-panel');
    const previewPanel = document.getElementById('editor-preview-panel');
    document.querySelectorAll('#mobile-tabs button').forEach((b) => {
      b.classList.toggle('is-active', b.dataset.mobileTab === mobileTab);
    });
    if (window.innerWidth < 1024) {
      formPanel?.classList.toggle('is-mobile-hidden', mobileTab !== 'edit');
      previewPanel?.classList.toggle('is-mobile-hidden', mobileTab !== 'preview');
      if (mobileTab === 'preview') schedulePreview();
    }
  }

  document.getElementById('export-pdf')?.addEventListener('click', async () => {
    const label = document.getElementById('export-label');
    try {
      if (label) label.textContent = 'Building PDF…';
      await refreshPreview();
      const title = document.getElementById('itinerary-title')?.value.trim() || 'itinerary';
      await window.LyziusPdfExport.exportPages('[data-itinerary-export-page]', title);
    } catch (e) {
      alert('Could not generate the PDF file. Try again or switch browsers if it keeps failing.');
      console.error(e);
    } finally {
      if (label) label.textContent = 'Export PDF';
    }
  });

  bindDynamicRows();
  updateMobileLayout();
  refreshPreview().catch(console.error);
})();
