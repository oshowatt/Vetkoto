// Complete ui.js — scoped form building, delegated handlers, CSV import fallback

if (!window.VetKotoAPI) {
  console.warn('VetKotoAPI not ready. Ensure api.js loads before ui.js, and Supabase client is initialized.');
}

const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
const sidebar = document.getElementById('sidebar');

const mainContent = document.getElementById('app');
if (toggleSidebarBtn) {
  toggleSidebarBtn.addEventListener('click', () => {
    sidebar?.classList.toggle('open');
    mainContent?.classList.toggle('shift');
  });
}

(function () {
  'use strict';

  const $  = (sel, ctx=document) => ctx.querySelector(sel);
  const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));
  const schema = window.VetKotoSchema || {};
  const api    = window.VetKotoAPI;

  // Foreign-key mapping for display labels
  const FK = {
    patients: { owner_id: { entity: 'owners', labelKey: 'owner_name' } },
    visits:   { patient_id: { entity: 'patients', labelKey: 'patient_name' }, veterinarian_id: { entity: 'veterinarians', labelKey: 'vet_name' } },
    prescriptions: { visit_id: { entity: 'visits', labelKey: 'visit_id' }, medication_id: { entity: 'medications', labelKey: 'med_name' } },
    allergies: { patient_id: { entity: 'patients', labelKey: 'patient_name' } },
    vaccinations: { patient_id: { entity: 'patients', labelKey: 'patient_name' } }
  };

  const _CACHE = new Map();
  async function cachedGet(entity, id) {
    const key = `${entity}:${id}`;
    if (_CACHE.has(key)) return _CACHE.get(key);
    try {
      const rec = await api.get(entity, id);
      _CACHE.set(key, rec);
      return rec;
    } catch (err) { return null; }
  }

  function renderTableHeader(entity, table){
    const tr = document.createElement('tr');
    (schema[entity].columns || []).forEach(col => {
      const th = document.createElement('th'); th.textContent = col.label; tr.appendChild(th);
    });
    table.tHead.innerHTML = ''; table.tHead.appendChild(tr);
  }

  async function renderTableBody(entity, table, filter){
    const rows = await api.list(entity, { filter });
    const tbody = table.tBodies[0]; tbody.innerHTML = '';

    async function resolveLabel(col, row) {
      if (row[col.key] != null && row[col.key] !== '') return row[col.key];
      const fkEntry = Object.entries(FK[entity] || {}).find(([, cfg]) => cfg.labelKey === col.key);
      if (fkEntry) {
        const [fkKey, cfg] = fkEntry;
        const id = row[fkKey];
        if (!id) return '';
        const rec = await cachedGet(cfg.entity, id);
        return rec ? (rec[cfg.labelKey] ?? rec.name ?? '') : '';
      }
      return row[col.key] ?? '';
    }

    for (const row of rows) {
      const tr = document.createElement('tr');
      for (const col of schema[entity].columns) {
        const td = document.createElement('td');
        if (col.key === 'actions') {
          const pkKey = schema[entity].columns[0].key;
          const idVal = row[pkKey] ?? row.id ?? '';
          td.innerHTML = `
            <button class="btn" data-edit="${idVal}" data-entity="${entity}">Edit</button>
            <button class="btn danger" data-del="${idVal}" data-entity="${entity}">Delete</button>
          `;
        } else {
          td.textContent = await resolveLabel(col, row);
        }
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
  }

  async function buildFieldInput(entity, f, record, ctx=document) {
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

  // ctx: element (modal or document) where form fields should be placed
  async function buildForm(ctx, entity, record = {}) {
    const wrap = ctx?.querySelector('#formFields') || $('#formFields');
    if (!wrap) return;
    wrap.innerHTML = '';
    const pk = schema[entity]?.columns?.[0]?.key;
    if (record && pk && record[pk] != null) {
      const hid = document.createElement('input');
      hid.type = 'hidden'; hid.name = pk; hid.value = record[pk];
      wrap.appendChild(hid);
    }
    for (const f of schema[entity].fields) {
      const div = document.createElement('div'); div.className = 'field';
      const label = document.createElement('label'); label.textContent = f.label + (f.required ? ' *' : '');
      const input = await buildFieldInput(entity, f, record, ctx);
      div.append(label, input); wrap.appendChild(div);
    }
  }

  async function openModal(entity, mode='create', id=null){
    const modalIdCandidate = document.getElementById(entity + 'Modal');
    const modalEl = modalIdCandidate || document.querySelector('.modal');

    const titleEl = modalEl ? $('#modalTitle', modalEl) : $('#modalTitle');
    const formEl  = modalEl ? $('#entityForm', modalEl) : $('#entityForm');
    const delBtn  = modalEl ? $('#deleteBtn', modalEl) : $('#deleteBtn');

    const nice = s => s.replace(/\b\w/g, c => c.toUpperCase());
    if (titleEl) titleEl.textContent = `${mode === 'create' ? 'Create' : 'Update'} ${nice(entity)}`;
    if (formEl) { formEl.dataset.entity = entity; formEl.dataset.mode = mode; }
    if (delBtn) delBtn.hidden = mode !== 'edit';
    const record = mode === 'edit' && id ? await api.get(entity, id) : {};

    await buildForm(modalEl || document, entity, record);

    const anyModal = modalEl || document.querySelector('.modal');
    if (anyModal && window.VetKotoModal && typeof window.VetKotoModal.open === 'function') {
      window.VetKotoModal.open(anyModal);
      return;
    }

    const backdrop = $('#modalBackdrop') || $('#modalBackground') || document.getElementById('modalBackdrop');
    if (backdrop) {
      backdrop.style.display = 'flex';
    } else if (anyModal) {
      anyModal.style.display = 'flex';
      anyModal.classList.add('open');
      anyModal.setAttribute('aria-hidden', 'false');
    } else {
      console.warn('openModal: no modal/backdrop found for', entity);
    }
  }

  function closeModal(){ const el = $('#modalBackdrop') || document.querySelector('.modal'); if (el) { if (el.classList && el.classList.contains('modal')) { if (window.VetKotoModal) window.VetKotoModal.close(el); } else el.style.display = 'none'; } }

  function hydrateEntitySection(entity){
    const root = document.getElementById(entity); if (!root) return;
    const table = root.querySelector('table');
    if (table) { if (!table.tHead) table.createTHead(); if (!table.tBodies[0]) table.createTBody(); renderTableHeader(entity, table); renderTableBody(entity, table); }
    const createBtn = root.querySelector('[data-action="create"]');
    if (createBtn) createBtn.addEventListener('click', () => openModal(entity, 'create'));
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

  window.VetKotoUI = { $, $$, openModal, closeModal, hydrateEntitySection };

  // modal action delegation (reset/close)
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (t.matches('#resetBtn') || t.closest('#resetBtn')) {
      const form = t.closest('.modal')?.querySelector('#entityForm') || document.querySelector('#entityForm');
      form?.reset();
    }
    if (t.matches('#closeModal') || t.closest('#closeModal')) {
      const modal = t.closest('.modal');
      if (modal && window.VetKotoModal) window.VetKotoModal.close(modal);
      else closeModal();
    }
  });

  // delegated submit handling for modal-local or global entityForm
  document.addEventListener('submit', async (e) => {
    const form = e.target;
    if (!form || !(form.matches('#entityForm') || form.closest('.modal'))) return;
    e.preventDefault();
    const entity = form.dataset.entity;
    const mode = form.dataset.mode;
    const payload = Object.fromEntries(new FormData(form).entries());
    try {
      const res = mode === 'create' ? await api.create(entity, payload) : await api.update(entity, payload);
      alert(`${mode.toUpperCase()} → ${entity}\n` + JSON.stringify(res, null, 2));
      // close modal
      const anyModal = form.closest('.modal') || document.getElementById(entity + 'Modal') || document.querySelector('.modal');
      if (anyModal && window.VetKotoModal && typeof window.VetKotoModal.close === 'function') {
        window.VetKotoModal.close(anyModal);
      } else {
        closeModal();
      }
      const table = document.querySelector(`#${entity} table`);
      if (table) renderTableBody(entity, table);
    } catch (err) {
      alert('Error: ' + (err?.message || err));
      console.error(err);
    }
  });

  // simple CSV parser fallback
  function parseCsvToJson(csvText) {
    if (!csvText) return [];
    const rows = [];
    const lines = csvText.split(/\r\n|\n/).filter(l => l.trim() !== '');
    if (lines.length === 0) return rows;
    function parseLine(line) {
      const fields = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i+1] === '"') { cur += '"'; i++; continue; }
          inQuotes = !inQuotes; continue;
        }
        if (ch === ',' && !inQuotes) { fields.push(cur); cur = ''; continue; }
        cur += ch;
      }
      fields.push(cur);
      return fields.map(s => s.trim());
    }
    const header = parseLine(lines[0]).map(h => h || 'col' + Math.random().toString(36).slice(2,6));
    for (let i = 1; i < lines.length; i++) {
      const vals = parseLine(lines[i]);
      const obj = {};
      for (let j = 0; j < header.length; j++) obj[header[j]] = vals[j] !== undefined ? vals[j] : '';
      rows.push(obj);
    }
    return rows;
  }

  // delegated click handler: edit/delete/import CSV (robust closest usage)
  document.body.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('[data-edit]');
    if (editBtn) {
      e.preventDefault();
      openModal(editBtn.dataset.entity, 'edit', editBtn.dataset.edit);
      return;
    }

    const delBtn = e.target.closest('[data-del]');
    if (delBtn) {
      e.preventDefault();
      if (confirm('Delete this record?')) {
        try {
          await api.remove(delBtn.dataset.entity, delBtn.dataset.del);
          alert(`Deleted ${delBtn.dataset.entity} id=${delBtn.dataset.del}`);
          const table = document.querySelector(`#${delBtn.dataset.entity} table`);
          if (table) renderTableBody(delBtn.dataset.entity, table);
        } catch (err) {
          alert('Error: ' + (err?.message || err));
          console.error(err);
        }
      }
      return;
    }

    // Import CSV button(s)
    const importBtn = e.target.closest('[data-action="import-csv"], #importCsv, .import-csv');
    if (importBtn) {
      e.preventDefault();
      const sectionEl = importBtn.closest('[data-entity]') || document.getElementById(importBtn.dataset.entity) || document;
      let fileInput = sectionEl.querySelector('input[type="file"].csv-import');
      if (!fileInput) {
        fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.csv,text/csv';
        fileInput.className = 'csv-import';
        fileInput.style.display = 'none';
        sectionEl.appendChild(fileInput);
      }

      fileInput.onchange = async (ev) => {
        const file = ev.target.files && ev.target.files[0];
        if (!file) return;
        try {
          const text = await file.text();
          let json = null;
          if (window.CSVTools && typeof window.CSVTools.csvToJson === 'function') {
            json = window.CSVTools.csvToJson(text);
          } else if (typeof window.csvToJson === 'function') {
            json = window.csvToJson(text);
          } else {
            json = parseCsvToJson(text);
          }

          const ent = importBtn.dataset.entity || sectionEl.id || (importBtn.closest('[data-entity]')?.dataset?.entity);
          if (!ent) { alert('Unable to determine target entity for import.'); return; }

          if (json && json.length && api.bulkCreate) {
            await api.bulkCreate(ent, json);
          } else if (api.importCSV) {
            await api.importCSV(ent, text);
          } else if (json && json.length) {
            await Promise.all(json.map(rec => api.create(ent, rec)));
          } else {
            throw new Error('Parsed CSV is empty or no import handler available.');
          }

          alert('Import complete.');
          const table = document.querySelector(`#${ent} table`);
          if (table) renderTableBody(ent, table);
        } catch (err) {
          alert('Import error: ' + (err?.message || err));
          console.error(err);
        } finally {
          ev.target.value = '';
        }
      };

      fileInput.click();
      return;
    }
  });

  // initial hydration helper(s)
  document.addEventListener('DOMContentLoaded', () => {
    Object.keys(schema).forEach(k => {
      try { hydrateEntitySection(k); } catch (e) {}
    });
  });

  // small sidebar scroll shadow helper
  (function () {
    const sb = document.getElementById('sidebar') || document.querySelector('aside.sidebar');
    if (!sb) return;
    const THRESHOLD = 6;
    function updateShadows() {
      const st = sb.scrollTop;
      const sh = sb.scrollHeight;
      const ch = sb.clientHeight;
      sb.classList.toggle('scrolled-top', st > THRESHOLD);
      sb.classList.toggle('scrolled-bottom', (sh - ch - st) > THRESHOLD);
    }
    sb.addEventListener('scroll', updateShadows, { passive: true });
    window.addEventListener('resize', updateShadows);
    setTimeout(updateShadows, 60);
  })();

})();




// Select all the "New" buttons (like New Owner, New Patient, etc.)
const newButtons = document.querySelectorAll('.new-btn');
const tableWrapper = document.querySelector('.table-wrap'); // The wrapper around the table

// Loop through each "New" button and attach the same event listener
newButtons.forEach(button => {
  button.addEventListener('click', () => {
    // Show the modal (your existing logic for showing modals)
    document.querySelector('.modal').style.display = 'block';

    // Add the class to shift the table content to the right
    tableWrapper.classList.add('shift-right');
  });
});

// When closing the modal, reset the table position
const closeModalBtn = document.querySelector('.modal .close-btn');
if (closeModalBtn) {
  closeModalBtn.addEventListener('click', () => {
    document.querySelector('.modal').style.display = 'none';
    tableWrapper.classList.remove('shift-right');
  });
}


