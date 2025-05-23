import React, { useState, useEffect, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import 'bootstrap/dist/css/bootstrap.min.css';

interface Medication {
  id: string;
  description: string;
  date: string;
}

interface Patient {
  id: string;
  name: string;
  mobile: string;
  place: string;
  visitedDate: string;
  nextVisitDate: string;
  medications: Medication[];
  notes: string;
}

interface BackupConfig {
  enabled: boolean;
  interval: number; // in minutes
  lastBackup: number;
  maxBackups: number;
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
    medications: [],
    notes: ''
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [newMedication, setNewMedication] = useState<Medication>({
    id: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [backupConfig, setBackupConfig] = useState<BackupConfig>({
    enabled: false,
    interval: 60,
    lastBackup: 0,
    maxBackups: 5
  });
  const [backupHistory, setBackupHistory] = useState<{ timestamp: number; filename: string }[]>([]);
  const [db, setDb] = useState<IDBDatabase | null>(null);
  const [dateFilter, setDateFilter] = useState<string>('');

  // Initialize IndexedDB
  useEffect(() => {
    const request = indexedDB.open('PatientCareDB', 1);

    request.onerror = (event) => {
      console.error('Database error:', event);
    };

    request.onsuccess = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      setDb(database);
      loadPatients(database);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains('patients')) {
        database.createObjectStore('patients', { keyPath: 'id' });
      }
    };
  }, []);

  // Load patients from IndexedDB
  const loadPatients = (database: IDBDatabase) => {
    const transaction = database.transaction(['patients'], 'readonly');
    const store = transaction.objectStore('patients');
    const request = store.getAll();

    request.onsuccess = () => {
      const patientsWithMedications = request.result.map((patient: Patient) => ({
        ...patient,
        medications: patient.medications || []
      }));
      setPatients(patientsWithMedications);
    };
  };

  // Save patients to IndexedDB
  const savePatients = (updatedPatients: Patient[]) => {
    if (!db) return;

    const transaction = db.transaction(['patients'], 'readwrite');
    const store = transaction.objectStore('patients');

    // Clear existing data
    store.clear();

    // Add all patients
    updatedPatients.forEach(patient => {
      store.add(patient);
    });
  };

  const addPatient = () => {
    if (!newPatient.name || !newPatient.mobile || !newPatient.place) {
      alert("Please fill all fields.");
      return;
    }

    let updatedPatients: Patient[];
    if (editingId) {
      updatedPatients = patients.map(p => 
        p.id === editingId ? { ...newPatient, id: editingId, medications: p.medications || [] } : p
      );
    } else {
      const patientWithId = { 
        ...newPatient, 
        id: Date.now().toString(),
        medications: []
      };
      updatedPatients = [...patients, patientWithId];
    }

    setPatients(updatedPatients);
    savePatients(updatedPatients);
    setEditingId(null);
    setNewPatient({
      id: '',
      name: '',
      mobile: '',
      place: '',
      visitedDate: new Date().toISOString().split('T')[0],
      nextVisitDate: '',
      medications: [],
      notes: ''
    });
    setShowAddForm(false);
  };

  const deletePatient = (patientId: string) => {
    if (window.confirm('Are you sure you want to delete this patient?')) {
      const updatedPatients = patients.filter(p => p.id !== patientId);
      setPatients(updatedPatients);
      savePatients(updatedPatients);
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
      savePatients(updatedPatients);
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
      medications: [],
      notes: ''
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

    if (!newMedication.description) {
      alert("Please enter medication description.");
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
    savePatients(updatedPatients);
    setNewMedication({
      id: '',
      description: '',
      date: new Date().toISOString().split('T')[0]
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
    savePatients(updatedPatients);
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

  const backupData = () => {
    if (!db) return;

    const transaction = db.transaction(['patients'], 'readonly');
    const store = transaction.objectStore('patients');
    const request = store.getAll();

    request.onsuccess = () => {
      const data = request.result;
      const timestamp = Date.now();
      const filename = `patient-care-backup-${new Date(timestamp).toISOString().split('T')[0]}.json`;
      
      // Create backup file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Update backup history
      const newHistory = [
        { timestamp, filename },
        ...backupHistory.slice(0, backupConfig.maxBackups - 1)
      ];
      setBackupHistory(newHistory);

      // Update last backup time
      setBackupConfig(prev => ({
        ...prev,
        lastBackup: timestamp
      }));
    };
  };

  const restoreData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !db) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        const transaction = db.transaction(['patients'], 'readwrite');
        const store = transaction.objectStore('patients');

        // Clear existing data
        store.clear();

        // Add restored data
        data.forEach((patient: Patient) => {
          store.add(patient);
        });

        // Reload patients
        loadPatients(db);
        alert('Data restored successfully!');
      } catch (error) {
        alert('Error restoring data. Please check the backup file format.');
      }
    };
    reader.readAsText(file);
  };

  // Load backup configuration from localStorage
  useEffect(() => {
    const savedConfig = localStorage.getItem('backupConfig');
    if (savedConfig) {
      setBackupConfig(JSON.parse(savedConfig));
    }
    const savedHistory = localStorage.getItem('backupHistory');
    if (savedHistory) {
      setBackupHistory(JSON.parse(savedHistory));
    }
  }, []);

  // Save backup configuration to localStorage
  useEffect(() => {
    localStorage.setItem('backupConfig', JSON.stringify(backupConfig));
    localStorage.setItem('backupHistory', JSON.stringify(backupHistory));
  }, [backupConfig, backupHistory]);

  const performAutomaticBackup = useCallback(() => {
    if (!db) return;

    const transaction = db.transaction(['patients'], 'readonly');
    const store = transaction.objectStore('patients');
    const request = store.getAll();

    request.onsuccess = () => {
      const data = request.result;
      const timestamp = Date.now();
      const filename = `patient-care-backup-${new Date(timestamp).toISOString().split('T')[0]}.json`;
      
      // Create backup file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Update backup history
      const newHistory = [
        { timestamp, filename },
        ...backupHistory.slice(0, backupConfig.maxBackups - 1)
      ];
      setBackupHistory(newHistory);

      // Update last backup time
      setBackupConfig(prev => ({
        ...prev,
        lastBackup: timestamp
      }));
    };
  }, [db, backupConfig.maxBackups, backupHistory]);

  // Automatic backup timer
  useEffect(() => {
    if (!backupConfig.enabled) return;

    const checkAndBackup = () => {
      const now = Date.now();
      const timeSinceLastBackup = now - backupConfig.lastBackup;
      const intervalInMs = backupConfig.interval * 60 * 1000;

      if (timeSinceLastBackup >= intervalInMs) {
        performAutomaticBackup();
      }
    };

    const timer = setInterval(checkAndBackup, 60000); // Check every minute
    return () => clearInterval(timer);
  }, [backupConfig, performAutomaticBackup]);

  const toggleAutomaticBackup = () => {
    setBackupConfig(prev => ({
      ...prev,
      enabled: !prev.enabled,
      lastBackup: !prev.enabled ? Date.now() : prev.lastBackup
    }));
  };

  const updateBackupInterval = (minutes: number) => {
    setBackupConfig(prev => ({
      ...prev,
      interval: minutes
    }));
  };

  const downloadPatientDetails = (patient: Patient) => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(20);
    doc.text("Patient Details", 20, 20);
    
    // Patient Information
    doc.setFontSize(12);
    doc.text(`Name: ${patient.name}`, 20, 40);
    doc.text(`Mobile: ${patient.mobile}`, 20, 50);
    doc.text(`Place: ${patient.place}`, 20, 60);
    doc.text(`Visit Date: ${patient.visitedDate}`, 20, 70);
    doc.text(`Next Visit: ${patient.nextVisitDate || 'Not set'}`, 20, 80);
    
    if (patient.notes) {
      doc.text(`Notes: ${patient.notes}`, 20, 90);
    }

    // Medications
    if (patient.medications && patient.medications.length > 0) {
      doc.setFontSize(16);
      doc.text("Medications", 20, patient.notes ? 110 : 100);
      
      const medications = patient.medications.map((med, index) => [
        index + 1,
        med.date,
        med.description
      ]);

      autoTable(doc, {
        startY: patient.notes ? 120 : 110,
        head: [['#', 'Date', 'Description']],
        body: medications,
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
    }

    // Save the PDF
    doc.save(`patient-${patient.name}-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Add share function for individual patient
  const sharePatientData = async (patient: Patient) => {
    try {
      const shareData = {
        title: `Patient Details - ${patient.name}`,
        text: `Patient Details:\nName: ${patient.name}\nMobile: ${patient.mobile}\nPlace: ${patient.place}\nVisit Date: ${patient.visitedDate}\nNext Visit: ${patient.nextVisitDate || 'Not set'}\n\nMedications:\n${patient.medications.map(med => `- ${med.date}: ${med.description}`).join('\n')}`,
        url: window.location.href
      };

      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback for browsers that don't support Web Share API
        const textArea = document.createElement('textarea');
        textArea.value = shareData.text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('Patient details copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const filteredPatients = patients.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                         p.mobile.includes(search);
    
    if (!dateFilter) return matchesSearch;
    
    const patientNextVisit = new Date(p.nextVisitDate);
    const filterDate = new Date(dateFilter);
    
    return matchesSearch && 
           patientNextVisit.getFullYear() === filterDate.getFullYear() &&
           patientNextVisit.getMonth() === filterDate.getMonth() &&
           patientNextVisit.getDate() === filterDate.getDate();
  });

  return (
    <div className="container-fluid p-0">
      {/* Header */}
      <div className="bg-success text-white p-3 sticky-top">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h4 className="mb-0">🌿 AYUSH Clinic</h4>
          </div>
          
          {/* Desktop Menu */}
          <div className="d-none d-md-flex gap-2">
            <div className="dropdown">
              <button 
                className="btn btn-light btn-sm dropdown-toggle"
                type="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                ⚙️ Backup Settings
              </button>
              <div className="dropdown-menu p-3" style={{ width: '300px' }}>
                <div className="form-check form-switch mb-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={backupConfig.enabled}
                    onChange={toggleAutomaticBackup}
                  />
                  <label className="form-check-label">Enable Automatic Backups</label>
                </div>
                <div className="mb-2">
                  <label className="form-label">Backup Interval (minutes)</label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    value={backupConfig.interval}
                    onChange={(e) => updateBackupInterval(Number(e.target.value))}
                    min="1"
                    max="1440"
                  />
                </div>
                <div className="mb-2">
                  <label className="form-label">Maximum Backups to Keep</label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    value={backupConfig.maxBackups}
                    onChange={(e) => setBackupConfig(prev => ({
                      ...prev,
                      maxBackups: Number(e.target.value)
                    }))}
                    min="1"
                    max="10"
                  />
                </div>
                <div className="mb-2">
                  <label className="form-label">Last Backup</label>
                  <div className="small">
                    {backupConfig.lastBackup 
                      ? new Date(backupConfig.lastBackup).toLocaleString()
                      : 'Never'}
                  </div>
                </div>
                <div className="mb-2">
                  <label className="form-label">Backup History</label>
                  <div className="small" style={{ maxHeight: '100px', overflowY: 'auto' }}>
                    {backupHistory.map((backup, index) => (
                      <div key={index} className="mb-1">
                        {new Date(backup.timestamp).toLocaleString()}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <button 
              className="btn btn-light btn-sm"
              onClick={backupData}
            >
              💾 Backup Now
            </button>
            <label className="btn btn-light btn-sm mb-0">
              📂 Restore
              <input
                type="file"
                accept=".json"
                onChange={restoreData}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          {/* Mobile Menu Button */}
          <div className="d-flex d-md-none gap-2">
            <button 
              className="btn btn-light btn-sm"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
            >
              ☰
            </button>
            <button 
              className="btn btn-light btn-sm"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              ➕
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {showMobileMenu && (
          <div className="d-md-none mt-3 p-2 bg-white rounded">
            <div className="d-flex flex-column gap-2">
              <div className="dropdown">
                <button 
                  className="btn btn-success btn-sm w-100 text-start"
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  ⚙️ Backup Settings
                </button>
                <div className="dropdown-menu p-3 w-100">
                  <div className="form-check form-switch mb-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={backupConfig.enabled}
                      onChange={toggleAutomaticBackup}
                    />
                    <label className="form-check-label">Enable Automatic Backups</label>
                  </div>
                  <div className="mb-2">
                    <label className="form-label">Backup Interval (minutes)</label>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      value={backupConfig.interval}
                      onChange={(e) => updateBackupInterval(Number(e.target.value))}
                      min="1"
                      max="1440"
                    />
                  </div>
                  <div className="mb-2">
                    <label className="form-label">Maximum Backups to Keep</label>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      value={backupConfig.maxBackups}
                      onChange={(e) => setBackupConfig(prev => ({
                        ...prev,
                        maxBackups: Number(e.target.value)
                      }))}
                      min="1"
                      max="10"
                    />
                  </div>
                  <div className="mb-2">
                    <label className="form-label">Last Backup</label>
                    <div className="small">
                      {backupConfig.lastBackup 
                        ? new Date(backupConfig.lastBackup).toLocaleString()
                        : 'Never'}
                    </div>
                  </div>
                  <div className="mb-2">
                    <label className="form-label">Backup History</label>
                    <div className="small" style={{ maxHeight: '100px', overflowY: 'auto' }}>
                      {backupHistory.map((backup, index) => (
                        <div key={index} className="mb-1">
                          {new Date(backup.timestamp).toLocaleString()}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <button 
                className="btn btn-success btn-sm w-100 text-start"
                onClick={backupData}
              >
                💾 Backup Now
              </button>
              <label className="btn btn-success btn-sm w-100 text-start mb-0">
                📂 Restore
                <input
                  type="file"
                  accept=".json"
                  onChange={restoreData}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Search and Filter Bar */}
      <div className="p-3 bg-light">
        <div className="row g-2">
          <div className="col-12 col-md-8">
            <input
              type="text"
              className="form-control"
              placeholder="🔍 Search patients by name or mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="col-12 col-md-4">
            <input
              type="date"
              className="form-control"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              placeholder="Filter by next visit date"
            />
          </div>
        </div>
        {dateFilter && (
          <div className="mt-2">
            <button 
              className="btn btn-outline-secondary btn-sm"
              onClick={() => setDateFilter('')}
            >
              Clear Date Filter
            </button>
            <small className="text-muted ms-2">
              Showing patients with next visit on {new Date(dateFilter).toLocaleDateString()}
            </small>
          </div>
        )}
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
            <div className="col-12">
              <textarea
                className="form-control"
                placeholder="Patient Notes"
                value={newPatient.notes}
                onChange={(e) => setNewPatient({...newPatient, notes: e.target.value})}
                rows={3}
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
                {patient.notes && (
                  <div className="mt-1">
                    <small className="text-muted">
                      📝 Notes: {patient.notes}
                    </small>
                  </div>
                )}
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
              <div className="modal-header bg-success text-white d-flex justify-content-between align-items-center">
                <h5 className="modal-title mb-0">{selectedPatient.name}</h5>
                <div className="d-flex align-items-center gap-2">
                  <button 
                    className="btn btn-light btn-sm d-none d-md-block"
                    onClick={() => sharePatientData(selectedPatient)}
                    title="Share Patient Details"
                  >
                    📤 Share
                  </button>
                  <button 
                    className="btn btn-light btn-sm d-md-none"
                    onClick={() => sharePatientData(selectedPatient)}
                    title="Share Patient Details"
                    style={{ 
                      width: '32px', 
                      height: '32px',
                      padding: '0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    📤
                  </button>
                  <button 
                    className="btn btn-light btn-sm"
                    onClick={() => downloadPatientDetails(selectedPatient)}
                    title="Download Patient Details"
                  >
                    ⬇️
                  </button>
                  <button 
                    type="button" 
                    className="btn-close btn-close-white" 
                    onClick={() => setSelectedPatient(null)}
                  ></button>
                </div>
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
                      <textarea
                        className="form-control"
                        placeholder="Medication Description"
                        value={newMedication.description}
                        onChange={(e) => setNewMedication({...newMedication, description: e.target.value})}
                        rows={3}
                        required
                      />
                    </div>
                    <div className="col-12">
                      <input
                        type="date"
                        className="form-control"
                        value={newMedication.date}
                        onChange={(e) => setNewMedication({...newMedication, date: e.target.value})}
                        required
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
                            <div className="mb-1">
                              <small className="text-muted">
                                📅 {med.date}
                              </small>
                            </div>
                            <div>
                              {med.description}
                            </div>
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

      {/* Fixed Download Button */}
      <div 
        className="position-fixed bottom-0 end-0 p-3"
        style={{ zIndex: 1000 }}
      >
        <button 
          className="btn btn-success rounded-circle shadow-lg"
          onClick={downloadPDF}
          style={{ 
            width: '60px', 
            height: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px'
          }}
          title="Download All Patients PDF"
        >
          ⬇️
        </button>
      </div>
    </div>
  );
};

export default PatientManagement; 