import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import 'bootstrap/dist/css/bootstrap.min.css';

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes: string;
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
    notes: ''
  });

  useEffect(() => {
    const savedPatients = localStorage.getItem('patients');
    if (savedPatients) {
      const parsedPatients = JSON.parse(savedPatients);
      // Ensure all patients have medications array
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
  };

  const cancelEdit = () => {
    setEditingId(null);
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
      notes: ''
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

    const headers = [["#", "Name", "Mobile", "Place", "Visited Date", "Next Visit"]];
    const data = patients.map((p, i) => [i + 1, p.name, p.mobile, p.place, p.visitedDate, p.nextVisitDate]);

    (doc as any).autoTable({
      startY: 30,
      head: headers,
      body: data
    });

    doc.save("patients.pdf");
  };

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.mobile.includes(search)
  );

  return (
    <div className="container my-5">
      <div className="text-center mb-4">
        <h2 className="fw-bold">🩺 Patient Management System</h2>
      </div>

      <div className="card p-4 mb-4">
        <h4>{editingId ? 'Edit Patient' : 'Add New Patient'}</h4>
        <div className="row g-3">
          <div className="col-md-3">
            <input
              type="text"
              className="form-control"
              placeholder="Name"
              value={newPatient.name}
              onChange={(e) => setNewPatient({...newPatient, name: e.target.value})}
              required
            />
          </div>
          <div className="col-md-3">
            <input
              type="text"
              className="form-control"
              placeholder="Mobile Number"
              value={newPatient.mobile}
              onChange={(e) => setNewPatient({...newPatient, mobile: e.target.value})}
              required
            />
          </div>
          <div className="col-md-3">
            <input
              type="text"
              className="form-control"
              placeholder="Place"
              value={newPatient.place}
              onChange={(e) => setNewPatient({...newPatient, place: e.target.value})}
              required
            />
          </div>
          <div className="col-md-3">
            <input
              type="date"
              className="form-control"
              value={newPatient.visitedDate}
              onChange={(e) => setNewPatient({...newPatient, visitedDate: e.target.value})}
              required
            />
          </div>
          <div className="col-12 text-end">
            {editingId && (
              <button className="btn btn-secondary me-2" onClick={cancelEdit}>
                Cancel
              </button>
            )}
            <button className="btn btn-success" onClick={addPatient}>
              {editingId ? 'Update Patient' : '➕ Add Patient'}
            </button>
          </div>
        </div>
      </div>

      <div className="card p-4 mb-4">
        <h4>Search Patient</h4>
        <input
          type="text"
          className="form-control"
          placeholder="Search by name or mobile number"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card p-4">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h4 className="mb-0">Patient List</h4>
          <button className="btn btn-primary btn-sm" onClick={downloadPDF}>⬇️ Download PDF</button>
        </div>
        <div className="table-responsive">
          <table className="table table-striped table-bordered align-middle">
            <thead className="table-dark">
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Mobile</th>
                <th>Place</th>
                <th>Visited Date</th>
                <th>Next Visit</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.map((patient, index) => (
                <tr key={patient.id}>
                  <td>{index + 1}</td>
                  <td>
                    <button 
                      className="btn btn-link p-0 text-decoration-none"
                      onClick={() => handlePatientClick(patient)}
                    >
                      {patient.name}
                    </button>
                  </td>
                  <td>{patient.mobile}</td>
                  <td>{patient.place}</td>
                  <td>{patient.visitedDate}</td>
                  <td>{patient.nextVisitDate}</td>
                  <td>
                    <div className="btn-group">
                      <button 
                        className="btn btn-warning btn-sm"
                        onClick={() => editPatient(patient)}
                      >
                        ✏️ Edit
                      </button>
                      <button 
                        className="btn btn-danger btn-sm"
                        onClick={() => deletePatient(patient.id)}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Patient Details Modal */}
      {selectedPatient && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Patient Details - {selectedPatient.name}</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setSelectedPatient(null)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-4">
                  <h6>Next Visit Date</h6>
                  <input
                    type="date"
                    className="form-control"
                    value={selectedPatient.nextVisitDate}
                    onChange={(e) => updateNextVisitDate(e.target.value)}
                  />
                </div>

                <div className="mb-4">
                  <h6>Add Medication</h6>
                  <div className="row g-3">
                    <div className="col-md-4">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Medication Name"
                        value={newMedication.name}
                        onChange={(e) => setNewMedication({...newMedication, name: e.target.value})}
                        required
                      />
                    </div>
                    <div className="col-md-4">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Dosage"
                        value={newMedication.dosage}
                        onChange={(e) => setNewMedication({...newMedication, dosage: e.target.value})}
                        required
                      />
                    </div>
                    <div className="col-md-4">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Frequency"
                        value={newMedication.frequency}
                        onChange={(e) => setNewMedication({...newMedication, frequency: e.target.value})}
                        required
                      />
                    </div>
                    <div className="col-md-4">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Duration"
                        value={newMedication.duration}
                        onChange={(e) => setNewMedication({...newMedication, duration: e.target.value})}
                      />
                    </div>
                    <div className="col-md-8">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Notes"
                        value={newMedication.notes}
                        onChange={(e) => setNewMedication({...newMedication, notes: e.target.value})}
                      />
                    </div>
                    <div className="col-12 text-end">
                      <button className="btn btn-primary" onClick={addMedication}>
                        Add Medication
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <h6>Current Medications</h6>
                  <div className="table-responsive">
                    <table className="table table-bordered">
                      <thead className="table-light">
                        <tr>
                          <th>Medication</th>
                          <th>Dosage</th>
                          <th>Frequency</th>
                          <th>Duration</th>
                          <th>Notes</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedPatient.medications || []).map((med) => (
                          <tr key={med.id}>
                            <td>{med.name}</td>
                            <td>{med.dosage}</td>
                            <td>{med.frequency}</td>
                            <td>{med.duration}</td>
                            <td>{med.notes}</td>
                            <td>
                              <button 
                                className="btn btn-danger btn-sm"
                                onClick={() => deleteMedication(selectedPatient.id, med.id)}
                              >
                                🗑️ Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientManagement; 