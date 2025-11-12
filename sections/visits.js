async function loadVisits() {
  const { data: visits, error } = await sb
    .from('visits')
    .select(`
      visit_id,
      patients(name) AS patient_name,  // Fetch patient name from patients table
      veterinarians(name) AS vet_name, // Fetch vet name from veterinarians table
      visit_date,
      reason
    `);

  if (error) {
    console.error("Error fetching visits:", error);
    return;
  }

  const tbody = document.querySelector('#visits tbody');
  tbody.innerHTML = ''; // Clear any existing rows

  visits.forEach(visit => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${visit.visit_id}</td>
      <td>${visit.patient_name}</td>  <!-- Display the patient's name -->
      <td>${visit.visit_date}</td>
      <td>${visit.vet_name}</td>  <!-- Display the veterinarian's name -->
      <td>
        <button class="btn">Edit</button>
        <button class="btn danger">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}
loadVisits();