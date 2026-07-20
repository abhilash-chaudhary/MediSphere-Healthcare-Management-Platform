import React, { useState, useEffect } from 'react';
import { User, Save, ShieldAlert } from 'lucide-react';

interface PatientProfileData {
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
  medicalHistory: string[];
}

interface PatientProfileProps {
  initialProfile: PatientProfileData | null;
  onSaveProfile: (profile: PatientProfileData) => void;
}

export default function PatientProfile({ initialProfile, onSaveProfile }: PatientProfileProps) {
  const [profile, setProfile] = useState<PatientProfileData>({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    dateOfBirth: '',
    gender: 'Male',
    address: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    insuranceProvider: '',
    insurancePolicyNumber: '',
    medicalHistory: []
  });

  useEffect(() => {
    if (initialProfile) {
      setProfile(initialProfile);
    }
  }, [initialProfile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile(profile);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div className="glass-panel" style={{ padding: '24px 32px' }}>
        <h2 style={{ fontSize: '24px', background: 'linear-gradient(135deg, #fff 40%, var(--color-primary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '8px' }}>
          Personal Demographics Profile
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Configure your demographic details, address records, and primary medical health insurance policies. Changes sync downstream to paired EHR databases.
        </p>
      </div>

      <div className="glass-panel" style={{ padding: '32px' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <h3 style={{ fontSize: '18px', color: 'var(--color-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
            Demographics & Details
          </h3>

          <div className="grid-3">
            <div>
              <label>First Name</label>
              <input
                type="text"
                name="firstName"
                value={profile.firstName}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label>Last Name</label>
              <input
                type="text"
                name="lastName"
                value={profile.lastName}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label>Gender</label>
              <select
                name="gender"
                value={profile.gender}
                onChange={handleChange}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label>Date of Birth</label>
              <input
                type="date"
                name="dateOfBirth"
                value={profile.dateOfBirth}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label>Email Address</label>
              <input
                type="email"
                name="email"
                value={profile.email}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label>Contact Phone</label>
              <input
                type="text"
                name="phoneNumber"
                value={profile.phoneNumber}
                onChange={handleChange}
              />
            </div>
          </div>

          <div style={{ width: '100%' }}>
            <label>Residential Address</label>
            <input
              type="text"
              name="address"
              value={profile.address}
              onChange={handleChange}
            />
          </div>

          <h3 style={{ fontSize: '18px', color: 'var(--color-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginTop: '10px' }}>
            Insurance & Policy Details
          </h3>

          <div className="grid-2">
            <div>
              <label>Insurance Provider</label>
              <input
                type="text"
                name="insuranceProvider"
                value={profile.insuranceProvider}
                onChange={handleChange}
              />
            </div>
            <div>
              <label>Insurance Policy Number</label>
              <input
                type="text"
                name="insurancePolicyNumber"
                value={profile.insurancePolicyNumber}
                onChange={handleChange}
              />
            </div>
          </div>

          <h3 style={{ fontSize: '18px', color: 'var(--color-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginTop: '10px' }}>
            Emergency Contact Information
          </h3>

          <div className="grid-2">
            <div>
              <label>Emergency Contact Full Name</label>
              <input
                type="text"
                name="emergencyContactName"
                value={profile.emergencyContactName}
                onChange={handleChange}
              />
            </div>
            <div>
              <label>Emergency Contact Telephone</label>
              <input
                type="text"
                name="emergencyContactPhone"
                value={profile.emergencyContactPhone}
                onChange={handleChange}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button type="submit" className="btn btn-primary">
              <Save size={16} /> Save Changes
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
