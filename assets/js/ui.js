// assets/js/ui.js
(function () {
  'use strict';

  // ---------- DOM helpers ----------
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  // ---------- External modules ----------
  const schema = window.VetKotoSchema || {};
  const api    = window.VetKotoAPI;

  if (!api) {
    console.warn('VetKotoAPI not found. Using UI without data layer.');
  }

  // ---------- Table rendering ----------
  function renderTableHeader(entity, table) {
    if (!schema[entity]) return;
    const tr = document.createElement('tr');
    schema[entity].columns.forEach(col => {
      const th = document.createElement('th');
      th.textContent = col.label;
      tr.appendChild(th);
    });
    table.tHead.innerHTML = '';
    table.tHead.appendChild(tr);
  }

  async function renderTableBody(entity, table) {
    if (!schema[entity]) return;
    // Fallback to empty list if API missing
    const rows = api?.list ? await api.list(entity) : [];
    const tbody = table.tBodies[0];
    tbody.innerHTML = '';
    rows.forEach(row => {
      const tr = document.createElement('tr');
      schema[entity].columns.forEach(col => {
        const td = document.createElement('td');
        if (col.key === 'actions') {
          td.innerHTML =
            `<button class="btn" data-edit="${row.id}" data-entity="${entity}">Edit</button>
             <button class="btn danger" data-del="${row.id}" data-entity="${entity}">Delete</button>`;
        } else {
          td.textContent = row[col.key] ?? '';
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }

  // ---------- Modal + Form ----------
  function buildForm(entity, record = {}) {
    const wrap = $('#formFields');
    if (!wrap || !schema[entity]) return;
    wrap.innerHTML = '';
    schema[entity].fields.forEach(f => {
      const div   = document.createElement('div'); div.className = 'field';
      const label = document.createElement('label');
      label.textContent = f.label + (f.required ? ' *' : '');
      const input = document.createElement('input');
      input.className = 'input';
      input.name = f.key;
      input.type = f.type || 'text';
      if (f.placeholder) input.placeholder = f.placeholder;
      if (f.required)    input.required = true;
      if (record[f.key] != null) input.value = record[f.key];
      div.append(label, input);
      wrap.appendChild(div);
    });
  }

  function openModal(entity, mode = 'create', record = {}) {
    const titleEl   = $('#modalTitle');
    const formEl    = $('#entityForm');
    const deleteBtn = $('#deleteBtn');
    const backdrop  = $('#modalBackdrop');

    if (!formEl || !titleEl || !backdrop) return;
    titleEl.textContent = `${mode === 'create' ? 'Create' : 'Update'} ${entity.replace(/\b\w/g, c => c.toUpperCase())}`;
    formEl.dataset.entity = entity;
    formEl.dataset.mode   = mode;
    if (deleteBtn) deleteBtn.hidden = mode !== 'edit';

    buildForm(entity, record);
    backdrop.style.display = 'flex';
  }

  function closeModal() {
    const backdrop = $('#modalBackdrop');
    if (backdrop) backdrop.style.display = 'none';
  }

  // ---------- Section hydration ----------
  function hydrateEntitySection(entity) {
    const root  = document.getElementById(entity);
    if (!root) return;
    const table = root.querySelector('table');
    if (table) {
      if (!table.tHead) table.createTHead();
      if (!table.tBodies[0]) table.createTBody();
      renderTableHeader(entity, table);
      renderTableBody(entity, table);
    }
    const createBtn = root.querySelector('[data-action="create"]');
    if (createBtn) {
      createBtn.addEventListener('click', () => openModal(entity, 'create'));
    }
  }

  // ---------- Expose small UI API ----------
  window.VetKotoUI = { $, $$, openModal, closeModal, hydrateEntitySection };

  // ---------- Modal wiring ----------
  $('#closeModal')?.addEventListener('click', closeModal);
  $('#resetBtn')?.addEventListener('click', () => $('#entityForm')?.reset());

  $('#entityForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form   = e.currentTarget;
    const entity = form.dataset.entity;
    const mode   = form.dataset.mode;
    const payload = Object.fromEntries(new FormData(form).entries());
    if (!api) return;

    const res = mode === 'create'
      ? await api.create(entity, payload)
      : await api.update(entity, payload);

    alert(`[Outline] ${mode.toUpperCase()} → ${entity}\n` + JSON.stringify(res, null, 2));
    closeModal();

    const table = document.querySelector(`#${entity} table`);
    if (table) renderTableBody(entity, table);
  });

  // ---------- Delete via event delegation ----------
  document.body.addEventListener('click', async (e) => {
    const t = e.target;
    if (t.matches?.('[data-edit]')) {
      openModal(t.dataset.entity, 'edit', { id: t.dataset.edit });
    }
    if (t.matches?.('[data-del]')) {
      if (!api) return;
      if (confirm('Delete this record?')) {
        await api.remove(t.dataset.entity, t.dataset.del);
        alert(`[Outline] DELETE ${t.dataset.entity} id=${t.dataset.del}`);
        const table = document.querySelector(`#${t.dataset.entity} table`);
        if (table) renderTableBody(t.dataset.entity, table);
      }
    }
  });

})();
