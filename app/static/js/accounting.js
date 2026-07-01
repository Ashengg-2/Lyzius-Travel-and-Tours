(function () {
  const root = document.getElementById('accounting-root');
  if (!root) return;

  const saveUrl = root.dataset.saveUrl;
  const exportUrl = root.dataset.exportUrl;
  let saveTimer;

  function uuid() {
    return `acct_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  function collectSnapshot() {
    const snapshot = {
      clientName: '',
      clientCompany: '',
      clientEmail: '',
      clientPhone: '',
      clientNotes: '',
      payables: [],
      receivables: [],
    };
    document.querySelectorAll('[data-acct]').forEach((el) => {
      snapshot[el.getAttribute('data-acct')] = el.value;
    });

    function readList(id) {
      const rows = [];
      document.querySelectorAll(`#${id} [data-ledger-row]`).forEach((row) => {
        rows.push({
          id: row.dataset.id || uuid(),
          description: row.querySelector('[data-line="description"]')?.value || '',
          counterparty: row.querySelector('[data-line="counterparty"]')?.value || '',
          amount: row.querySelector('[data-line="amount"]')?.value || '',
        });
      });
      return rows;
    }

    snapshot.payables = readList('payables-list');
    snapshot.receivables = readList('receivables-list');
    return snapshot;
  }

  function updateTotals(totals) {
    if (!totals) return;
    const pay = document.getElementById('total-payables');
    const rec = document.getElementById('total-receivables');
    const net = document.getElementById('net-income');
    if (pay) pay.textContent = `PHP ${totals.payable_sum_fmt}`;
    if (rec) rec.textContent = `PHP ${totals.receivable_sum_fmt}`;
    if (net) {
      net.textContent = `PHP ${totals.net_fmt}`;
      net.style.color = totals.net >= 0 ? '#047857' : '#c0392b';
    }
  }

  async function save() {
    const snapshot = collectSnapshot();
    const res = await fetch(saveUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snapshot),
    });
    if (!res.ok) throw new Error('Save failed');
    const data = await res.json();
    if (data.totals) updateTotals(data.totals);
    return data;
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => save().catch(console.error), 420);
  }

  function makeLedgerRow() {
    const div = document.createElement('div');
    div.className = 'card flex gap-2 mb-2';
    div.style.cssText = 'padding:0.75rem;flex-wrap:wrap';
    div.dataset.ledgerRow = '';
    div.dataset.id = uuid();
    div.innerHTML = `
      <input class="input" style="flex:1;min-width:140px" data-line="description" placeholder="Description">
      <input class="input" style="flex:1;min-width:120px" data-line="counterparty" placeholder="Party">
      <input class="input input--mono" style="width:8rem" data-line="amount" placeholder="0.00">
      <button type="button" class="btn--icon" data-remove-ledger><span data-icon="x"></span></button>`;
    bindLedgerRow(div);
    window.LyziusIcons?.hydrate();
    return div;
  }

  function bindLedgerRow(row) {
    row.querySelector('[data-remove-ledger]')?.addEventListener('click', () => {
      row.remove();
      scheduleSave();
    });
    row.querySelectorAll('input').forEach((inp) => {
      inp.addEventListener('input', scheduleSave);
    });
  }

  document.querySelectorAll('[data-add-ledger]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-add-ledger');
      const list = document.getElementById(`${target}-list`);
      if (!list) return;
      list.appendChild(makeLedgerRow());
      scheduleSave();
    });
  });

  document.querySelectorAll('[data-ledger-row]').forEach(bindLedgerRow);
  root.querySelectorAll('[data-acct]').forEach((el) => el.addEventListener('input', scheduleSave));

  document.getElementById('reload-accounting')?.addEventListener('click', () => {
    window.location.reload();
  });

  document.getElementById('export-accounting-pdf')?.addEventListener('click', async () => {
    const btn = document.getElementById('export-accounting-pdf');
    try {
      if (btn) btn.disabled = true;
      const snapshot = collectSnapshot();
      const res = await fetch(exportUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snapshot),
      });
      const html = await res.text();
      const exportRoot = document.getElementById('accounting-export-root');
      if (exportRoot) exportRoot.innerHTML = html;
      const slug = (snapshot.clientName || 'accounting-sheet').trim().replace(/\s+/g, ' ');
      await window.LyziusPdfExport.exportPages('[data-accounting-export-page]', slug);
    } catch (e) {
      alert('Could not build accounting PDF.');
      console.error(e);
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  save().catch(console.error);
})();
