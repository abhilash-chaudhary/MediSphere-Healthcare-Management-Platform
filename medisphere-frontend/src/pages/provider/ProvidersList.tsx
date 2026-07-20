import React from 'react';
import { Building, Phone, Mail, MapPin, Clock } from 'lucide-react';

interface Provider {
  id: string;
  name: string;
  type: string;
  specialty: string;
  department: string;
  schedule: string[];
  location: string;
  email: string;
  phone: string;
}

interface ProvidersListProps {
  providers: Provider[];
}

export default function ProvidersList({ providers }: ProvidersListProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div className="glass-panel" style={{ padding: '24px 32px' }}>
        <h2 style={{ fontSize: '24px', background: 'linear-gradient(135deg, #fff 40%, var(--color-primary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '8px' }}>
          Hospital Departments & Providers
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Find consulting doctors, medical specialties, and clinic operating schedules active within the MediSphere EHR system.
        </p>
      </div>

      {providers.length === 0 ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          No registered clinical providers found in database registry.
        </div>
      ) : (
        <div className="grid-3">
          {providers.map((provider) => (
            <div key={provider.id} className="glass-panel interactive" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(0, 242, 254, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
                  <Building size={20} />
                </div>
                <div>
                  <h4 style={{ fontSize: '16px', color: '#fff' }}>{provider.name}</h4>
                  <span style={{ fontSize: '12px', color: 'var(--color-primary)' }}>
                    {provider.specialty} ({provider.type})
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={14} style={{ color: 'var(--text-muted)' }} />
                  <span>Dept: {provider.department} - {provider.location}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Mail size={14} style={{ color: 'var(--text-muted)' }} />
                  <span>{provider.email}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Phone size={14} style={{ color: 'var(--text-muted)' }} />
                  <span>{provider.phone}</span>
                </div>
                
                <div style={{ marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>
                    <Clock size={12} /> Consult Hours
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {provider.schedule.map((day, idx) => (
                      <span key={idx} className="badge badge-normal" style={{ fontSize: '10px', padding: '2px 8px' }}>
                        {day}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
