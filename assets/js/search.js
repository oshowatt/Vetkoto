// search.js

(function () {
  'use strict';

  const $ = (s, ctx = document) => ctx.querySelector(s);
  const $$ = (s, ctx = document) => Array.from((ctx || document).querySelectorAll(s));

  // Function to resolve the correct column name for search
function getSearchColumn(entity) {
  if (entity === 'owners') return 'owner_name';  // owners' column
  if (entity === 'patients') return 'patient_name';  // patients' column
  if (entity === 'visits') return 'patient_name';  // join patients for visits
  // Add more entities and their columns as needed
  return 'name';  // default to 'name' for others
}


  // Search setup function for a specific entity
  function setupSearch(entity) {
    const root = document.getElementById(entity);
    if (!root) return;

    const searchEl = root.querySelector('input[id$="Search"]');
    if (searchEl) {
      searchEl.addEventListener('input', async (e) => {
        const query = e.target.value.trim();
        const column = getSearchColumn(entity);  // get the column name dynamically
        const filter = query ? { column, value: query } : undefined;

        // Render the table with filtered data
        const table = root.querySelector('table');
        if (table) {
          renderTableBody(entity, table, filter);
        }
      });
    }
  }

  // Function to render table body with filtered results
  async function renderTableBody(entity, table, filter) {
  const cols = schema[entity]?.columns || [];
  let tbody = table.tBodies[0] || table.createTBody();
  tbody.innerHTML = '';

  // Helper function to resolve cell value
  async function resolveCellValue(entity, col, row) {
    // If it's a foreign key and needs to join
    if (col.key.includes('.')) {
      const [entityName, fieldName] = col.key.split('.');
      const relatedEntity = await cachedGet(entityName, row[`${entityName}_id`]);
      return relatedEntity ? relatedEntity[fieldName] : '';
    }
    if (row[col.key] != null) return row[col.key];

    return '';
  }

  const rows = await api.list(entity, { filter });
  for (const row of rows) {
    const tr = document.createElement('tr');
    for (const col of cols) {
      const td = document.createElement('td');
      td.textContent = await resolveCellValue(entity, col, row);
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
}


  // Expose functions
  window.VetKotoSearch = { setupSearch, renderTableBody };

})();
