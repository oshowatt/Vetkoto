if (!window.VetKotoAPI) {
  console.warn('VetKotoAPI not ready. Ensure api.js loads before ui.js, and Supabase client is initialized.');
}


// Toggle sidebar visibility on button click
const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
const sidebar = document.getElementById('sidebar');
const mainContent = document.getElementById('app');

toggleSidebarBtn.addEventListener('click', () => {
  sidebar.classList.toggle('open');  // Add or remove the 'open' class to show/hide the sidebar
  mainContent.classList.toggle('shift');  // Add or remove the 'shift' class to shift the main content
});


(function () {
  'use strict';
  const $  = (sel, ctx=document) => ctx.querySelector(sel);
  const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));
  const schema = window.VetKotoSchema || {};
  const api    = window.VetKotoAPI;

  

  
  const FK = {
    patients: { owner_id: { entity: 'owners', labelKey: 'owner_name' } },
    visits:   { patient_id: { entity: 'patients', labelKey: 'patient_name' }, veterinarian_id: { entity: 'veterinarians', labelKey: 'vet_name' } },
    prescriptions: { visit_id: { entity: 'visits', labelKey: 'visit_id' }, medication_id: { entity: 'medications', labelKey: 'med_name' } },
    allergies: { patient_id: { entity: 'patients', labelKey: 'patient_name' } },
    vaccinations: { patient_id: { entity: 'patients', labelKey: 'patient_name' } }
  };

  function renderTableHeader(entity, table){
    const tr = document.createElement('tr');
    schema[entity].columns.forEach(col => {
      const th = document.createElement('th'); th.textContent = col.label; tr.appendChild(th);
    });
    table.tHead.innerHTML = ''; table.tHead.appendChild(tr);
  }

  async function renderTableBody(entity, table, filter){
    const rows = await api.list(entity, { filter });
    const tbody = table.tBodies[0]; tbody.innerHTML = '';
    rows.forEach(row => {
      const tr = document.createElement('tr');
      schema[entity].columns.forEach(col => {
        const td = document.createElement('td');
        if (col.key === 'actions') {
          td.innerHTML = `
            <button class="btn" data-edit="${row[schema[entity].columns[0].key] || row.id}" data-entity="${entity}">Edit</button>
            <button class="btn danger" data-del="${row[schema[entity].columns[0].key] || row.id}" data-entity="${entity}">Delete</button>
          `;
        } else {
          td.textContent = row[col.key] ?? '';
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }

  async function buildFieldInput(entity, f, record) {
    const fkConfig = FK[entity]?.[f.key];
    if (fkConfig) {
      const sel = document.createElement('select');
      sel.className = 'input'; sel.name = f.key;
      const opts = await api.options(fkConfig.entity, fkConfig.labelKey, fkConfig.valueKey);
      sel.innerHTML = `<option value="">— Select —</option>` +
        opts.map(o => `<option value="${o.value}">${o.label}</option>`).join('');
      if (record && record[f.key] != null) sel.value = record[f.key];
      return sel;
    } else {
      const input = document.createElement('input');
      input.className = 'input'; input.name = f.key; input.type = f.type || 'text';
      if (f.placeholder) input.placeholder = f.placeholder;
      if (f.required) input.required = true;
      if (record && record[f.key] != null) input.value = record[f.key];
      return input;
    }
  }

  async function buildForm(entity, record = {}) {
    const wrap = $('#formFields'); if (!wrap) return;
    wrap.innerHTML = '';
    // hidden PK for edit
    const pk = schema[entity]?.columns?.[0]?.key;
    if (record && pk && record[pk] != null) {
      const hid = document.createElement('input');
      hid.type = 'hidden'; hid.name = pk; hid.value = record[pk];
      wrap.appendChild(hid);
    }
    for (const f of schema[entity].fields) {
      const div = document.createElement('div'); div.className = 'field';
      const label = document.createElement('label'); label.textContent = f.label + (f.required ? ' *' : '');
      const input = await buildFieldInput(entity, f, record);
      div.append(label, input); wrap.appendChild(div);
    }
  }

  async function openModal(entity, mode='create', id=null){
    const titleEl = $('#modalTitle'); const formEl = $('#entityForm'); const delBtn = $('#deleteBtn'); const backdrop = $('#modalBackdrop');
    const nice = s => s.replace(/\b\w/g, c => c.toUpperCase());
    titleEl.textContent = `${mode === 'create' ? 'Create' : 'Update'} ${nice(entity)}`;
    formEl.dataset.entity = entity; formEl.dataset.mode = mode;
    if (delBtn) delBtn.hidden = mode !== 'edit';
    const record = mode === 'edit' && id ? await api.get(entity, id) : {};
    await buildForm(entity, record);
    backdrop.style.display = 'flex';
  }

  function closeModal(){ $('#modalBackdrop').style.display = 'none'; }

  function hydrateEntitySection(entity){
    const root = document.getElementById(entity); if (!root) return;
    const table = root.querySelector('table');
    if (table) { if (!table.tHead) table.createTHead(); if (!table.tBodies[0]) table.createTBody(); renderTableHeader(entity, table); renderTableBody(entity, table); }
    // Create button
    const createBtn = root.querySelector('[data-action="create"]');
    if (createBtn) createBtn.addEventListener('click', () => openModal(entity, 'create'));
    // Search (Owners & Patients wired; copy this pattern for others)
    const searchEl = root.querySelector('input[id$="Search"]');
    if (searchEl && table) {
      searchEl.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        const firstTextCol = schema[entity].columns.find(c => c.key !== 'actions' && c.key !== (schema[entity].columns[0].key));
        const col = (entity === 'owners') ? 'name' : (entity === 'patients' ? 'name' : (firstTextCol?.key || schema[entity].columns[1].key));
        const filter = query ? { column: col, value: query } : undefined;
        renderTableBody(entity, table, filter);
      });
    }
  }

  // expose UI helpers
  window.VetKotoUI = { $, $$, openModal, closeModal, hydrateEntitySection };

  // modal controls
  $('#closeModal')?.addEventListener('click', closeModal);
  $('#resetBtn')?.addEventListener('click', () => $('#entityForm')?.reset());

  $('#entityForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.currentTarget; const entity = form.dataset.entity; const mode = form.dataset.mode;
    const payload = Object.fromEntries(new FormData(form).entries());
    try {
      const res = mode === 'create' ? await api.create(entity, payload) : await api.update(entity, payload);
      alert(`${mode.toUpperCase()} → ${entity}\n` + JSON.stringify(res, null, 2));
      closeModal();
      const table = document.querySelector(`#${entity} table`);
      if (table) renderTableBody(entity, table);
    } catch (err) {
      alert('Error: ' + (err?.message || err));
      console.error(err);
    }
  });

  // edit/delete delegation
  document.body.addEventListener('click', async (e) => {
    const t = e.target;
    if (t.matches?.('[data-edit]')) {
      openModal(t.dataset.entity, 'edit', t.dataset.edit);
    }
    if (t.matches?.('[data-del]')) {
      if (confirm('Delete this record?')) {
        try {
          await api.remove(t.dataset.entity, t.dataset.del);
          alert(`Deleted ${t.dataset.entity} id=${t.dataset.del}`);
          const table = document.querySelector(`#${t.dataset.entity} table`);
          if (table) renderTableBody(t.dataset.entity, table);
        } catch (err) {
          alert('Error: ' + (err?.message || err));
          console.error(err);
        }
      }
    }
  });
})();
