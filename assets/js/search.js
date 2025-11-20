// search.js
(function () {
  'use strict';

  const $ = (s, ctx = document) => ctx.querySelector(s);
  const $$ = (s, ctx = document) => Array.from((ctx || document).querySelectorAll(s));

  let lastSearchToken = 0;

  /**
   * Return an array of candidate column names to search for this entity.
   * We try server-side filter with the first item, but fall back to client-side search
   * across all candidates if the server-side filter yields no results.
   */
  function getSearchColumns(entity) {
  switch (entity) {
    case 'owners': return ['owner_name', 'name', 'owner_id'];
    case 'patients': return ['patient_name', 'patient_id', 'owner_name'];
    case 'visits': return ['patients.patient_name', 'visit_date', 'visit_id']; // Ensure 'patients.patient_name' is included
    case 'medications': return ['med_name', 'medication_id'];
    case 'vaccinations': return ['vaccine', 'vaccine_name', 'vaccination_id'];
    case 'diagnoses': return ['description', 'diagnosis_id', 'patients.patient_name'];
    case 'prescriptions': return ['med_name', 'medication_id', 'visit_id', 'dose', 'patients.patient_name'];
    default: return ['name'];
  }
}


  function setupSearch(entity) {
    const root = document.getElementById(entity);
    if (!root) return;

    // Prefer an explicit id like "prescriptionsSearch", but keep the original fallback
    let searchEl = root.querySelector(`#${entity}Search`) || root.querySelector('input[id$="Search"]');

    if (!searchEl) {
      // No search input present — nothing to do
      console.debug(`[VetKotoSearch] No search input found for entity "${entity}"`);
      return;
    }

    if (searchEl.dataset.listenerAttached) return;

  let debounceTimer;
  let lastSearchToken = 0;

  searchEl.addEventListener('input', (e) => {
  clearTimeout(debounceTimer);

  debounceTimer = setTimeout(async () => {
    const searchToken = ++lastSearchToken;
    const query = e.target.value.trim();
    const candidateColumns = getSearchColumns(entity);
    const preferredColumn = candidateColumns[0]; // Use this for server-side filtering
    const filter = query ? { column: preferredColumn, value: query } : undefined;

    const table = root.querySelector('table');
    if (table) {
      await renderTableBody(entity, table, filter, searchToken, query, candidateColumns);
    }
  }, 300); // Debounce time (300ms)
});


    searchEl.dataset.listenerAttached = 'true';
  }

  /**
   * Render the table body for an entity.
   *
   * If a server-side filter is provided, we try it first. If it yields no rows
   * (or errors), we fetch unfiltered results and apply a client-side filter
   * across the candidate columns.
   */
  async function renderTableBody(entity, table, filter, searchToken, rawQuery = '', candidateColumns = []) {
    const cols = (window.schema && schema[entity] && schema[entity].columns) ? schema[entity].columns : [];
    let tbody = table.tBodies[0] || table.createTBody();
    tbody.innerHTML = '';

    let rows = [];
    let usedServerFilter = false;

    try {
      if (filter) {
        // Try server-side filter first
        console.debug(`[VetKotoSearch] Trying server-side filter for ${entity}:`, filter);
        rows = await api.list(entity, { filter });
        usedServerFilter = true;
      } else {
        rows = await api.list(entity);
      }
    } catch (err) {
      console.warn(`[VetKotoSearch] api.list threw for ${entity} with filter=${JSON.stringify(filter)} — falling back to unfiltered fetch`, err);
      try {
        rows = await api.list(entity);
        usedServerFilter = false;
      } catch (err2) {
        console.error(`[VetKotoSearch] Failed to fetch ${entity} even without filter:`, err2);
        rows = [];
      }
    }

    // Ignore stale responses (outdated search)
    if (searchToken !== lastSearchToken) {
      console.debug(`[VetKotoSearch] Ignoring stale response for token ${searchToken}`);
      return;
    }

    // If we attempted a server-side filter but got no results, fall back to client-side filtering.
    if (filter && usedServerFilter && Array.isArray(rows) && rows.length === 0 && rawQuery) {
      console.debug(`[VetKotoSearch] Server returned 0 rows for ${entity}. Falling back to client-side filtering.`);
      try {
        // Fetch unfiltered rows
        const allRows = await api.list(entity);
        rows = clientSideFilterRows(allRows, rawQuery, candidateColumns.concat(cols.map(c => c.key)));
      } catch (err) {
        console.error(`[VetKotoSearch] Error fetching all rows for client-side filtering of ${entity}:`, err);
        rows = [];
      }
    }

    // If server didn't run a filter (filter was undefined) but there is a rawQuery, apply client-side filter
    if (!filter && rawQuery) {
      rows = clientSideFilterRows(rows, rawQuery, candidateColumns.concat(cols.map(c => c.key)));
    }

    const seenIds = new Set();

    for (const row of rows) {
      const rowId = row.id || row[`${entity}_id`] || JSON.stringify(row);
      if (seenIds.has(rowId)) continue;
      seenIds.add(rowId);

      const tr = document.createElement('tr');
      tr.dataset.rowId = rowId;

      for (const col of cols) {
        const td = document.createElement('td');
        td.textContent = await resolveCellValue(entity, col, row);
        tr.appendChild(td);
      }

      tbody.appendChild(tr);
    }
  }

  /**
   * Client-side fuzzy-ish filter: case-insensitive substring match on any of the provided keys.
   * Accepts keys like 'med_name' or 'medications.med_name' (it will handle dot-notation using the row object).
   */
  function clientSideFilterRows(rows, rawQuery, candidateKeys = []) {
    const q = String(rawQuery || '').trim().toLowerCase();
    if (!q) return rows;

    // Normalize candidate keys: dedupe and prefer more specific keys
    const keys = Array.from(new Set(candidateKeys.filter(Boolean)));

    return rows.filter(row => {
      for (const key of keys) {
        // Support dot-notation
        let value = undefined;
        if (key.includes('.')) {
          const parts = key.split('.');
          value = parts.reduce((acc, p) => (acc && acc[p] !== undefined) ? acc[p] : undefined, row);
        } else {
          value = row[key];
        }

        if (value === undefined || value === null) continue;
        if (typeof value !== 'string') value = String(value);

        if (value.toLowerCase().includes(q)) return true;
      }
      // Also check any string values on the row object as a last resort
      for (const k in row) {
        if (!Object.prototype.hasOwnProperty.call(row, k)) continue;
        const v = row[k];
        if (v == null) continue;
        if (typeof v === 'string' && v.toLowerCase().includes(q)) return true;
      }
      return false;
    });
  }

  async function resolveCellValue(entity, col, row) {
    if (col.key && col.key.includes('.')) {
      const [entityName, fieldName] = col.key.split('.');
      const relatedEntity = await cachedGet(entityName, row[`${entityName}_id`]);
      return relatedEntity ? relatedEntity[fieldName] : '';
    }
    return row[col.key] ?? '';
  }

  // Auto-setup: attempt to attach search to all schema entities present in the DOM.
  // This makes sure setup is run even if hydrate path didn't call it.
  function autoSetupAllSearches() {
    try {
      if (!window.schema) {
        console.debug('[VetKotoSearch] No window.schema found; skipping auto-setup.');
        return;
      }
      for (const entityName of Object.keys(schema)) {
        // if the section exists in DOM, set it up
        if (document.getElementById(entityName)) {
          setupSearch(entityName);
        }
      }
    } catch (err) {
      console.error('[VetKotoSearch] autoSetupAllSearches failed:', err);
    }
  }

  // Run auto setup on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoSetupAllSearches);
  } else {
    autoSetupAllSearches();
  }

  window.VetKotoSearch = { setupSearch, renderTableBody };

})();
