window.VetKotoSchema = {
  prescriptions: {
    columns: [
      { key: 'prescription_id', label: 'ID' },
      { key: 'visit_id', label: 'Visit' },
      { key: 'medication_name', label: 'Medication' },
      { key: 'dose', label: 'Dose' },
      { key: 'frequency', label: 'Frequency' },
      { key: 'duration', label: 'Duration' },
      { key: 'actions', label: 'Actions' }
    ],
    fields: [
      { key: 'visit_id', label: 'Visit ID', type: 'number', required: true },
      { key: 'medication_id', label: 'Medication ID', type: 'number', required: true },
      { key: 'dose', label: 'Dose', type: 'text', required: true },
      { key: 'frequency', label: 'Frequency', type: 'text', placeholder: 'BID, TID, q8h' },
      { key: 'route', label: 'Route', type: 'text', placeholder: 'PO, IM, SC' },
      { key: 'duration', label: 'Duration', type: 'text', placeholder: '5 days' },
      { key: 'start_date', label: 'Start', type: 'date' }
    ],
    endpoint: '/api/prescriptions.php'
  },

  allergies: {
    columns: [
      { key: 'allergy_id', label: 'ID' },
      { key: 'patient_name', label: 'Patient' },
      { key: 'allergen', label: 'Allergen' },
      { key: 'severity', label: 'Severity' },
      { key: 'actions', label: 'Actions' }
    ],
    fields: [
      { key: 'patient_id', label: 'Patient ID', type: 'number', required: true },
      { key: 'allergen', label: 'Allergen', type: 'text', required: true },
      { key: 'severity', label: 'Severity', type: 'text', placeholder: 'mild, moderate, severe' }
    ],
    endpoint: '/api/allergies.php'
  },

  vaccinations: {
    columns: [
      { key: 'vaccination_id', label: 'ID' },
      { key: 'patient_name', label: 'Patient' },
      { key: 'vaccine', label: 'Vaccine' },
      { key: 'date_given', label: 'Given' },
      { key: 'next_due', label: 'Next Due' },
      { key: 'actions', label: 'Actions' }
    ],
    fields: [
      { key: 'patient_id', label: 'Patient ID', type: 'number', required: true },
      { key: 'vaccine', label: 'Vaccine', type: 'text', required: true },
      { key: 'date_given', label: 'Date Given', type: 'date' },
      { key: 'next_due', label: 'Next Due', type: 'date' }
    ],
    endpoint: '/api/vaccinations.php'
  },

  veterinarians: {
    columns: [
      { key: 'veterinarian_id', label: 'ID' },
      { key: 'name', label: 'Name' },
      { key: 'license', label: 'License' },
      { key: 'actions', label: 'Actions' }
    ],
    fields: [
      { key: 'name', label: 'Full Name', type: 'text', required: true },
      { key: 'license', label: 'License No.', type: 'text' }
    ],
    endpoint: '/api/veterinarians.php'
  }
};
