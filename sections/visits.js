async function loadVisits() {
  // request nested related fields that match DB naming
  const { data: visits, error } = await sb
    .from('visits')
    .select('visit_id, visit_date, reason, patient_id, veterinarian_id, patients(patient_name), veterinarians(vet_name)');

  if (error) {
    console.error("Error fetching visits:", error);
    return;
  }

  const tbody = document.querySelector('#visits tbody');
  if (!tbody) return;
  tbody.innerHTML = ''; // Clear any existing rows

  visits.forEach(visit => {
    const tr = document.createElement('tr');
    // prefer nested values (Supabase returns related objects), then fallback to possible flat fields
    const patientName = visit.patients?.patient_name ?? visit.patient_name ?? '';
    const vetName = visit.veterinarians?.vet_name ?? visit.vet_name ?? '';
    tr.innerHTML = `
      <td>${visit.visit_id ?? ''}</td>
      <td>${patientName}</td>
      <td>${visit.visit_date ?? ''}</td>
      <td>${vetName}</td>
      <td>
        <button class="btn" data-edit="${visit.visit_id}" data-entity="visits">Edit</button>
        <button class="btn danger" data-del="${visit.visit_id}" data-entity="visits">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}
loadVisits();