// assets/js/api.js — Supabase CRUD
(function () {
  if (!window.sb) { console.error('Supabase client not initialized'); return; }

  const ENTITIES = {
    owners:         { list: 'owners',            table: 'owners',         pk: 'owner_id' },
    patients:       { list: 'patients',          table: 'patients',       pk: 'patient_id' },
    visits:         { list: 'visits',            table: 'visits',         pk: 'visit_id' },
    diagnoses:      { list: 'diagnoses',         table: 'diagnoses',      pk: 'diagnosis_id' },
    medications:    { list: 'medications',       table: 'medications',    pk: 'medication_id' },
    prescriptions:  { list: 'prescriptions',     table: 'prescriptions',  pk: 'prescription_id' },
    allergies:      { list: 'allergies_view',    table: 'allergies',      pk: 'allergy_id' },
    vaccinations:   { list: 'vaccinations_view', table: 'vaccinations',   pk: 'vaccination_id' },
    veterinarians:  { list: 'veterinarians',     table: 'veterinarians',  pk: 'veterinarian_id' },
  };

  function metaOf(entity){ const m = ENTITIES[entity]; if(!m) throw new Error(`Unknown ${entity}`); return m; }

async function list(entity, { limit = 100, offset = 0, orderBy, asc = true, filter } = {}) {
  const { list: src, pk } = metaOf(entity);
  let q = sb.from(src).select('*'); // Start the query for the entity

  // Apply the filter if there's a column and value
  if (filter?.column && filter?.value) {
    const column = filter.column;

    if (column.includes('.')) {
      const [table, field] = column.split('.');

      if (table === 'patients') {
        q = q.select(`${src}.*, ${table}.${field}`)
          .eq(`${src}.patient_id`, `${table}.patient_id`) // Join visits.patient_id to patients.patient_id
          .ilike(`${table}.${field}`, `%${filter.value}%`); // Filter by patient_name
      }
    } else {
      const value = filter.value;
      // Check if the filter value is numeric (e.g., visit_id or patient_id)
      if (Number.isInteger(Number(value))) {
        q = q.eq(column, Number(value)); // Use eq for numeric fields
      } else {
        q = q.ilike(column, `%${value}%`); // Use ilike for string fields like patient_name
      }
    }
  }

  // Apply the ordering and limit
  q = q.order(orderBy || pk, { ascending: asc }).range(offset, offset + limit - 1);

  console.log('Query:', q.toString()); // Log the query for debugging

  // Execute the query
  const { data, error } = await q;

  if (error) {
    console.error('Error in query:', error);
    throw error;
  }

  return data || [];
}







  async function get(entity, id) {
    const { table, pk } = metaOf(entity);
    const { data, error } = await sb.from(table).select('*').eq(pk, id).single();
    if (error) throw error;
    return data;
  }

  async function create(entity, payload) {
    const { table } = metaOf(entity);
    const { data, error } = await sb.from(table).insert(payload).select('*').single();
    if (error) throw error;
    return data;
  }

  async function update(entity, payload) {
    const { table, pk } = metaOf(entity);
    if (!payload[pk]) throw new Error(`${pk} required`);
    const id = payload[pk];
    const body = { ...payload }; delete body[pk];
    const { data, error } = await sb.from(table).update(body).eq(pk, id).select('*').single();
    if (error) throw error;
    return { [pk]: id, ...data };
  }

  async function remove(entity, id) {
    const { table, pk } = metaOf(entity);
    const { data, error } = await sb.from(table).delete().eq(pk, id).select(pk).single();
    if (error) throw error;
    return data;
  }


  async function options(entity, labelKey='name', valueKey) {
    const { list:src, pk } = metaOf(entity);
    const key = valueKey || pk;
    const { data, error } = await sb.from(src).select(`${key}, ${labelKey}`).order(labelKey, { ascending:true });
    if (error) throw error;
    return data.map(r => ({ value: r[key], label: r[labelKey] }));
  }

  window.VetKotoAPI = { list, get, create, update, remove, options };
})();
