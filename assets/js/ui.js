// Clean UI helpers: rendering, form building, modal integration, and CSV/import support.

(function () {
  'use strict';
  const $ = (s, ctx = document) => ctx.querySelector(s);
  const $$ = (s, ctx = document) => Array.from((ctx || document).querySelectorAll(s));
  const schema = window.VetKotoSchema || {};
  const api = window.VetKotoAPI;

  // Foreign-key mapping: fkKey -> { entity, displayKey, labelKey }
  const FK = {
    patients: { owner_id: { entity: 'owners', displayKey: 'owner_name', labelKey: 'owner_name' } },
    visits: {
      patient_id: { entity: 'patients', displayKey: 'patient_name', labelKey: 'patient_name' },
      veterinarian_id: { entity: 'veterinarians', displayKey: 'vet_name', labelKey: 'vet_name' }
    },
    prescriptions: {
      medication_id: { entity: 'medications', displayKey: 'med_name', labelKey: 'med_name' },
      visit_id: { entity: 'visits', displayKey: 'visit_id', labelKey: 'visit_id' },
      patient_id: { entity: 'patients', displayKey: 'patient_name', labelKey: 'patient_name' }
    },
    allergies: { patient_id: { entity: 'patients', displayKey: 'patient_name', labelKey: 'patient_name' } },
    vaccinations: { patient_id: { entity: 'patients', displayKey: 'patient_name', labelKey: 'patient_name' } },
    diagnoses: {
      visit_id: { entity: 'visits', displayKey: 'vet_name', labelKey: 'vet_name' },
      visit_id: { entity: 'visits', displayKey: 'visit_id', labelKey: 'visit_id' }
    }
  };

  const _CACHE = new Map();
  async function cachedGet(entity, id) {
    if (id == null) return null;
    const key = `${entity}:${id}`;
    if (_CACHE.has(key)) return _CACHE.get(key);
    try {
      const rec = await api.get(entity, id);
      _CACHE.set(key, rec);
      return rec;
    } catch (e) {
      return null;
    }
  }

  function renderTableHeader(entity, table) {
    const cols = schema[entity]?.columns || [];
    let thead = table.tHead || table.createTHead();
    thead.innerHTML = '';
    const tr = document.createElement('tr');
    cols.forEach(c => {
      const th = document.createElement('th');
      th.textContent = c.label || c.key;
      tr.appendChild(th);
    });
    thead.appendChild(tr);
  }

  async function renderTableBody(entity, table, filter) {
    const cols = schema[entity]?.columns || [];
    let tbody = table.tBodies[0] || table.createTBody();
    tbody.innerHTML = '';

    // Helper: try many strategies to get a display value for a column
    async function resolveCellValue(entity, col, row) {
      // 1) direct value
      if (row[col.key] != null && row[col.key] !== '') return row[col.key];

      // 2) if column is a "_name" style, try related nested object fields
      // e.g., patient_name -> look for row.patients?.name, row.patient?.name, row.patient_name, row.patients_name
      const nameSuffix = col.key.endsWith('_name');
      if (nameSuffix) {
        const base = col.key.replace(/_name$/, '');
        const plural = base.endsWith('s') ? base : base + 's';
        const candidates = [base, plural, base + 's', base + '_id', base + 's'];
        for (const k of candidates) {
          const nested = row[k];
          if (nested && typeof nested === 'object') {
            if (nested.name != null) return nested.name;
            // prefer label-like keys
            if (nested.label != null) return nested.label;
            // any string-ish property
            for (const p of ['title','full_name','patient_name','owner_name','vet_name']) {
              if (nested[p] != null) return nested[p];
            }
          }
        }
      }

      // Special case for diagnoses: resolve veterinarian name via visit_id -> veterinarian_id -> vet_name
if (entity === 'diagnoses' && col.key === 'vet_name') {
  if (row.visit_id) {
    try {
      const visit = await api.get('visits', row.visit_id);
      if (visit && visit.veterinarian_id) {
        const vet = await cachedGet('veterinarians', visit.veterinarian_id);
        if (vet && vet.vet_name) return vet.vet_name;
      }
    } catch (e) { /* ignore */ }
  }
  return '';
}

if (entity === 'diagnoses' && col.key === 'patient_name') {
  if (row.visit_id) {
    try {
      const visit = await api.get('visits', row.visit_id);
      if (visit && visit.patient_id) {
        const patient = await cachedGet('patients', visit.patient_id);
        if (patient && patient.patient_name) return patient.patient_name;
      }
    } catch (e) { /* ignore */ }
  }
  return '';
}


// Special case for prescriptions: resolve patient_name via visit_id -> patient_id -> patient_name
if (entity === 'prescriptions' && col.key === 'patient_name') {
  if (row.visit_id) {
    try {
      const visit = await api.get('visits', row.visit_id);
      if (visit && visit.patient_id) {
        const patient = await cachedGet('patients', visit.patient_id);
        if (patient && patient.patient_name) return patient.patient_name;
      }
    } catch (e) { /* ignore */ }
  }
  return '';
}



      // 3) Try any nested object that contains a common label/key
      for (const k of Object.keys(row)) {
        const val = row[k];
        if (val && typeof val === 'object') {
          if (val[col.key] != null) return val[col.key];
          if (val.name != null) return val.name;
          if (val.label != null) return val.label;
          if (val.full_name != null) return val.full_name;
        }
      }

      // 4) FK-based resolution: find FK entry whose displayKey matches this column OR where this column looks like a display key
      const fkEntry = Object.entries(FK[entity] || {}).find(([, cfg]) => {
        return cfg.displayKey === col.key || cfg.labelKey === col.key || (nameSuffix && cfg.displayKey && cfg.displayKey.endsWith('_name') && cfg.displayKey === col.key);
      });
      if (fkEntry) {
        const [fkKey, cfg] = fkEntry;
        // id may be present in different places
        const id = row[fkKey] ?? row[fkKey.replace(/_id$/, '')] ?? row[`${cfg.entity}_id`];
        if (id) {
          const rec = await cachedGet(cfg.entity, id);
          if (rec) return rec[cfg.labelKey] ?? rec.name ?? '';
        }
      }

      // 5) Fallback: look for "..._name" fields computed by views
      const alt = Object.keys(row).find(k => k.toLowerCase().endsWith('_name') && k.toLowerCase().includes(col.key.replace('_name','')));
      if (alt) return row[alt];

      // Special case for diagnoses: resolve patient_name via visit_id -> patient_id -> patient_name
      if (entity === 'diagnoses' && col.key === 'patient_name') {
        if (row.visit_id) {
          try {
            const visit = await api.get('visits', row.visit_id);
            if (visit && visit.patient_id) {
              const patient = await cachedGet('patients', visit.patient_id);
              if (patient && patient.patient_name) return patient.patient_name;
            }
          } catch (e) { /* ignore */ }
        }
        return '';
      }

      return row[col.key] ?? '';
    }

    const rows = await api.list(entity, { filter });
    for (const row of rows) {
      const tr = document.createElement('tr');
      for (const col of cols) {
        const td = document.createElement('td');
        if (col.key === 'actions') {
          const pk = schema[entity].columns[0].key;
          const idVal = row[pk] ?? row.id ?? '';
          td.innerHTML = `
            <button class="btn" data-edit="${idVal}" data-entity="${entity}">Edit</button>
            <button class="btn danger" data-del="${idVal}" data-entity="${entity}">Delete</button>
          `;
        } else {
          td.textContent = await resolveCellValue(entity, col, row);
        }
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
  }

  async function buildFieldInput(entity, field, record) {
    // If foreign-key configured, build select options
    const fkConfigEntry = Object.entries(FK[entity] || {}).find(([fk]) => fk === field.key);
    if (fkConfigEntry) {
      const sel = document.createElement('select');
      sel.className = 'input';
      sel.name = field.key;
      sel.innerHTML = '<option value="">— Select —</option>';
      const cfg = fkConfigEntry[1];
      try {
        const opts = await api.options(cfg.entity, cfg.labelKey);
        opts.forEach(o => {
          const opt = document.createElement('option');
          opt.value = o.value; opt.textContent = o.label;
          sel.appendChild(opt);
        });
        if (record && record[field.key] != null) sel.value = record[field.key];
      } catch (e) {
        // fallback to empty select
      }
      return sel;
    }

    // default input
    const input = document.createElement('input');
    input.className = 'input';
    input.name = field.key;
    input.type = field.type || 'text';
    if (field.placeholder) input.placeholder = field.placeholder;
    if (field.required) input.required = true;
    if (record && record[field.key] != null) input.value = record[field.key];
    return input;
  }

  async function buildForm(entity, record = {}) {
    const wrap = document.getElementById('formFields');
    if (!wrap) return;
    wrap.innerHTML = '';
    const pk = schema[entity]?.columns?.[0]?.key;
    if (record && pk && record[pk] != null) {
      const hid = document.createElement('input');
      hid.type = 'hidden'; hid.name = pk; hid.value = record[pk];
      wrap.appendChild(hid);
    }
    for (const f of (schema[entity]?.fields || [])) {
      const div = document.createElement('div'); div.className = 'field';
      const label = document.createElement('label'); label.textContent = f.label + (f.required ? ' *' : '');
      const input = await buildFieldInput(entity, f, record);
      div.append(label, input);
      wrap.appendChild(div);
    }
  }

  async function openModal(entity, mode = 'create', id = null) {
    const titleEl = $('#modalTitle'); const formEl = $('#entityForm'); const deleteBtn = $('#deleteBtn');
    const nice = s => s.replace(/\b\w/g, c => c.toUpperCase());
    titleEl && (titleEl.textContent = `${mode === 'create' ? 'Create' : 'Update'} ${nice(entity)}`);
    if (formEl) { formEl.dataset.entity = entity; formEl.dataset.mode = mode; }
    deleteBtn && (deleteBtn.hidden = mode !== 'edit');
    const record = mode === 'edit' && id ? await api.get(entity, id) : {};
    await buildForm(entity, record);
    // use VetKotoModal if available to ensure correct placement
    const modal = document.querySelector('.modal');
    if (window.VetKotoModal && typeof window.VetKotoModal.open === 'function') {
      window.VetKotoModal.open(modal);
    } else {
      const backdrop = document.getElementById('modalBackdrop');
      if (backdrop) backdrop.style.display = 'flex';
    }
  }

  function closeModal() {
    if (window.VetKotoModal && typeof window.VetKotoModal.close === 'function') {
      const modal = document.querySelector('.modal'); if (modal) window.VetKotoModal.close(modal);
    } else {
      const backdrop = document.getElementById('modalBackdrop'); if (backdrop) backdrop.style.display = 'none';
    }
  }

  async function saveEntity(entity, mode = 'create', payload) {
  try {
    const res = mode === 'create' 
      ? await api.create(entity, payload) 
      : await api.update(entity, payload);

    closeModal();
    alert(`${entity.toUpperCase()} successfully ${mode === 'create' ? 'created' : 'updated'}`);

    const table = document.querySelector(`#${entity} table`);
    if (table) renderTableBody(entity, table);
  } catch (err) {
    console.error(err);
    alert('Save failed: ' + (err?.message || err));
  }
}
  

  

function hydrateEntitySection(entity) {
  const root = document.getElementById(entity); 
  if (!root) return;

  const table = root.querySelector('table');
  if (table) {
    if (!table.tHead) table.createTHead();
    if (!table.tBodies[0]) table.createTBody();
    renderTableHeader(entity, table);
    renderTableBody(entity, table);
  }

  const createBtn = root.querySelector('[data-action="create"]');
  if (createBtn) createBtn.addEventListener('click', () => openModal(entity, 'create'));

  const searchEl = root.querySelector('input[id$="Search"]');
if (searchEl && table) {
  searchEl.addEventListener('input', async (e) => {
  const query = e.target.value.trim();
  
  // Dynamically determine the column to filter based on the schema for the given entity
  const firstTextCol = (schema[entity]?.columns || []).find(c => c.key !== 'actions' && c.key !== schema[entity].columns[0].key);
  let col;
  
  if (entity === 'visits') {
    col = 'patients.patient_name'; // Search patient_name in the patients table for visits
  } else {
    col = firstTextCol?.key || schema[entity].columns[1]?.key;
  }

  const filter = query ? { column: col, value: query } : undefined;

  try {
    // Modify the query to ensure the correct "patients" table is joined for visits
    const rows = await api.list(entity, { filter });
    renderTableBody(entity, table, filter);
  } catch (err) {
    console.error('Search API error:', err);
    alert('Error while searching: ' + (err.message || err));
  }
});

}


}


  // Expose minimal helpers
  window.VetKotoUI = { $, $$, openModal, closeModal, hydrateEntitySection };

  // Delegated handlers
  document.addEventListener('click', async (e) => {
    const edit = e.target.closest('[data-edit]');
    if (edit) { e.preventDefault(); openModal(edit.dataset.entity, 'edit', edit.dataset.edit); return; }
    const del = e.target.closest('[data-del]');
    if (del) {
      e.preventDefault();
      if (confirm('Delete this record?')) {
        try {
          await api.remove(del.dataset.entity, del.dataset.del);
          const table = document.querySelector(`#${del.dataset.entity} table`);
          if (table) renderTableBody(del.dataset.entity, table);
        } catch (err) { console.error(err); alert('Delete failed: ' + (err?.message || err)); }
      }
      return;
    }
    // catch create buttons inside modal toolbar etc (handled above), CSV import buttons handled by csv-tools.js
  });

 document.addEventListener('submit', async (e) => {
  const form = e.target;
  if (!form || !form.matches('#entityForm')) return;
  e.preventDefault();
  const entity = form.dataset.entity;
  const mode = form.dataset.mode;
  const payload = Object.fromEntries(new FormData(form).entries());

  try {
    // Call the new saveEntity function
    await saveEntity(entity, mode, payload);  // <-- this is the new call

    // Optionally reload table or do other actions
    const table = document.querySelector(`#${entity} table`);
    if (table) renderTableBody(entity, table);
  } catch (err) {
    console.error(err);
    alert('Save failed: ' + (err?.message || err));
  }
});

  // auto-hydrate known schema sections when DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    Object.keys(schema).forEach(k => {
      try { hydrateEntitySection(k); } catch (e) { /* ignore */ }
    });

    // wire simple close/reset controls if present
    $('#closeModal')?.addEventListener('click', closeModal);
    $('#resetBtn')?.addEventListener('click', () => $('#entityForm')?.reset());
  });

})();

// ui.js

(function () {
  'use strict';

  // Initialize search functionality for specific entities
  document.addEventListener('DOMContentLoaded', () => {
    // Use the setupSearch from search.js
    VetKotoSearch.setupSearch('owners');  // for Owners section
    VetKotoSearch.setupSearch('patients'); // for Patients section
    VetKotoSearch.setupSearch('visits');
    VetKotoSearch.setupSearch('diagnoses');
    VetKotoSearch.setupSearch('medications');
    VetKotoSearch.setupSearch('prescriptions');
    VetKotoSearch.setupSearch('allergies');
    VetKotoSearch.setupSearch('vaccinations');
    VetKotoSearch.setupSearch('veterinarians');
  });

})();


