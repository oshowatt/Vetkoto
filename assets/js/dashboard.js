async function loadDashboardStats() {
  try {
    const totalOwners = await window.VetKotoAPI.list('owners', { limit: 10000 });
    const totalPatients = await window.VetKotoAPI.list('patients', { limit: 10000 });
    const totalVisits = await window.VetKotoAPI.list('visits', { limit: 10000 });
    const upcomingVaccinations = await window.VetKotoAPI.list('vaccinations', { limit: 10000 });

    // Update the stats in the cards
    document.getElementById('totalOwners').textContent = totalOwners.length;
    document.getElementById('totalPatients').textContent = totalPatients.length;
    document.getElementById('totalVisits').textContent = totalVisits.length;
    document.getElementById('upcomingVaccinations').textContent = upcomingVaccinations.filter(vaccination => new Date(vaccination.next_due) > new Date()).length;

    loadRecentActivities();

  } catch (error) {
    console.error("Error fetching data:", error);
  }
}

async function loadRecentActivities() {
  try {
    const recentVisits = await window.VetKotoAPI.list('visits', { limit: 5, orderBy: 'visit_date', asc: false });
    const recentDiagnoses = await window.VetKotoAPI.list('diagnoses', { limit: 5, orderBy: 'created_at', asc: false });
    const recentPrescriptions = await window.VetKotoAPI.list('prescriptions', { limit: 5, orderBy: 'created_at', asc: false });

    const activityList = document.getElementById('recentActivity');
    activityList.innerHTML = ''; // Clear previous content

    // Add recent visits to the list
    recentVisits.forEach(visit => {
      const listItem = document.createElement('li');
      listItem.textContent = `Visit for ${visit.patient_name} on ${new Date(visit.visit_date).toLocaleDateString()}`;
      activityList.appendChild(listItem);
    });

    // Add recent diagnoses
    recentDiagnoses.forEach(diagnosis => {
      const listItem = document.createElement('li');
      listItem.textContent = `Diagnosis for ${diagnosis.patient_name}: ${diagnosis.description}`;
      activityList.appendChild(listItem);
    });

    // Add recent prescriptions
    recentPrescriptions.forEach(prescription => {
      const listItem = document.createElement('li');
      listItem.textContent = `Prescription for ${prescription.med_name} given on ${new Date(prescription.start_date).toLocaleDateString()}`;
      activityList.appendChild(listItem);
    });

  } catch (error) {
    console.error("Error loading recent activities:", error);
  }
}

// Load data when the page is ready
document.addEventListener('DOMContentLoaded', () => {
  loadDashboardStats();
});
