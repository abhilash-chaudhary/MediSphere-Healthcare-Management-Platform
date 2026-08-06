export interface MasterPatientData {
  patientId: string;
  patientName: string;
  age: number;
  gender: string;
  status: 'ONLINE' | 'OFFLINE';
  vitals: {
    heartRate: number;
    spo2: number;
    temperature: number;
    bloodPressure: string;
    lastUpdated: string;
  };
  aiRisk: 'High' | 'Medium' | 'Low';
  aiConfidence: number;
  openAlerts: number;
  primaryCondition: string;
  wearableDetails?: {
    deviceModel: string;
    serialNumber: string;
    connectedAt: string;
  };
}

export const ALL_PATIENTS_MASTER: MasterPatientData[] = [
  {
    patientId: 'john_doe',
    patientName: 'John Doe',
    age: 45,
    gender: 'Male',
    status: 'ONLINE',
    vitals: { heartRate: 142, spo2: 94, temperature: 37.2, bloodPressure: '148/92', lastUpdated: 'Just now' },
    aiRisk: 'High',
    aiConfidence: 94.5,
    openAlerts: 1,
    primaryCondition: 'Acute Tachycardia / AFib',
    wearableDetails: { deviceModel: 'MedSphere ECG Patch Pro', serialNumber: 'WEAR-10921', connectedAt: 'Active' }
  },
  {
    patientId: 'jane_smith',
    patientName: 'Jane Smith',
    age: 38,
    gender: 'Female',
    status: 'ONLINE',
    vitals: { heartRate: 98, spo2: 89, temperature: 36.8, bloodPressure: '118/76', lastUpdated: 'Just now' },
    aiRisk: 'High',
    aiConfidence: 91.2,
    openAlerts: 1,
    primaryCondition: 'Hypoxia / Respiratory Distress',
    wearableDetails: { deviceModel: 'BioSens Smart Band', serialNumber: 'WEAR-38472', connectedAt: 'Active' }
  },
  {
    patientId: 'robert_j',
    patientName: 'Robert Johnson',
    age: 62,
    gender: 'Male',
    status: 'ONLINE',
    vitals: { heartRate: 84, spo2: 96, temperature: 36.6, bloodPressure: '178/104', lastUpdated: 'Just now' },
    aiRisk: 'Medium',
    aiConfidence: 87.6,
    openAlerts: 0,
    primaryCondition: 'Hypertension Stage 2',
    wearableDetails: { deviceModel: 'Apple Watch Series 9', serialNumber: 'WEAR-99381', connectedAt: 'Active' }
  },
  {
    patientId: 'eleanor_v',
    patientName: 'Eleanor Vance',
    age: 54,
    gender: 'Female',
    status: 'ONLINE',
    vitals: { heartRate: 72, spo2: 98, temperature: 36.5, bloodPressure: '120/80', lastUpdated: 'Just now' },
    aiRisk: 'Low',
    aiConfidence: 96.0,
    openAlerts: 0,
    primaryCondition: 'Arrhythmia Monitoring',
    wearableDetails: { deviceModel: 'MedSphere Cardiac Monitor', serialNumber: 'WEAR-44910', connectedAt: 'Active' }
  },
  {
    patientId: 'marcus_b',
    patientName: 'Marcus Brody',
    age: 62,
    gender: 'Male',
    status: 'ONLINE',
    vitals: { heartRate: 110, spo2: 92, temperature: 37.0, bloodPressure: '135/85', lastUpdated: 'Just now' },
    aiRisk: 'Medium',
    aiConfidence: 85.3,
    openAlerts: 1,
    primaryCondition: 'COPD / Asthma',
    wearableDetails: { deviceModel: 'Pulse Oximeter Ring', serialNumber: 'WEAR-82914', connectedAt: 'Active' }
  },
  {
    patientId: 'clara_o',
    patientName: 'Clara Oswald',
    age: 31,
    gender: 'Female',
    status: 'ONLINE',
    vitals: { heartRate: 128, spo2: 95, temperature: 36.9, bloodPressure: '130/82', lastUpdated: 'Just now' },
    aiRisk: 'High',
    aiConfidence: 92.8,
    openAlerts: 1,
    primaryCondition: 'Tachycardia / Elevated HR',
    wearableDetails: { deviceModel: 'MedSphere Patch Pro', serialNumber: 'WEAR-12903', connectedAt: 'Active' }
  },
  {
    patientId: 'david_t',
    patientName: 'David Tennant',
    age: 48,
    gender: 'Male',
    status: 'ONLINE',
    vitals: { heartRate: 76, spo2: 97, temperature: 36.7, bloodPressure: '124/82', lastUpdated: 'Just now' },
    aiRisk: 'Low',
    aiConfidence: 97.1,
    openAlerts: 0,
    primaryCondition: 'Type II Diabetes',
    wearableDetails: { deviceModel: 'Fitbit Sense 2', serialNumber: 'WEAR-77382', connectedAt: 'Active' }
  },
  {
    patientId: 'sophia_l',
    patientName: 'Sophia Loren',
    age: 67,
    gender: 'Female',
    status: 'ONLINE',
    vitals: { heartRate: 88, spo2: 93, temperature: 36.6, bloodPressure: '152/94', lastUpdated: 'Just now' },
    aiRisk: 'Medium',
    aiConfidence: 88.4,
    openAlerts: 0,
    primaryCondition: 'Coronary Artery Disease',
    wearableDetails: { deviceModel: 'Garmin Venu 3', serialNumber: 'WEAR-55829', connectedAt: 'Active' }
  }
];

export const DEFAULT_DOCTOR_ASSIGNMENTS_MAP: Record<string, string[]> = {
  dr_smith: ['john_doe', 'jane_smith'],
  dr_johnson: ['robert_j', 'eleanor_v'],
  dr_jones: ['robert_j', 'eleanor_v'],
  doctor: ['marcus_b', 'clara_o'],
  dr_primary: ['marcus_b', 'clara_o'],
};

export function getCustomPatients(): MasterPatientData[] {
  try {
    const saved = localStorage.getItem('medisphere_custom_patients');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function addCustomPatient(newPatient: MasterPatientData): MasterPatientData[] {
  const current = getCustomPatients();
  const updated = [newPatient, ...current.filter(p => p.patientId !== newPatient.patientId)];
  try {
    localStorage.setItem('medisphere_custom_patients', JSON.stringify(updated));
  } catch {}
  
  // Also keep ALL_PATIENTS_MASTER in-memory array in sync
  const idx = ALL_PATIENTS_MASTER.findIndex(p => p.patientId === newPatient.patientId);
  if (idx >= 0) {
    ALL_PATIENTS_MASTER[idx] = newPatient;
  } else {
    ALL_PATIENTS_MASTER.unshift(newPatient);
  }

  return updated;
}

export function getAllPatientsMaster(): MasterPatientData[] {
  const custom = getCustomPatients();
  const customIds = new Set(custom.map(p => p.patientId));
  const masterFiltered = ALL_PATIENTS_MASTER.filter(p => !customIds.has(p.patientId));
  return [...custom, ...masterFiltered];
}

// Auto-populate ALL_PATIENTS_MASTER with stored custom patients on initial module load
try {
  const existingCustom = getCustomPatients();
  existingCustom.forEach(cp => {
    if (!ALL_PATIENTS_MASTER.some(p => p.patientId === cp.patientId)) {
      ALL_PATIENTS_MASTER.unshift(cp);
    }
  });
} catch {}

export function getDoctorAssignmentsMap(): Record<string, string[]> {
  try {
    const saved = localStorage.getItem('medisphere_doctor_assignments');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        return { ...DEFAULT_DOCTOR_ASSIGNMENTS_MAP, ...parsed };
      }
    }
  } catch {}
  return { ...DEFAULT_DOCTOR_ASSIGNMENTS_MAP };
}

export function saveDoctorAssignmentsMap(map: Record<string, string[]>) {
  try {
    const enriched = { ...map };
    for (const [key, list] of Object.entries(map)) {
      if (key && Array.isArray(list)) {
        const lowerKey = key.toLowerCase();
        enriched[lowerKey] = list;
        
        // Strip dr_ or dr. prefixes for alias keying
        const cleanKey = lowerKey.replace(/^(dr|doctor)[_.\s]?/i, '');
        if (cleanKey) {
          enriched[cleanKey] = list;
          enriched[`dr_${cleanKey}`] = list;
          enriched[`dr.${cleanKey}`] = list;
          enriched[`doctor_${cleanKey}`] = list;
        }

        // Handle email usernames like sarah.smith@medisphere.com
        if (lowerKey.includes('@')) {
          const prefix = lowerKey.split('@')[0];
          enriched[prefix] = list;
          enriched[`dr_${prefix}`] = list;
        }
      }
    }
    localStorage.setItem('medisphere_doctor_assignments', JSON.stringify(enriched));
  } catch {}
}

export function getPatientProfileById(patientId: string) {
  const allMaster = getAllPatientsMaster();
  const found = allMaster.find(p => p.patientId.toLowerCase() === (patientId || '').toLowerCase());
  
  if (found) {
    const parts = found.patientName.split(' ');
    const firstName = parts[0] || found.patientId;
    const lastName = parts.slice(1).join(' ') || '';
    const birthYear = new Date().getFullYear() - (found.age || 40);
    return {
      id: found.patientId,
      firstName,
      lastName,
      email: `${found.patientId}@medisphere.io`,
      phoneNumber: '+1-555-0199',
      dateOfBirth: `${birthYear}-05-15`,
      gender: found.gender || 'Male',
      address: '742 Evergreen Terrace, Medical District',
      emergencyContactName: 'Emergency Contact',
      emergencyContactPhone: '+1-555-0198',
      insuranceProvider: 'Aetna Global Health',
      insurancePolicyNumber: `POL-${found.patientId.toUpperCase()}-99`,
      medicalHistory: [found.primaryCondition]
    };
  }
  
  const clean = patientId || 'john_doe';
  const parts = clean.split('_');
  return {
    id: clean,
    firstName: (parts[0] || 'John').toUpperCase(),
    lastName: (parts[1] || 'Doe').toUpperCase(),
    email: `${clean}@medisphere.io`,
    phoneNumber: '+1-555-0199',
    dateOfBirth: '1985-05-15',
    gender: 'Male',
    address: '123 Health Way, Seattle WA',
    emergencyContactName: 'Emergency Contact',
    emergencyContactPhone: '+1-555-0198',
    insuranceProvider: 'Aetna Health',
    insurancePolicyNumber: `AE-${clean.toUpperCase()}`,
    medicalHistory: ['Routine Cardiology Monitoring']
  };
}

export function getMasterPatientsAsList() {
  return getAllPatientsMaster().map(p => {
    const parts = p.patientName.split(' ');
    const firstName = parts[0] || p.patientId;
    const lastName = parts.slice(1).join(' ') || '';
    const birthYear = new Date().getFullYear() - (p.age || 40);
    return {
      id: p.patientId,
      firstName,
      lastName,
      email: `${p.patientId}@medisphere.io`,
      phoneNumber: '+1-555-0199',
      dateOfBirth: `${birthYear}-05-15`,
      gender: p.gender || 'Male',
      address: '742 Evergreen Terrace, Medical District',
      emergencyContactName: 'Emergency Contact',
      emergencyContactPhone: '+1-555-0198',
      insuranceProvider: 'Aetna Global Health',
      insurancePolicyNumber: `POL-${p.patientId.toUpperCase()}-99`,
      medicalHistory: [p.primaryCondition]
    };
  });
}

export function getAssignedPatientIdsForUser(user: { username?: string; roles?: string[] } | null): string[] {
  const allPatients = getAllPatientsMaster();
  const allIds = allPatients.map(p => p.patientId);

  if (!user) return allIds;

  const roles = user.roles || [];
  const isAdmin = roles.some(r => r.toUpperCase().includes('ADMIN'));
  if (isAdmin) {
    return allIds;
  }

  const isPatient = roles.some(r => r.toUpperCase().includes('PATIENT'));
  if (isPatient) {
    const cleanUser = (user.username || 'john_doe').toLowerCase();
    const match = allPatients.find(p => p.patientId.toLowerCase() === cleanUser);
    return match ? [match.patientId] : [allIds[0] || 'john_doe'];
  }

  // Doctor role: Strictly return ONLY the patient IDs assigned to this doctor in the admin map
  const rawUsername = (user.username || '').toLowerCase();
  if (!rawUsername) return [];

  const map = getDoctorAssignmentsMap();

  // 1. Direct match
  if (map[rawUsername] && Array.isArray(map[rawUsername])) {
    return map[rawUsername];
  }

  // 2. Prefix/clean username match (e.g. 'dr_smith' -> 'smith')
  const cleanUsername = rawUsername.replace(/^(dr|doctor)[_.\s]?/i, '');
  if (cleanUsername && map[cleanUsername] && Array.isArray(map[cleanUsername])) {
    return map[cleanUsername];
  }
  if (cleanUsername && map[`dr_${cleanUsername}`] && Array.isArray(map[`dr_${cleanUsername}`])) {
    return map[`dr_${cleanUsername}`];
  }

  // 3. Loop match
  for (const [key, list] of Object.entries(map)) {
    const cleanKey = key.toLowerCase().replace(/^(dr|doctor)[_.\s]?/i, '');
    if ((cleanKey === cleanUsername || key.toLowerCase() === rawUsername || key.toLowerCase().includes(rawUsername) || rawUsername.includes(key.toLowerCase())) && Array.isArray(list)) {
      return list;
    }
  }

  return [];
}

export function getAssignedPatientsForUser(user: { username?: string; roles?: string[] } | null): MasterPatientData[] {
  const ids = getAssignedPatientIdsForUser(user);
  const allPatients = getAllPatientsMaster();
  return allPatients.filter(p => ids.includes(p.patientId));
}

