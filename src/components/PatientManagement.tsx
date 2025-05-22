import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import 'bootstrap/dist/css/bootstrap.min.css';

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes: string;
  type: 'Ayurvedic' | 'Unani' | 'Siddha' | 'Homeopathic' | 'Other';
}

interface Patient {
  id: string;
  name: string;
  mobile: string;
  place: string;
  visitedDate: string;
  nextVisitDate: string;
  medications: Medication[];
}

const PatientManagement: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [newPatient, setNewPatient] = useState<Patient>({
    id: '',
    name: '',
    mobile: '',
    place: '',
    visitedDate: new Date().toISOString().split('T')[0],
    nextVisitDate: '',
    medications: []
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [newMedication, setNewMedication] = useState<Medication>({
    id: '',
    name: '',
    dosage: '',
    frequency: '',
    duration: '',
    notes: '',
    type: 'Ayurvedic'
  });
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    const savedPatients = localStorage.getItem('patients');
    if (savedPatients) {
      const parsedPatients = JSON.parse(savedPatients);
      const patientsWithMedications = parsedPatients.map((patient: Patient) => ({
        ...patient,
        medications: patient.medications || []
      }));
      setPatients(patientsWithMedications);
    }
  }, []);

  const addPatient = () => {
    if (!newPatient.name || !newPatient.mobile || !newPatient.place) {
      alert("Please fill all fields.");
      return;
    }

    if (editingId) {
      const updatedPatients = patients.map(p => 
        p.id === editingId ? { ...newPatient, id: editingId, medications: p.medications || [] } : p
      );
      setPatients(updatedPatients);
      localStorage.setItem('patients', JSON.stringify(updatedPatients));
      setEditingId(null);
    } else {
      const patientWithId = { 
        ...newPatient, 
        id: Date.now().toString(),
        medications: []
      };
      const updatedPatients = [...patients, patientWithId];
      setPatients(updatedPatients);
      localStorage.setItem('patients', JSON.stringify(updatedPatients));
    }

    setNewPatient({
      id: '',
      name: '',
      mobile: '',
      place: '',
      visitedDate: new Date().toISOString().split('T')[0],
      nextVisitDate: '',
      medications: []
    });
    setShowAddForm(false);
  };

  const deletePatient = (patientId: string) => {
    if (window.confirm('Are you sure you want to delete this patient?')) {
      const updatedPatients = patients.filter(p => p.id !== patientId);
      setPatients(updatedPatients);
      localStorage.setItem('patients', JSON.stringify(updatedPatients));
      if (selectedPatient?.id === patientId) {
        setSelectedPatient(null);
      }
    }
  };

  const deleteMedication = (patientId: string, medicationId: string) => {
    if (window.confirm('Are you sure you want to delete this medication?')) {
      const updatedPatients = patients.map(p => {
        if (p.id === patientId) {
          return {
            ...p,
            medications: p.medications.filter(m => m.id !== medicationId)
          };
        }
        return p;
      });
      setPatients(updatedPatients);
      localStorage.setItem('patients', JSON.stringify(updatedPatients));
      if (selectedPatient?.id === patientId) {
        setSelectedPatient({
          ...selectedPatient,
          medications: selectedPatient.medications.filter(m => m.id !== medicationId)
        });
      }
    }
  };

  const editPatient = (patient: Patient) => {
    setNewPatient({
      ...patient,
      medications: patient.medications || []
    });
    setEditingId(patient.id);
    setShowAddForm(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowAddForm(false);
    setNewPatient({
      id: '',
      name: '',
      mobile: '',
      place: '',
      visitedDate: new Date().toISOString().split('T')[0],
      nextVisitDate: '',
      medications: []
    });
  };

  const handlePatientClick = (patient: Patient) => {
    setSelectedPatient({
      ...patient,
      medications: patient.medications || []
    });
  };

  const addMedication = () => {
    if (!selectedPatient) return;

    if (!newMedication.name || !newMedication.dosage || !newMedication.frequency) {
      alert("Please fill all required medication fields.");
      return;
    }

    const medicationWithId = { ...newMedication, id: Date.now().toString() };
    const updatedPatient = {
      ...selectedPatient,
      medications: [...(selectedPatient.medications || []), medicationWithId]
    };

    const updatedPatients = patients.map(p => 
      p.id === selectedPatient.id ? updatedPatient : p
    );

    setPatients(updatedPatients);
    setSelectedPatient(updatedPatient);
    localStorage.setItem('patients', JSON.stringify(updatedPatients));
    setNewMedication({
      id: '',
      name: '',
      dosage: '',
      frequency: '',
      duration: '',
      notes: '',
      type: 'Ayurvedic'
    });
  };

  const updateNextVisitDate = (date: string) => {
    if (!selectedPatient) return;

    const updatedPatient = {
      ...selectedPatient,
      nextVisitDate: date
    };

    const updatedPatients = patients.map(p => 
      p.id === selectedPatient.id ? updatedPatient : p
    );

    setPatients(updatedPatients);
    setSelectedPatient(updatedPatient);
    localStorage.setItem('patients', JSON.stringify(updatedPatients));
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Patient List", 20, 20);

    const headers = [["#", "Name", "Mobile", "Place", "Visit Date", "Next Visit"]];
    const data = patients.map((p, i) => [
      i + 1,
      p.name,
      p.mobile,
      p.place,
      p.visitedDate,
      p.nextVisitDate || 'Not set'
    ]);

    autoTable(doc, {
      startY: 30,
      head: headers,
      body: data,
      theme: 'grid',
      styles: {
        fontSize: 10,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [40, 167, 69],
        textColor: 255,
        fontStyle: 'bold',
      },
    });

    doc.save("patients.pdf");
  };

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.mobile.includes(search)
  );

  return (
    <div className="container-fluid p-0">
      {/* Header */}
      <div className="bg-success text-white p-3 sticky-top">
        <div className="d-flex justify-content-between align-items-center">
          <h4 className="mb-0">🌿 AYUSH Clinic</h4>
          <button 
            className="btn btn-light btn-sm"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? '✕ Close' : '➕ Add Patient'}
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-3 bg-light">
        <input
          type="text"
          className="form-control"
          placeholder="🔍 Search patients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Add/Edit Patient Form */}
      {showAddForm && (
        <div className="p-3 bg-white border-bottom">
          <h5 className="mb-3">{editingId ? 'Edit Patient' : 'Add New Patient'}</h5>
          <div className="row g-2">
            <div className="col-12">
              <input
                type="text"
                className="form-control"
                placeholder="Patient Name"
                value={newPatient.name}
                onChange={(e) => setNewPatient({...newPatient, name: e.target.value})}
                required
              />
            </div>
            <div className="col-12">
              <input
                type="text"
                className="form-control"
                placeholder="Mobile Number"
                value={newPatient.mobile}
                onChange={(e) => setNewPatient({...newPatient, mobile: e.target.value})}
                required
              />
            </div>
            <div className="col-12">
              <input
                type="text"
                className="form-control"
                placeholder="Place"
                value={newPatient.place}
                onChange={(e) => setNewPatient({...newPatient, place: e.target.value})}
                required
              />
            </div>
            <div className="col-12">
              <input
                type="date"
                className="form-control"
                value={newPatient.visitedDate}
                onChange={(e) => setNewPatient({...newPatient, visitedDate: e.target.value})}
                required
              />
            </div>
            <div className="col-12 d-flex gap-2">
              {editingId && (
                <button className="btn btn-secondary flex-grow-1" onClick={cancelEdit}>
                  Cancel
                </button>
              )}
              <button className="btn btn-success flex-grow-1" onClick={addPatient}>
                {editingId ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Patient List */}
      <div className="list-group list-group-flush">
        {filteredPatients.map((patient, index) => (
          <div key={patient.id} className="list-group-item">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h6 className="mb-1">{patient.name}</h6>
                <small className="text-muted">
                  📱 {patient.mobile} | 📍 {patient.place}
                </small>
                <br />
                <small className="text-muted">
                  🏥 Visit: {patient.visitedDate} | 📅 Next: {patient.nextVisitDate || 'Not set'}
                </small>
              </div>
              <div className="d-flex gap-2">
                <button 
                  className="btn btn-outline-success btn-sm"
                  onClick={() => handlePatientClick(patient)}
                >
                  👁️ View
                </button>
                <button 
                  className="btn btn-outline-warning btn-sm"
                  onClick={() => editPatient(patient)}
                >
                  ✏️ Edit
                </button>
                <button 
                  className="btn btn-outline-danger btn-sm"
                  onClick={() => deletePatient(patient.id)}
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Patient Details Modal */}
      {selectedPatient && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-fullscreen-sm-down">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">{selectedPatient.name}</h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setSelectedPatient(null)}
                ></button>
              </div>
              <div className="modal-body">
                {/* Treatment Details */}
                <div className="mb-4">
                  <h6>Patient Details</h6>
                  <div className="card">
                    <div className="card-body">
                      <p><strong>Name:</strong> {selectedPatient.name}</p>
                      <p><strong>Mobile:</strong> {selectedPatient.mobile}</p>
                      <p><strong>Place:</strong> {selectedPatient.place}</p>
                      <p><strong>Visit Date:</strong> {selectedPatient.visitedDate}</p>
                    </div>
                  </div>
                </div>

                {/* Next Visit Date */}
                <div className="mb-4">
                  <label className="form-label">Next Visit Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={selectedPatient.nextVisitDate}
                    onChange={(e) => updateNextVisitDate(e.target.value)}
                  />
                </div>

                {/* Add Medication Form */}
                <div className="mb-4">
                  <h6>Add Medication</h6>
                  <div className="row g-2">
                    <div className="col-12">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Medication Name"
                        value={newMedication.name}
                        onChange={(e) => setNewMedication({...newMedication, name: e.target.value})}
                        required
                      />
                    </div>
                    <div className="col-12">
                      <select
                        className="form-select"
                        value={newMedication.type}
                        onChange={(e) => setNewMedication({...newMedication, type: e.target.value as Medication['type']})}
                      >
                        <option value="Ayurvedic">Ayurvedic</option>
                        <option value="Unani">Unani</option>
                        <option value="Siddha">Siddha</option>
                        <option value="Homeopathic">Homeopathic</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="col-12">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Dosage"
                        value={newMedication.dosage}
                        onChange={(e) => setNewMedication({...newMedication, dosage: e.target.value})}
                        required
                      />
                    </div>
                    <div className="col-12">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Frequency"
                        value={newMedication.frequency}
                        onChange={(e) => setNewMedication({...newMedication, frequency: e.target.value})}
                        required
                      />
                    </div>
                    <div className="col-12">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Duration"
                        value={newMedication.duration}
                        onChange={(e) => setNewMedication({...newMedication, duration: e.target.value})}
                      />
                    </div>
                    <div className="col-12">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Notes"
                        value={newMedication.notes}
                        onChange={(e) => setNewMedication({...newMedication, notes: e.target.value})}
                      />
                    </div>
                    <div className="col-12">
                      <button className="btn btn-success w-100" onClick={addMedication}>
                        Add Medication
                      </button>
                    </div>
                  </div>
                </div>

                {/* Medications List */}
                <div>
                  <h6>Current Medications</h6>
                  <div className="list-group">
                    {(selectedPatient.medications || []).map((med) => (
                      <div key={med.id} className="list-group-item">
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <h6 className="mb-1">{med.name}</h6>
                            <small className="text-muted">
                              💊 {med.dosage} | ⏰ {med.frequency}
                            </small>
                            <div>
                              <small className="text-muted">
                                🌿 Type: {med.type}
                              </small>
                            </div>
                            {med.duration && (
                              <div>
                                <small className="text-muted">
                                  ⏱️ Duration: {med.duration}
                                </small>
                              </div>
                            )}
                            {med.notes && (
                              <div>
                                <small className="text-muted">
                                  📝 {med.notes}
                                </small>
                              </div>
                            )}
                          </div>
                          <button 
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => deleteMedication(selectedPatient.id, med.id)}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Download PDF Button */}
      <div className="position-fixed bottom-0 end-0 p-3">
        <button 
          className="btn btn-success rounded-circle shadow-lg"
          onClick={downloadPDF}
          style={{ width: '60px', height: '60px' }}
        >
          ⬇️
        </button>
      </div>
    </div>
  );
};

export default PatientManagement; 