// assets/js/api.js — Supabase CRUD
(function () {
  if (!window.sb) { console.error('Supabase client not initialized'); return; }

  const ENTITIES = {
    owners:         { list: 'owners',            table: 'owners',         pk: 'owner_id' },
    patients:       { list: 'patients',          table: 'patients',       pk: 'patient_id' },
    visits:         { list: 'visits',            table: 'visits',         pk: 'visit_id' },
    diagnoses:      { list: 'diagnoses',         table: 'diagnoses',      pk: 'diagnosis_id' },
    medications:    { list: 'medications',       table: 'medications',    pk: 'medication_id' },
    prescriptions:  { list: 'prescriptions_view',table: 'prescriptions',  pk: 'prescription_id' },
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
  if (filter.column.includes('.')) {
    const [table, column] = filter.column.split('.');
    q = q.select(`${src}.*, ${table}.${column}`) // Join visits and patients to get patient_name
      .ilike(`${table}.${column}`, `%${filter.value}%`);
  } else {
    q = q.ilike(filter.column, `%${filter.value}%`);
  }
}


  // Apply the ordering and limit
  q = q.order(orderBy || pk, { ascending: asc }).range(offset, offset + limit - 1);

  // Execute the query
  const { data, error } = await q;
  
  if (error) throw error;
  
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
