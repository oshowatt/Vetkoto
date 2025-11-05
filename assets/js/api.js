// assets/js/api.js — Supabase version (no PHP)
(function () {
  if (!window.sb) {
    console.warn('Supabase client not initialized.');
    return;
  }

  // Map each entity to: list source (view or table), write target (table), and primary key
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

  async function handle(res) {
    if (res.error) throw res.error;
    return res.data ?? null;
  }

  async function list(entity, { limit = 100, offset = 0, orderBy = null, asc = true } = {}) {
    const meta = ENTITIES[entity];
    if (!meta) throw new Error(`Unknown entity: ${entity}`);

    let q = window.sb.from(meta.list).select('*', { count: 'exact' });

    // Default ordering by primary key desc for list feel
    const defaultOrder = orderBy || meta.pk;
    q = q.order(defaultOrder, { ascending: asc });

    // Basic pagination
    if (limit != null && offset != null) q = q.range(offset, offset + limit - 1);

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  async function create(entity, payload) {
    const meta = ENTITIES[entity];
    if (!meta) throw new Error(`Unknown entity: ${entity}`);

    // For views like prescriptions_view we INSERT into base table:
    const { data, error } = await window.sb.from(meta.table).insert(payload).select('*').single();
    if (error) throw error;
    return data;
  }

  async function update(entity, payload) {
    const meta = ENTITIES[entity];
    if (!meta) throw new Error(`Unknown entity: ${entity}`);
    const pk = meta.pk;
    if (!payload[pk]) throw new Error(`${pk} required for update`);

    const id = payload[pk];
    const toUpdate = { ...payload };
    delete toUpdate[pk];

    const { data, error } = await window.sb.from(meta.table)
      .update(toUpdate)
      .eq(pk, id)
      .select('*')
      .single();

    if (error) throw error;
    return { [pk]: id, ...data };
  }

  async function remove(entity, id) {
    const meta = ENTITIES[entity];
    if (!meta) throw new Error(`Unknown entity: ${entity}`);
    const pk = meta.pk;

    const { data, error } = await window.sb.from(meta.table)
      .delete()
      .eq(pk, id)
      .select(pk)
      .single();

    if (error) throw error;
    return data;
  }

  // Expose the same API used by your UI layer
  window.VetKotoAPI = { list, create, update, remove };
})();
