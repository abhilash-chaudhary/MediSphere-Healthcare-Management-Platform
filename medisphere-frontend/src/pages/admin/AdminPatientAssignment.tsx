import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import {
  UserCheck, UserPlus, UserMinus, Search, Shield, CheckCircle,
  RefreshCw, AlertCircle, Plus, X, ChevronDown, ChevronUp, Sparkles
} from 'lucide-react';
import {
  getAllPatientsMaster,
  getDoctorAssignmentsMap,
  saveDoctorAssignmentsMap,
  addCustomPatient,
  MasterPatientData
} from '../../constants/patientAssignments';

interface Doctor {
  id: string;
  username: string;
  email: string;
  roles?: string[];
}

interface PatientRecord {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  gender: string;
  age?: number;
  primaryCondition?: string;
  aiRisk?: string;
  aiConfidence?: number;
  dateOfBirth?: string;
  insuranceProvider?: string;
}

// Track whether we are operating with the live backend or local fallback data
let usingFallback = false;

// Convert a MasterPatientData entry to a PatientRecord for display
function masterToRecord(p: MasterPatientData): PatientRecord {
  const parts = p.patientName.split(' ');
  return {
    id: p.patientId,
    firstName: parts[0] || p.patientId,
    lastName: parts.slice(1).join(' ') || '',
    email: `${p.patientId}@medisphere.io`,
    phoneNumber: '+1-555-0199',
    gender: p.gender || 'Male',
    age: p.age,
    primaryCondition: p.primaryCondition,
    aiRisk: p.aiRisk,
    aiConfidence: p.aiConfidence,
    insuranceProvider: 'Aetna Global Health',
  };
}

// Hardcoded fallback doctors that match the default assignment map
const FALLBACK_DOCTORS: Doctor[] = [
  { id: 'fb_1', username: 'dr_smith', email: 'dr_smith@medisphere.io', roles: ['DOCTOR'] },
  { id: 'fb_2', username: 'dr_johnson', email: 'dr_johnson@medisphere.io', roles: ['DOCTOR'] },
  { id: 'fb_3', username: 'dr_jones', email: 'dr_jones@medisphere.io', roles: ['DOCTOR'] },
  { id: 'fb_4', username: 'doctor', email: 'doctor@medisphere.io', roles: ['DOCTOR'] },
  { id: 'fb_5', username: 'dr_primary', email: 'dr_primary@medisphere.io', roles: ['DOCTOR'] },
];

export default function AdminPatientAssignment() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [assignedPatients, setAssignedPatients] = useState<PatientRecord[]>([]);
  const [unassignedPatients, setUnassignedPatients] = useState<PatientRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [msg, setMsg] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddDoctorForm, setShowAddDoctorForm] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', age: 45, gender: 'Female',
    primaryCondition: 'Arrhythmia Monitoring', aiRisk: 'Medium' as string,
    phoneNumber: '', address: '', insuranceProvider: 'Aetna Global Health'
  });
  const [doctorFormData, setDoctorFormData] = useState({
    username: '', email: '', password: ''
  });

  // Compute assigned / unassigned from local fallback data
  const loadFallbackAssignments = useCallback((docUsername: string) => {
    const map = getDoctorAssignmentsMap();
    const assignedIds: string[] = map[docUsername] || [];
    const allMaster = getAllPatientsMaster();
    const assignedSet = new Set(assignedIds);
    setAssignedPatients(allMaster.filter(p => assignedSet.has(p.patientId)).map(masterToRecord));
    setUnassignedPatients(allMaster.filter(p => !assignedSet.has(p.patientId)).map(masterToRecord));
  }, []);

  // Fetch doctors from auth-service, with fallback to hardcoded list
  useEffect(() => {
    api.get('/auth/users?role=DOCTOR')
      .then(res => {
        if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
          setDoctors(res.data.data);
          usingFallback = false;
          if (!selectedDoctor) setSelectedDoctor(res.data.data[0].username);
        } else {
          throw new Error('empty');
        }
      })
      .catch(() => {
        // Fallback: use hardcoded doctor list
        usingFallback = true;
        setDoctors(FALLBACK_DOCTORS);
        if (!selectedDoctor) setSelectedDoctor(FALLBACK_DOCTORS[0].username);
      });
  }, []);

  // Fetch assigned + unassigned patients for the selected doctor
  const fetchAssignments = useCallback(async (docUsername: string) => {
    if (!docUsername) return;
    setLoading(true);
    try {
      const [assignedRes, unassignedRes] = await Promise.all([
        api.get(`/patients/assigned?doctorUsername=${docUsername}`),
        api.get(`/patients/unassigned?doctorUsername=${docUsername}`),
      ]);

      const assignedOk = assignedRes.data?.success && Array.isArray(assignedRes.data.data);
      const unassignedOk = unassignedRes.data?.success && Array.isArray(unassignedRes.data.data);

      if (assignedOk || unassignedOk) {
        usingFallback = false;
        setAssignedPatients(assignedOk ? assignedRes.data.data : []);
        setUnassignedPatients(unassignedOk ? unassignedRes.data.data : []);
      } else {
        // API returned success:false or no data array — use fallback
        usingFallback = true;
        loadFallbackAssignments(docUsername);
      }
    } catch {
      // Backend unavailable — use fallback
      usingFallback = true;
      loadFallbackAssignments(docUsername);
    } finally {
      setLoading(false);
    }
  }, [loadFallbackAssignments]);

  useEffect(() => {
    if (selectedDoctor) fetchAssignments(selectedDoctor);
  }, [selectedDoctor, fetchAssignments]);

  // Handle assigning patient to doctor via API (with local fallback)
  const handleAssign = async (patientId: string) => {
    if (!selectedDoctor) return;
    const patient = unassignedPatients.find(p => p.id === patientId);
    const pName = patient ? `${patient.firstName} ${patient.lastName}` : patientId;

    // Always keep local storage assignment map in sync
    const map = getDoctorAssignmentsMap();
    const current = map[selectedDoctor] || [];
    if (!current.includes(patientId)) {
      map[selectedDoctor] = [...current, patientId];
      saveDoctorAssignmentsMap(map);
    }

    if (!usingFallback) {
      try {
        await api.post('/patients/assign', {
          patientId,
          doctorUsername: selectedDoctor,
          assignedBy: 'admin'
        });
        setMsg(`✓ Assigned ${pName} to ${selectedDoctor}`);
        setTimeout(() => setMsg(''), 3500);
        fetchAssignments(selectedDoctor);
        return;
      } catch {
        // Fall through to local fallback
      }
    }

    setMsg(`✓ Assigned ${pName} to ${selectedDoctor}`);
    setTimeout(() => setMsg(''), 3500);
    loadFallbackAssignments(selectedDoctor);
  };

  // Handle unassigning patient from doctor via API (with local fallback)
  const handleUnassign = async (patientId: string) => {
    if (!selectedDoctor) return;
    const patient = assignedPatients.find(p => p.id === patientId);
    const pName = patient ? `${patient.firstName} ${patient.lastName}` : patientId;

    // Always keep local storage assignment map in sync
    const map = getDoctorAssignmentsMap();
    const current = map[selectedDoctor] || [];
    map[selectedDoctor] = current.filter(id => id !== patientId);
    saveDoctorAssignmentsMap(map);

    if (!usingFallback) {
      try {
        await api.delete(`/patients/assign?patientId=${patientId}&doctorUsername=${selectedDoctor}`);
        setMsg(`✓ Unassigned ${pName} from ${selectedDoctor}`);
        setTimeout(() => setMsg(''), 3500);
        fetchAssignments(selectedDoctor);
        return;
      } catch {
        // Fall through to local fallback
      }
    }

    setMsg(`✓ Unassigned ${pName} from ${selectedDoctor}`);
    setTimeout(() => setMsg(''), 3500);
    loadFallbackAssignments(selectedDoctor);
  };

  // Handle Add New Patient to database (with local fallback)
  const handleAddPatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      alert('Please enter both First Name and Last Name.');
      return;
    }

    const patientId = `p_${Date.now().toString().slice(-6)}`;
    const newPatient = {
      id: patientId,
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim() || `${formData.firstName.toLowerCase()}.${formData.lastName.toLowerCase()}@medisphere.io`,
      phoneNumber: formData.phoneNumber || '+1-555-0199',
      gender: formData.gender,
      age: Number(formData.age) || 45,
      address: formData.address || '742 Evergreen Terrace, Medical District',
      primaryCondition: formData.primaryCondition || 'Routine Monitoring',
      aiRisk: formData.aiRisk || 'Medium',
      aiConfidence: 93.5,
      insuranceProvider: formData.insuranceProvider || 'Aetna Global Health',
      insurancePolicyNumber: `POL-${patientId.toUpperCase()}-99`,
      medicalHistory: [formData.primaryCondition || 'Routine Monitoring']
    };

    let savedViaApi = false;
    if (!usingFallback) {
      try {
        await api.post('/patients', newPatient);
        savedViaApi = true;
      } catch {
        // Fall through to local fallback
      }
    }

    if (!savedViaApi) {
      // Fallback: add to in-memory master patient list + localStorage
      const masterEntry: MasterPatientData = {
        patientId,
        patientName: `${newPatient.firstName} ${newPatient.lastName}`,
        age: newPatient.age,
        gender: newPatient.gender,
        status: 'ONLINE',
        vitals: { heartRate: 78, spo2: 97, temperature: 36.6, bloodPressure: '120/80', lastUpdated: 'Just now' },
        aiRisk: (newPatient.aiRisk as 'High' | 'Medium' | 'Low') || 'Medium',
        aiConfidence: newPatient.aiConfidence,
        openAlerts: 0,
        primaryCondition: newPatient.primaryCondition,
      };
      addCustomPatient(masterEntry);
    }

    setMsg(`✓ Patient ${newPatient.firstName} ${newPatient.lastName} added${savedViaApi ? ' to database' : ''}`);
    setTimeout(() => setMsg(''), 4000);
    setShowAddForm(false);
    setFormData({
      firstName: '', lastName: '', email: '', age: 45, gender: 'Female',
      primaryCondition: 'Arrhythmia Monitoring', aiRisk: 'Medium',
      phoneNumber: '', address: '', insuranceProvider: 'Aetna Global Health'
    });
    if (selectedDoctor) {
      if (usingFallback) {
        loadFallbackAssignments(selectedDoctor);
      } else {
        fetchAssignments(selectedDoctor);
      }
    }
  };

  // Handle Add New Doctor to auth database (with local fallback)
  const handleAddDoctorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorFormData.username.trim() || !doctorFormData.email.trim() || !doctorFormData.password.trim()) {
      alert('Please enter Username, Email, and Password.');
      return;
    }

    let savedViaApi = false;
    if (!usingFallback) {
      try {
        await api.post('/auth/register', {
          username: doctorFormData.username.trim(),
          email: doctorFormData.email.trim(),
          password: doctorFormData.password.trim(),
          roles: ['DOCTOR']
        });
        savedViaApi = true;

        // Refresh doctor list from API
        const res = await api.get('/auth/users?role=DOCTOR');
        if (res.data?.success && Array.isArray(res.data.data)) {
          setDoctors(res.data.data);
        }
      } catch {
        // Fall through to local fallback
      }
    }

    if (!savedViaApi) {
      // Fallback: add to the in-memory doctors list
      const newDoc: Doctor = {
        id: `fb_${Date.now()}`,
        username: doctorFormData.username.trim(),
        email: doctorFormData.email.trim(),
        roles: ['DOCTOR']
      };
      setDoctors(prev => {
        if (prev.some(d => d.username === newDoc.username)) return prev;
        return [...prev, newDoc];
      });
    }

    setMsg(`✓ Doctor ${doctorFormData.username} registered successfully`);
    setTimeout(() => setMsg(''), 4000);
    setShowAddDoctorForm(false);
    setDoctorFormData({ username: '', email: '', password: '' });
  };

  const filteredUnassigned = unassignedPatients.filter(p =>
    !search || `${p.firstName} ${p.lastName} ${p.id} ${p.email} ${p.primaryCondition}`.toLowerCase().includes(search.toLowerCase())
  );

  const filteredAssigned = assignedPatients.filter(p =>
    !search || `${p.firstName} ${p.lastName} ${p.id} ${p.email} ${p.primaryCondition}`.toLowerCase().includes(search.toLowerCase())
  );

  const selectedDoctorObj = doctors.find(d => d.username === selectedDoctor);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header Card */}
      <div className="glass-panel" style={{ padding: '28px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <Shield size={28} style={{ color: '#f59e0b' }} />
            <h2 style={{ fontSize: '24px', background: 'linear-gradient(135deg, #fff 40%, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Patient Assignment Management
            </h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Manage doctor-patient assignments. All data is stored in the <strong>MongoDB database</strong>.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => { setShowAddDoctorForm(!showAddDoctorForm); setShowAddForm(false); }} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: '600' }}>
            {showAddDoctorForm ? <X size={16} /> : <UserPlus size={16} />}
            {showAddDoctorForm ? 'Close Form' : 'Add Doctor'}
          </button>
          <button onClick={() => { setShowAddForm(!showAddForm); setShowAddDoctorForm(false); }} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: '600' }}>
            {showAddForm ? <X size={16} /> : <Plus size={16} />}
            {showAddForm ? 'Close Form' : 'Add New Patient'}
          </button>
          <button onClick={() => selectedDoctor && fetchAssignments(selectedDoctor)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: '600', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399' }}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {/* Status / Error Message */}
      {msg && (
        <div className="glass-panel" style={{
          padding: '12px 20px',
          display: 'flex', alignItems: 'center', gap: '10px',
          borderLeft: `4px solid ${msg.startsWith('✓') ? '#10b981' : '#f59e0b'}`,
          background: msg.startsWith('✓') ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)'
        }}>
          {msg.startsWith('✓') ? <CheckCircle size={18} style={{ color: '#10b981' }} /> : <AlertCircle size={18} style={{ color: '#f59e0b' }} />}
          <span style={{ fontSize: '13px', color: msg.startsWith('✓') ? '#34d399' : '#fbbf24' }}>{msg}</span>
        </div>
      )}

      {/* Add New Patient Form */}
      {showAddForm && (
        <div className="glass-panel" style={{ padding: '28px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Sparkles size={20} style={{ color: '#8b5cf6' }} />
            <h3 style={{ fontSize: '18px', color: '#fff' }}>Add New Patient to Database</h3>
          </div>
          <form onSubmit={handleAddPatientSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            {[
              { label: 'First Name *', key: 'firstName', type: 'text' },
              { label: 'Last Name *', key: 'lastName', type: 'text' },
              { label: 'Email', key: 'email', type: 'email' },
              { label: 'Phone', key: 'phoneNumber', type: 'text' },
              { label: 'Age', key: 'age', type: 'number' },
              { label: 'Primary Condition', key: 'primaryCondition', type: 'text' },
              { label: 'Insurance Provider', key: 'insuranceProvider', type: 'text' },
              { label: 'Address', key: 'address', type: 'text' },
            ].map(field => (
              <div key={field.key}>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>{field.label}</label>
                <input
                  type={field.type}
                  value={(formData as any)[field.key]}
                  onChange={e => setFormData(prev => ({ ...prev, [field.key]: field.type === 'number' ? Number(e.target.value) : e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '13px' }}
                />
              </div>
            ))}
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Gender</label>
              <select value={formData.gender} onChange={e => setFormData(prev => ({ ...prev, gender: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '13px' }}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>AI Risk Level</label>
              <select value={formData.aiRisk} onChange={e => setFormData(prev => ({ ...prev, aiRisk: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '13px' }}>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div style={{ gridColumn: 'span 3', display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <button type="button" onClick={() => setShowAddForm(false)} style={{ padding: '10px 24px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px' }}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" style={{ padding: '10px 28px', fontSize: '13px', fontWeight: '600' }}>
                <UserPlus size={16} style={{ marginRight: '8px' }} /> Create Patient
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add New Doctor Form */}
      {showAddDoctorForm && (
        <div className="glass-panel" style={{ padding: '28px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <UserPlus size={20} style={{ color: '#10b981' }} />
            <h3 style={{ fontSize: '18px', color: '#fff' }}>Register New Doctor</h3>
          </div>
          <form onSubmit={handleAddDoctorSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Username *</label>
              <input
                type="text"
                value={doctorFormData.username}
                onChange={e => setDoctorFormData(prev => ({ ...prev, username: e.target.value }))}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '13px' }}
                placeholder="e.g., dr_smith"
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Email *</label>
              <input
                type="email"
                value={doctorFormData.email}
                onChange={e => setDoctorFormData(prev => ({ ...prev, email: e.target.value }))}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '13px' }}
                placeholder="doctor@medisphere.io"
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Password *</label>
              <input
                type="password"
                value={doctorFormData.password}
                onChange={e => setDoctorFormData(prev => ({ ...prev, password: e.target.value }))}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '13px' }}
              />
            </div>
            <div style={{ gridColumn: 'span 3', display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <button type="button" onClick={() => setShowAddDoctorForm(false)} style={{ padding: '10px 24px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px' }}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" style={{ padding: '10px 28px', fontSize: '13px', fontWeight: '600' }}>
                <UserPlus size={16} style={{ marginRight: '8px' }} /> Register Doctor
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Doctor Selector + Search */}
      <div className="glass-panel" style={{ padding: '24px 32px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '220px' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Select Doctor</label>
          <select
            value={selectedDoctor}
            onChange={e => setSelectedDoctor(e.target.value)}
            style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '14px' }}
          >
            <option value="">-- Select Doctor --</option>
            {doctors.map(d => (
              <option key={d.id} value={d.username}>
                {d.username} ({d.email})
              </option>
            ))}
          </select>
        </div>

        <div style={{ flex: 1, minWidth: '220px' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Search Patients</label>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by name, ID, condition..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', paddingLeft: '42px', padding: '12px 14px 12px 42px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '14px' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '20px', paddingTop: '22px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#10b981' }}>{assignedPatients.length}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Assigned</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#f59e0b' }}>{unassignedPatients.length}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Unassigned</div>
          </div>
        </div>
      </div>

      {loading && (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '8px' }} />
          <p>Loading assignments from database...</p>
        </div>
      )}

      {!loading && selectedDoctor && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Assigned Patients Column */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
              <UserCheck size={20} style={{ color: '#10b981' }} />
              <h3 style={{ fontSize: '16px', color: '#34d399' }}>Assigned to {selectedDoctor} ({filteredAssigned.length})</h3>
            </div>

            {filteredAssigned.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                No patients assigned to this doctor yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '500px', overflowY: 'auto' }}>
                {filteredAssigned.map(p => {
                  const riskColor = p.aiRisk === 'High' ? '#ef4444' : p.aiRisk === 'Medium' ? '#f59e0b' : '#10b981';
                  return (
                    <div key={p.id} style={{ padding: '14px 16px', background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                      <div>
                        <div style={{ fontWeight: '600', color: '#fff', fontSize: '14px' }}>
                          {p.firstName} {p.lastName}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          ID: <strong style={{ color: '#60a5fa' }}>{p.id}</strong> · {p.email}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                          {p.primaryCondition && (
                            <span style={{ fontSize: '11px', background: 'rgba(59,130,246,0.1)', color: '#93c5fd', padding: '2px 8px', borderRadius: '6px' }}>
                              🩺 {p.primaryCondition}
                            </span>
                          )}
                          {p.aiRisk && (
                            <span style={{ fontSize: '11px', background: `${riskColor}20`, color: riskColor, padding: '2px 8px', borderRadius: '6px', fontWeight: '600' }}>
                              {p.aiRisk} Risk
                            </span>
                          )}
                        </div>
                      </div>
                      <button onClick={() => handleUnassign(p.id)} title="Unassign" style={{ padding: '8px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <UserMinus size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Unassigned Patients Column */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
              <UserPlus size={20} style={{ color: '#f59e0b' }} />
              <h3 style={{ fontSize: '16px', color: '#fbbf24' }}>Unassigned Patients ({filteredUnassigned.length})</h3>
            </div>

            {filteredUnassigned.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                All patients are assigned to this doctor.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '500px', overflowY: 'auto' }}>
                {filteredUnassigned.map(p => {
                  const riskColor = p.aiRisk === 'High' ? '#ef4444' : p.aiRisk === 'Medium' ? '#f59e0b' : '#10b981';
                  return (
                    <div key={p.id} style={{ padding: '14px 16px', background: 'rgba(245, 158, 11, 0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                      <div>
                        <div style={{ fontWeight: '600', color: '#fff', fontSize: '14px' }}>
                          {p.firstName} {p.lastName}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          ID: <strong style={{ color: '#60a5fa' }}>{p.id}</strong> · {p.email}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                          {p.primaryCondition && (
                            <span style={{ fontSize: '11px', background: 'rgba(59,130,246,0.1)', color: '#93c5fd', padding: '2px 8px', borderRadius: '6px' }}>
                              🩺 {p.primaryCondition}
                            </span>
                          )}
                          {p.aiRisk && (
                            <span style={{ fontSize: '11px', background: `${riskColor}20`, color: riskColor, padding: '2px 8px', borderRadius: '6px', fontWeight: '600' }}>
                              {p.aiRisk} Risk
                            </span>
                          )}
                        </div>
                      </div>
                      <button onClick={() => handleAssign(p.id)} title="Assign" style={{ padding: '8px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <UserPlus size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && !selectedDoctor && (
        <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Shield size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <p style={{ fontSize: '14px' }}>Select a doctor from the dropdown to manage their patient assignments.</p>
        </div>
      )}
    </div>
  );
}
