import { createSlice, PayloadAction } from '@reduxjs/toolkit';

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
  emergencyContactPhone: String;
  medicalHistory: string[];
  insuranceProvider: string;
  insurancePolicyNumber: string;
}

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

interface AuditLog {
  id: string;
  username: string;
  action: string;
  resource: string;
  timestamp: string;
  ipAddress: string;
  details: string;
}

interface DQLRecord {
  id: string;
  rawPayload: string;
  reason: string;
  timestamp: string;
}

interface PatientState {
  patientsList: Patient[];
  selectedPatientId: string;
  dashboard360: any | null;
  consentGranted: boolean;
  fhirTab: 'patient' | 'observation' | 'medication';
  fhirJson: string;
  fhirLoading: boolean;
  rebuildTwinLoading: boolean;
  syncFhirLoading: boolean;
  providers: Provider[];
  auditLogs: AuditLog[];
  dlqLogs: DQLRecord[];
  patientProfile: Patient | null;
}

const initialState: PatientState = {
  patientsList: [],
  selectedPatientId: '',
  dashboard360: null,
  consentGranted: false,
  fhirTab: 'patient',
  fhirJson: '',
  fhirLoading: false,
  rebuildTwinLoading: false,
  syncFhirLoading: false,
  providers: [],
  auditLogs: [],
  dlqLogs: [],
  patientProfile: null,
};

const patientSlice = createSlice({
  name: 'patient',
  initialState,
  reducers: {
    setPatientsList(state, action: PayloadAction<Patient[]>) {
      state.patientsList = action.payload;
    },
    setSelectedPatientId(state, action: PayloadAction<String>) {
      state.selectedPatientId = action.payload.toString();
    },
    setDashboard360(state, action: PayloadAction<any>) {
      state.dashboard360 = action.payload;
    },
    setConsentGranted(state, action: PayloadAction<boolean>) {
      state.consentGranted = action.payload;
    },
    setFhirTab(state, action: PayloadAction<'patient' | 'observation' | 'medication'>) {
      state.fhirTab = action.payload;
    },
    setFhirJson(state, action: PayloadAction<string>) {
      state.fhirJson = action.payload;
    },
    setFhirLoading(state, action: PayloadAction<boolean>) {
      state.fhirLoading = action.payload;
    },
    setRebuildTwinLoading(state, action: PayloadAction<boolean>) {
      state.rebuildTwinLoading = action.payload;
    },
    setSyncFhirLoading(state, action: PayloadAction<boolean>) {
      state.syncFhirLoading = action.payload;
    },
    setProviders(state, action: PayloadAction<Provider[]>) {
      state.providers = action.payload;
    },
    setAuditLogs(state, action: PayloadAction<AuditLog[]>) {
      state.auditLogs = action.payload;
    },
    setDlqLogs(state, action: PayloadAction<DQLRecord[]>) {
      state.dlqLogs = action.payload;
    },
    setPatientProfile(state, action: PayloadAction<Patient | null>) {
      state.patientProfile = action.payload;
    },
  },
});

export const {
  setPatientsList,
  setSelectedPatientId,
  setDashboard360,
  setConsentGranted,
  setFhirTab,
  setFhirJson,
  setFhirLoading,
  setRebuildTwinLoading,
  setSyncFhirLoading,
  setProviders,
  setAuditLogs,
  setDlqLogs,
  setPatientProfile,
} = patientSlice.actions;

export default patientSlice.reducer;
