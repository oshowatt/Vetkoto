async function loadDashboardStats() {
  try {
    // Fetch the total number of entities from Supabase
    const totalOwners = await window.VetKotoAPI.list('owners', { limit: 10000 });
    const totalPatients = await window.VetKotoAPI.list('patients', { limit: 10000 });
    const totalVisits = await window.VetKotoAPI.list('visits', { limit: 10000 });
    const upcomingVaccinations = await window.VetKotoAPI.list('vaccinations', { limit: 10000 });

    // Update the stats in the HTML
    document.getElementById('totalOwners').textContent = totalOwners.length;
    document.getElementById('totalPatients').textContent = totalPatients.length;
    document.getElementById('totalVisits').textContent = totalVisits.length;
    document.getElementById('upcomingVaccinations').textContent = upcomingVaccinations.filter(vaccination => new Date(vaccination.next_due) > new Date()).length;

    // Optionally load recent activities
    loadRecentActivities();

  } catch (error) {
    console.error("Error fetching data:", error);
  }
}

async function loadRecentActivities() {
  try {
    // Fetch recent activities with proper variable definitions
    const recentVisits = await window.VetKotoAPI.list('visits', { limit: 3, orderBy: 'visit_date', asc: false });
    const recentDiagnoses = await window.VetKotoAPI.list('diagnoses', { limit: 3, orderBy:'diagnosis_date', asc: false }); 
    const recentPrescriptions = await window.VetKotoAPI.list('prescriptions', { limit: 3, orderBy: 'prescription_date', asc: false });

    // Ensure the activity list container is available
    const activityList = document.getElementById('recentActivity');
    if (!activityList) return;

    activityList.innerHTML = ''; // Clear any previous content

    // Add recent visits to the list
    if (recentVisits && recentVisits.length > 0) {
      recentVisits.forEach(visit => {
        const listItem = document.createElement('li');
        listItem.textContent = `Visit for ${visit.patient_name} on ${new Date(visit.visit_date).toLocaleDateString()}`;
        activityList.appendChild(listItem);
      });
    }

    // Add recent diagnoses to the list
    if (recentDiagnoses && recentDiagnoses.length > 0) {
      recentDiagnoses.forEach(diagnosis => {
        const listItem = document.createElement('li');
        listItem.textContent = `Diagnosis for ${diagnosis.patient_name}: ${diagnosis.description}`;
        activityList.appendChild(listItem);
      });
    }

    // Add recent prescriptions to the list
    if (recentPrescriptions && recentPrescriptions.length > 0) {
      recentPrescriptions.forEach(prescription => {
       const listItem = document.createElement('li');
        listItem.textContent = `Prescription for ${prescription.med_name} given on ${new Date(prescription.start_date).toLocaleDateString()}`;
        activityList.appendChild(listItem);
      });
    }

  } catch (error) {
    console.error("Error loading recent activities:", error);
    document.getElementById('recentActivity').textContent = 'Failed to load recent activity.';
  }
}


// Load data when the page is ready
document.addEventListener('DOMContentLoaded', () => {
  loadDashboardStats();
});
