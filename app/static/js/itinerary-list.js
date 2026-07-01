(function () {
  document.querySelectorAll('tr[data-href]').forEach((row) => {
    row.addEventListener('click', () => {
      const href = row.getAttribute('data-href');
      if (href) window.location.href = href;
    });
  });

  const modal = document.getElementById('delete-modal');
  const deleteForm = document.getElementById('delete-form');
  const deleteCancel = document.getElementById('delete-cancel');

  document.querySelectorAll('[data-menu-toggle]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-menu-toggle');
      document.querySelectorAll('[data-menu]').forEach((menu) => {
        const open = menu.getAttribute('data-menu') === id && menu.hidden;
        menu.hidden = !open;
      });
    });
  });

  document.addEventListener('pointerdown', (e) => {
    if (!(e.target instanceof Element)) return;
    if (!e.target.closest('[data-overflow-root]') && !e.target.closest('[data-menu-toggle]')) {
      document.querySelectorAll('[data-menu]').forEach((m) => { m.hidden = true; });
    }
  });

  document.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = btn.getAttribute('data-delete');
      if (!modal || !deleteForm || !id) return;
      document.querySelectorAll('[data-menu]').forEach((m) => {
        m.hidden = true;
      });
      deleteForm.setAttribute('action', `/itineraries/${id}/delete`);
      modal.hidden = false;
    });
  });

  deleteCancel?.addEventListener('click', () => {
    if (modal) modal.hidden = true;
    deleteForm?.setAttribute('action', '#');
  });

  modal?.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.hidden = true;
      deleteForm?.setAttribute('action', '#');
    }
  });

  const searchInput = document.getElementById('search-input');
  const filters = document.getElementById('list-filters');
  let searchTimer;
  searchInput?.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => filters?.requestSubmit(), 320);
  });
})();
