window.VetKotoSchema = {
  owners: {
    columns: [
      { key: 'owner_id', label: 'ID' },
      { key: 'owner_name', label: 'Name' },
      { key: 'phone', label: 'Phone' },
      { key: 'email', label: 'Email' },
      { key: 'address', label: 'Address' },
      { key: 'city', label: 'City' },
      { key: 'created_at', label: 'Created At' },
      { key: 'actions', label: 'Actions' }
    ],
    fields: [
      { key: 'owner_name', label: 'Name', type: 'text', required: true },
      { key: 'phone', label: 'Phone', type: 'text' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'address', label: 'Address', type: 'text' },
      { key: 'city', label: 'City', type: 'text' }
    ],
    endpoint: '/api/owners.php'
  },

  patients: {
    columns: [
      { key: 'patient_id', label: 'ID' },
      { key: 'patient_name', label: 'Pet Name' },
      { key: 'owner_name', label: 'Owner' },
      { key: 'species', label: 'Species' },
      { key: 'breed', label: 'Breed' },
      { key: 'sex', label: 'Sex' },
      { key: 'microchip', label: 'Microchip' },
      { key: 'actions', label: 'Actions' }
    ],
    fields: [
      { key: 'owner_id', label: 'Owner ID', type: 'number', required: true },
      { key: 'patient_name', label: 'Pet Name', type: 'text', required: true },
      { key: 'species', label: 'Species', type: 'text', required: true },
      { key: 'breed', label: 'Breed', type: 'text' },
      { key: 'sex', label: 'Sex', type: 'text' },
      { key: 'microchip', label: 'Microchip', type: 'text' }
    ],
    endpoint: '/api/patients.php'
  },

  veterinarians: {
    columns: [
      { key: 'veterinarian_id', label: 'ID' },
      { key: 'vet_name', label: 'Name' },
      { key: 'license', label: 'License' },
      { key: 'actions', label: 'Actions' }
    ],
    fields: [
      { key: 'vet_name', label: 'Full Name', type: 'text', required: true },
      { key: 'license', label: 'License No.', type: 'text' }
    ],
    endpoint: '/api/veterinarians.php'
  },

  visits: {
    columns: [
      { key: 'visit_id', label: 'ID' },
      { key: 'patient_name', label: 'Pet' },
      { key: 'visit_date', label: 'Visit Date' },
      { key: 'vet_name', label: 'Veterinarian' },
      { key: 'reason', label: 'Reason for Visit' },
      {key: 'notes', label: 'Notes' },
      { key: 'actions', label: 'Actions' }
    ],
    fields: [
      { key: 'patient_id', label: 'Patient ID', type: 'number', required: true },
      { key: 'visit_date', label: 'Visit Date', type: 'date', required: true },
      { key: 'veterinarian_id', label: 'Veterinarian ID', type: 'number', required: true },
      { key: 'reason', label: 'Reason for Visit', type: 'text' },
      { key: 'notes', label: 'Notes', type: 'textarea' }
    ],
    endpoint: '/api/visits.php'
  },

  diagnoses: {
    columns: [
      { key: 'diagnosis_id', label: 'ID' },
      { key: 'visit_id', label: 'Visit ID' },
      { key: 'patient_name', label: 'Pet' },
      { key: 'description', label: 'Diagnosis' },
      { key: 'severity', label: 'Severity' },
      { key: 'vet_name', label: 'Veterinarian' },
      { key: 'diagnosis_date', label: 'Created At' },
      { key: 'actions', label: 'Actions' }
    ],
    fields: [
      { key: 'visit_id', label: 'Visit ID', type: 'number', required: true },
      { key: 'description', label: 'Diagnosis', type: 'text', required: true },
      { key: 'severity', label: 'Severity', type: 'text' }
    ],
    endpoint: '/api/diagnoses.php'
  },

  medications: {
    columns: [
      { key: 'medication_id', label: 'ID' },
      { key: 'med_name', label: 'Name' },
      { key: 'unit', label: 'Unit' },
      { key: 'stock', label: 'Stock' },
      { key: 'actions', label: 'Actions' }
    ],
    fields: [
      { key: 'med_name', label: 'Medication Name', type: 'text', required: true },
      { key: 'unit', label: 'Unit', type: 'text' },
      { key: 'stock', label: 'Stock', type: 'number' }
    ],
    endpoint: '/api/medications.php'
  },

  prescriptions: {
    columns: [
      { key: 'prescription_id', label: 'ID' },
      { key: 'visit_id', label: 'Visit' },
      { key: 'patient_name', label: 'Patient Name' },
      { key: 'med_name', label: 'Medication' },
      { key: 'dose', label: 'Dose' },
      { key: 'frequency', label: 'Frequency' },
      { key: 'duration', label: 'Duration' },
      { key: 'route', label: 'Route' },
      { key: 'prescription_date', label: 'Prescription Date'},
      { key: 'actions', label: 'Actions' }
    ],
    fields: [
      { key: 'visit_id', label: 'Visit ID', type: 'number', required: true },
      { key: 'medication_id', label: 'Medication ID', type: 'number', required: true },
      { key: 'dose', label: 'Dose', type: 'text', required: true },
      { key: 'frequency', label: 'Frequency', type: 'text' },
      { key: 'route', label: 'Route', type: 'text' },
      { key: 'duration', label: 'Duration', type: 'text' },
      { key: 'start_date', label: 'Start Date', type: 'date' }
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
      { key: 'severity', label: 'Severity', type: 'text' }
    ],
    endpoint: '/api/allergies.php'
  },

  vaccinations: {
    columns: [
      { key: 'vaccination_id', label: 'ID' },
      { key: 'patient_name', label: 'Patient' },
      { key: 'vaccine', label: 'Vaccine' },
      { key: 'date_given', label: 'Date Given' },
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
  }
};
