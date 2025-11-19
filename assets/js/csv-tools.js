// Central CSV import/export handlers — click Import buttons and handle file input change.
// Works with IDs like: <button id="ownersImportCsv">, <input id="ownersCsvFile">, <pre id="ownersCsvPreview">
(function(){
  // helper: given button id "XImportCsv" => file input id "XCsvFile" and preview id "XCsvPreview"
  function idsFromButtonId(btnId){
    const m = btnId && btnId.match(/^(.+)ImportCsv$/);
    if (!m) return null;
    const prefix = m[1];
    return { inputId: prefix + 'CsvFile', previewId: prefix + 'CsvPreview' };
  }

  // open file picker when Import button clicked (supports legacy ID pattern)
 // Trigger the file input when the import button is clicked
(function () {
  // Helper to trigger file input when Import button is clicked
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('button[id$="ImportCsv"]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();

    const { inputId } = idsFromButtonId(btn.id);
    const fileInput = document.getElementById(inputId);
    if (fileInput) fileInput.click(); // Simulate a click to open file picker
  }, true);


  // Handle CSV file selection and import
document.addEventListener('change', async function(e) {
  const input = e.target;
  if (!(input && input.tagName === 'INPUT' && input.type === 'file' && /CsvFile$/.test(input.id))) return;
  const file = input.files && input.files[0];
  const prefix = input.id.replace(/CsvFile$/, '');
  const preview = document.getElementById(prefix + 'CsvPreview');

  if (!file) {
    if (preview) preview.textContent = 'No file selected.';
    return;
  }

  if (preview) preview.textContent = 'Uploading CSV for conversion...';

  const form = new FormData();
  form.append('csv_file', file);

  try {
    const res = await fetch('/php-tools/csv_to_json.php', { method: 'POST', body: form });
    if (!res.ok) throw new Error('Server returned ' + res.status);
    const json = await res.json();
    
    // Remove ID fields from each entry before sending to database
    if (json.data) {
      json.data.forEach(record => {
        delete record.owner_id; // remove owner_id for owners
        delete record.patient_id; // remove patient_id for patients
        // add more as necessary
      });
    }

    if (preview) preview.textContent = JSON.stringify(json, null, 2);

    // Now send data to the database without the IDs
    for (const r of json.data) {
      try {
        await window.VetKotoAPI.create(prefix.replace(/s$/, ''), r);
      } catch (_) {}
    }

  } catch (err) {
    console.error('CSV import error for', input.id, err);
    if (preview) preview.textContent = 'CSV import error: ' + (err.message || err);
  } finally {
    input.value = ''; // clear file input after import
  }
}, true); 

})();


document.addEventListener('click', async function(e){
  const btn = e.target.closest('button[id$="ExportCsv"]');
  if (!btn) return;
  e.preventDefault(); e.stopPropagation();

  // normalize prefix -> try to match API entity keys
  const rawPrefix = btn.id.replace(/ExportCsv$/, '');
  const tryKeys = [
    rawPrefix,
    rawPrefix.toLowerCase(),
    rawPrefix.toLowerCase().replace(/[^a-z0-9]/g,''),   // strip punctuation
    rawPrefix.toLowerCase().replace(/[^a-z0-9]/g,'') + 's' // try plural
  ].filter((v,i,arr) => v && arr.indexOf(v) === i);

  const preview = document.getElementById(rawPrefix + 'CsvPreview') || document.querySelector('pre');

  if (preview) preview.textContent = 'Preparing export...';

  if (!window.VetKotoAPI || typeof window.VetKotoAPI.list !== 'function') {
    const msg = 'VetKotoAPI.list not available';
    console.error(msg); if (preview) preview.textContent = msg;
    return;
  }

  let rows = null, usedKey = null;
  for (const key of tryKeys) {
    try {
      rows = await window.VetKotoAPI.list(key, { limit: 10000 });
      usedKey = key;
      break;
    } catch (err) {
      // ignore and try next
    }
  }

  if (!rows) {
    const msg = `CSV export failed: unknown entity (tried: ${tryKeys.join(', ')}) — check button id and API entity keys`;
    console.error(msg);
    if (preview) preview.textContent = msg;
    return;
  }

  try {
    const keys = Object.keys(rows[0] || {});
    const csv = [keys.join(',')].concat(rows.map(r => keys.map(k => `"${String(r[k] ?? '').replace(/"/g,'""')}"`).join(','))).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = (usedKey || rawPrefix) + '_export.csv';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    if (preview) preview.textContent = 'Export ready (download started).';
  } catch (err) {
    console.error('CSV export failed', err);
    if (preview) preview.textContent = 'Export failed: ' + (err.message || err);
  }
}, true);


  document.addEventListener('change', async function(e) {
  const input = e.target;
  if (!(input && input.tagName === 'INPUT' && input.type === 'file' && /CsvFile$/.test(input.id))) return;
  const file = input.files && input.files[0];
  const prefix = input.id.replace(/CsvFile$/, '');
  const preview = document.getElementById(prefix + 'CsvPreview');

  if (!file) {
    if (preview) preview.textContent = 'No file selected.';
    return;
  }

  if (preview) preview.textContent = 'Uploading CSV for conversion...';

  const form = new FormData();
  form.append('csv_file', file);

  try {
    const res = await fetch('/php-tools/csv_to_json.php', { method: 'POST', body: form });
    if (!res.ok) throw new Error('Server returned ' + res.status);
    const json = await res.json();
    
    // Remove ID fields from each entry before sending to database
    if (json.data) {
      json.data.forEach(record => {
        delete record.owner_id; // remove owner_id for owners
        delete record.patient_id; // remove patient_id for patients
        // add more as necessary
      });
    }

    if (preview) preview.textContent = JSON.stringify(json, null, 2);

    // Now send data to the database without the IDs
    for (const r of json.data) {
      try {
        await window.VetKotoAPI.create(prefix.replace(/s$/, ''), r);
      } catch (_) {}
    }

  } catch (err) {
    console.error('CSV import error for', input.id, err);
    if (preview) preview.textContent = 'CSV import error: ' + (err.message || err);
  } finally {
    input.value = ''; // clear file input after import
  }
}, true);


  // Export buttons: click handler for buttons with id ending "ExportCsv"
  document.addEventListener('click', async function(e){
    const btn = e.target.closest('button[id$="ExportCsv"]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const prefix = btn.id.replace(/ExportCsv$/, '');
    const preview = document.getElementById(prefix + 'CsvPreview');
    if (preview) preview.textContent = 'Preparing export...';
    try {
      if (!window.VetKotoAPI || typeof window.VetKotoAPI.list !== 'function') {
        throw new Error('VetKotoAPI.list not available');
      }
      const rows = await window.VetKotoAPI.list(prefix, { limit: 10000 });
      if (!rows || rows.length === 0) {
        if (preview) preview.textContent = 'No data to export.';
        return;
      }
      const keys = Object.keys(rows[0]);
      const csv = [keys.join(',')].concat(rows.map(r => keys.map(k => `"${String(r[k] ?? '').replace(/"/g,'""')}"`).join(','))).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = prefix + '_export.csv';
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      if (preview) preview.textContent = 'Export ready (download started).';
    } catch (err) {
      console.error('CSV export failed for', prefix, err);
      if (preview) preview.textContent = 'Export failed: ' + (err.message || err);
    }
  }, true);

})();


