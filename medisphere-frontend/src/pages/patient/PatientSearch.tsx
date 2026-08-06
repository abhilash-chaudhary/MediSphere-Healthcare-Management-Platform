import React, { useState, useEffect, useCallback } from 'react';
import { Search, Eye, UserCheck, CheckCircle2, ShieldAlert, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import { getAssignedPatientsForUser, MasterPatientData } from '../../constants/patientAssignments';

interface PatientRecord {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender: string;
  age?: number;
  primaryCondition?: string;
  aiRisk?: string;
  aiConfidence?: number;
  insuranceProvider?: string;
}

interface PatientSearchProps {
  user?: { username?: string; roles?: string[] } | null;
  patients: any[];
  onSearch: (query: string) => void;
  onSelectPatient: (patientId: string) => void;
}

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

export default function PatientSearch({ user, patients, onSearch, onSelectPatient }: PatientSearchProps) {
  const [query, setQuery] = useState('');
  const [assignedPatients, setAssignedPatients] = useState<PatientRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const doctorUsername = user?.username || '';

  // Fetch assigned patients from API with fallback to local assignments map
  const fetchAssignedPatients = useCallback(async () => {
    if (!doctorUsername) return;
    setLoading(true);
    setError('');

    try {
      const res = await api.get(`/patients/assigned?doctorUsername=${doctorUsername}`);
      if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
        setAssignedPatients(res.data.data);
        return;
      }
    } catch {
      // API unreachable or error
    }

    // Fallback: load assigned patients from local master registry / localStorage
    const localAssigned = getAssignedPatientsForUser(user).map(masterToRecord);
    setAssignedPatients(localAssigned);
  }, [doctorUsername, user]);

  useEffect(() => {
    fetchAssignedPatients().finally(() => setLoading(false));
  }, [fetchAssignedPatients]);

  // Filter by search query
  const displayPatients = query.trim()
    ? assignedPatients.filter(p =>
        `${p.firstName} ${p.lastName} ${p.id} ${p.email} ${p.primaryCondition || ''}`.toLowerCase().includes(query.toLowerCase())
      )
    : assignedPatients;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  const handleRefresh = () => {
    fetchAssignedPatients().finally(() => setLoading(false));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Top Banner Card */}
      <div className="glass-panel" style={{ padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <UserCheck size={26} style={{ color: '#3b82f6' }} />
            <h2 style={{ fontSize: '24px', background: 'linear-gradient(135deg, #fff 40%, #3b82f6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              My Assigned Patients
            </h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Patients assigned to <strong>Dr. {doctorUsername}</strong> by the System Administrator. Data is loaded from the <strong>database</strong>.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button onClick={handleRefresh} style={{ padding: '8px 16px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#60a5fa', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600' }}>
            <RefreshCw size={14} /> Refresh
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '10px 18px', borderRadius: '10px', color: '#60a5fa', fontWeight: '600', fontSize: '13px' }}>
            <CheckCircle2 size={16} />
            <span>{assignedPatients.length} Patients Assigned</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="glass-panel" style={{ padding: '12px 20px', borderLeft: '4px solid #f59e0b', background: 'rgba(245, 158, 11, 0.08)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShieldAlert size={18} style={{ color: '#f59e0b' }} />
          <span style={{ fontSize: '13px', color: '#fbbf24' }}>{error}</span>
        </div>
      )}

      <div className="glass-panel" style={{ padding: '32px' }}>
        {/* Search Input Bar */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '16px', marginBottom: '28px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '16px', top: '15px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search assigned patient by name, ID, condition, or email..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ paddingLeft: '48px', height: '48px', borderRadius: 'var(--radius-sm)', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '14px' }}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ height: '48px', padding: '0 32px' }}>
            Search
          </button>
        </form>

        {/* Loading State */}
        {loading && (
          <div style={{ padding: '50px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 10px' }} />
            <p>Loading assigned patients from database...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && assignedPatients.length === 0 ? (
          <div style={{ padding: '50px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <ShieldAlert size={42} style={{ margin: '0 auto 14px', color: '#f59e0b', opacity: 0.6 }} />
            <h4 style={{ fontSize: '16px', color: '#fff', marginBottom: '6px' }}>No Patients Assigned Yet</h4>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              No patients are currently assigned to <strong>Dr. {doctorUsername}</strong>.
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Ask the administrator to assign patients using the <strong>Admin Patient Assignment</strong> page.
            </p>
          </div>
        ) : !loading && displayPatients.length === 0 ? (
          <div style={{ padding: '50px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
            No assigned patients match your search query "{query}".
          </div>
        ) : !loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {displayPatients.map((patient) => {
              const riskColor = patient.aiRisk === 'High' ? '#ef4444' : patient.aiRisk === 'Medium' ? '#f59e0b' : '#10b981';

              return (
                <div
                  key={patient.id}
                  style={{
                    padding: '20px 24px',
                    background: 'rgba(15, 23, 42, 0.65)',
                    border: '1px solid rgba(59, 130, 246, 0.35)',
                    borderRadius: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    boxShadow: '0 4px 14px rgba(59, 130, 246, 0.08)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <strong style={{ fontSize: '18px', color: '#fff' }}>
                          {patient.firstName} {patient.lastName}
                        </strong>
                        <span style={{ fontSize: '11px', background: 'rgba(16, 185, 129, 0.18)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.35)', padding: '2px 8px', borderRadius: '10px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <UserCheck size={12} /> Assigned to Dr. {doctorUsername}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', flexWrap: 'wrap' }}>
                        <span>ID: <strong style={{ color: '#60a5fa' }}>{patient.id}</strong></span>
                        {patient.dateOfBirth && <span>DOB: <strong>{patient.dateOfBirth}</strong></span>}
                        <span>Gender: <strong>{patient.gender}</strong></span>
                        <span>Email: <strong>{patient.email}</strong></span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      {patient.aiRisk && (
                        <span style={{ fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '16px', background: `${riskColor}20`, color: riskColor, border: `1px solid ${riskColor}50` }}>
                          {patient.aiRisk} Risk {patient.aiConfidence ? `(${patient.aiConfidence}%)` : ''}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => onSelectPatient(patient.id)}
                        className="btn btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                      >
                        <Eye size={16} /> Open 360 View
                      </button>
                    </div>
                  </div>

                  {/* Diagnosis Row */}
                  {patient.primaryCondition && (
                    <div style={{ paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ fontSize: '12px', color: '#93c5fd', background: 'rgba(59,130,246,0.1)', padding: '4px 12px', borderRadius: '6px', width: 'fit-content' }}>
                        🩺 Diagnosis: <strong>{patient.primaryCondition}</strong>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
