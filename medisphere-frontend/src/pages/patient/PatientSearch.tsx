import React, { useState } from 'react';
import { Search, Eye, AlertTriangle } from 'lucide-react';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  insuranceProvider: string;
  insurancePolicyNumber: string;
}

interface PatientSearchProps {
  patients: Patient[];
  onSearch: (query: string) => void;
  onSelectPatient: (patientId: string) => void;
}

export default function PatientSearch({ patients, onSearch, onSelectPatient }: PatientSearchProps) {
  const [query, setQuery] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div className="glass-panel" style={{ padding: '24px 32px' }}>
        <h2 style={{ fontSize: '24px', background: 'linear-gradient(135deg, #fff 40%, var(--color-primary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '8px' }}>
          Clinical Patient Search
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Search patients by name or ID to pull their 360 degree health twin profiles. Note: HIPAA security audits verify consent authorizations on every profile access.
        </p>
      </div>

      <div className="glass-panel" style={{ padding: '32px' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '16px', top: '15px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by first or last name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ paddingLeft: '48px', height: '48px', borderRadius: 'var(--radius-sm)' }}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ height: '48px', padding: '0 32px' }}>
            Query Registry
          </button>
        </form>

        {patients.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
            No records match the current query. Try searching for "John" or "Doe".
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {patients.map((patient) => (
              <div
                key={patient.id}
                style={{
                  padding: '16px 20px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <strong style={{ fontSize: '16px', color: '#fff', display: 'block' }}>
                    {patient.firstName} {patient.lastName}
                  </strong>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    <span>ID: <strong>{patient.id}</strong></span>
                    <span>DOB: <strong>{patient.dateOfBirth}</strong></span>
                    <span>Gender: <strong>{patient.gender}</strong></span>
                    <span>Email: <strong>{patient.email}</strong></span>
                  </div>
                </div>

                <button
                  onClick={() => onSelectPatient(patient.id)}
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '12px' }}
                >
                  <Eye size={14} /> Open 360 View
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
