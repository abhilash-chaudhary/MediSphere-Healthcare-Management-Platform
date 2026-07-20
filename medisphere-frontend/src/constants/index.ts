// Application-wide constants
export const APP_CONFIG = {
  appName: 'MediSphere',
  tagline: 'Enterprise Healthcare Platform',
  version: '1.0.0',
  apiBaseUrl: 'http://localhost:8080',
  fhirVersion: 'R4',
  supportEmail: 'support@medisphere.com'
};

export const ROUTES = {
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  FORGOT_PASSWORD: '/auth/forgot-password',
  VERIFY_OTP: '/auth/verify-otp',
  DASHBOARD: '/',
  PATIENT_SEARCH: '/patients',
  PATIENT_360: '/patients/:id',
  PATIENT_PROFILE: '/profile',
  CONSENT: '/consent',
  WEARABLES: '/wearables',
  LIVE_VITALS: '/live-vitals',
  ANALYTICS: '/analytics',
  PROVIDERS: '/providers',
  AUDIT_LOGS: '/admin/audit',
  SYSTEM_HEALTH: '/admin/health',
  SETTINGS: '/settings'
};

export const VITAL_THRESHOLDS = {
  heartRate: { low: 50, highNormal: 100, critical: 120 },
  oxygenLevel: { criticalLow: 90, low: 95, normal: 98 },
  temperature: { low: 36.0, highNormal: 37.5, critical: 38.5 },
  systolic: { low: 90, highNormal: 120, critical: 140 },
  diastolic: { low: 60, highNormal: 80, critical: 90 }
};

export const RISK_COLORS = {
  LOW: '#10b981',
  MEDIUM: '#f59e0b',
  HIGH: '#ef4444',
  UNKNOWN: '#64748b',
  CRITICAL: '#dc2626'
};

export const ORGAN_COLORS = {
  normal: '#10b981',
  warning: '#f59e0b',
  alert: '#f97316',
  critical: '#ef4444'
};

export const KAFKA_TOPICS = {
  VITALS_STREAM: 'vitals-stream',
  AUDIT_EVENTS: 'audit-events',
  NOTIFICATIONS: 'notifications',
  FHIR_SYNC: 'fhir-sync-events'
};

export const FHIR_RESOURCE_TYPES = ['Patient', 'Observation', 'MedicationRequest', 'Condition', 'DiagnosticReport'];

export const NOTIFICATION_TYPES = {
  CRITICAL: 'CRITICAL',
  WARNING: 'WARNING',
  INFO: 'INFO',
  SUCCESS: 'SUCCESS'
};
