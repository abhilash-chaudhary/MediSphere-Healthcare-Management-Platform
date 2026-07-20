// Central TypeScript type definitions for MediSphere

export interface User {
  username: string;
  email?: string;
  roles: string[];
  iat?: number;
  exp?: number;
}

export interface Patient {
  _id?: string;
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  medicalHistory: string[];
  insuranceProvider: string;
  insurancePolicyNumber: string;
  bloodGroup?: string;
  photoUrl?: string;
}

export interface Vital {
  _id?: string;
  patientId: string;
  heartRate: number;
  bloodPressure: string;
  temperature: number;
  oxygenLevel: number;
  caloriesBurned?: number;
  sleepMinutes?: number;
  steps?: number;
  stress?: number;
  ecg?: number[];
  recordedAt: string;
}

export interface DigitalTwin {
  _id?: string;
  patientId: string;
  completenessScore: number;
  vitalsHistory: Vital[];
  activeMedications: string[];
  activeConditions: string[];
  riskCategory: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN';
  lastRebuilt: string;
}

export interface Consent {
  _id?: string;
  patientId: string;
  doctorId: string;
  status: 'GRANTED' | 'REVOKED' | 'EXPIRED';
  grantedAt: string;
  expiresAt: string;
  authorizedResourceTypes: string[];
}

export interface Provider {
  _id?: string;
  id?: string;
  name: string;
  type: string;
  specialty: string;
  department: string;
  schedule: string[];
  location: string;
  email: string;
  phone: string;
}

export interface AuditLog {
  _id?: string;
  id?: string;
  username: string;
  action: string;
  resource: string;
  timestamp: string;
  ipAddress: string;
  details: string;
}

export interface WearableDevice {
  _id?: string;
  patientId: string;
  deviceId: string;
  deviceName: string;
  deviceType: string;
  status: string;
  lastSyncedAt: string;
}

export interface Notification {
  _id?: string;
  patientId: string;
  message: string;
  type: string;
  status: string;
  createdAt: string;
}

export interface LabReport {
  test: string;
  value: string;
  range: string;
  status: string;
  unit: string;
  date: string;
  trend: 'rising' | 'falling' | 'stable';
}

export interface Appointment {
  _id?: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  type: string;
  status: string;
  notes: string;
  location: string;
  createdAt?: string;
}

export interface SystemHealth {
  status: string;
  timestamp: string;
  services: {
    apiGateway: ServiceStatus;
    mongodb: ServiceStatus;
    kafka: ServiceStatus;
    fhirServer: ServiceStatus;
    oauth2: ServiceStatus;
  };
  metrics: {
    totalPatients: number;
    activeConsents: number;
    auditTrailSize: number;
    liveDevices: number;
    cpuUsage: string;
    memoryUsage: string;
    uptime: string;
    requestsPerMinute: number;
  };
}

export interface ServiceStatus {
  status: 'UP' | 'DOWN' | 'DEGRADED';
  responseTime: string;
  [key: string]: any;
}

export interface Dashboard360 {
  patientId: string;
  patientProfile: Patient | null;
  digitalTwin: DigitalTwin | null;
  consentCheckResult: boolean;
  healthRiskLevel: string;
  alertStatusSummary: string;
  appointments: Appointment[] | null;
  labReports: LabReport[] | null;
  activePrescriptions: any[] | null;
  medicalTimeline: any[] | null;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
}

export interface SparklinePoint {
  value: number;
}
