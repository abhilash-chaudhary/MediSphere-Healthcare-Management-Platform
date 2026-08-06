/**
 * MediSphere Alert Routing Configuration
 * Maps alert types to specialist roles and notification queues.
 * Designed to be externally configurable without touching rule logic.
 *
 * Milestone 3 — Continuous Monitoring & Alerts
 */

'use strict';

/**
 * Routing table — maps alert type → routing config.
 * Add new entries here to extend routing without modifying rule engine.
 */
const ALERT_ROUTING_TABLE = {
  CARDIAC: {
    primaryRole: 'DOCTOR',
    specialistQueue: 'Cardiologist',
    notifyPatient: false,
    escalateAfterMinutes: 5,
    emailSubject: '[CARDIAC ALERT] MediSphere — Immediate Review Required',
    smsSuffix: 'Cardiac anomaly detected.',
    priority: 1, // 1 = highest
  },
  RESPIRATORY: {
    primaryRole: 'DOCTOR',
    specialistQueue: 'Pulmonologist',
    notifyPatient: true,
    escalateAfterMinutes: 3,
    emailSubject: '[RESPIRATORY ALERT] MediSphere — Oxygen Status Critical',
    smsSuffix: 'Oxygen saturation anomaly.',
    priority: 1,
  },
  HYPERTENSION: {
    primaryRole: 'DOCTOR',
    specialistQueue: 'Cardiologist',
    notifyPatient: false,
    escalateAfterMinutes: 10,
    emailSubject: '[HYPERTENSION ALERT] MediSphere — BP Crisis Detected',
    smsSuffix: 'Blood pressure emergency.',
    priority: 2,
  },
  METABOLIC: {
    primaryRole: 'DOCTOR',
    specialistQueue: 'Endocrinologist',
    notifyPatient: false,
    escalateAfterMinutes: 15,
    emailSubject: '[METABOLIC ALERT] MediSphere — Temperature Anomaly',
    smsSuffix: 'Metabolic anomaly detected.',
    priority: 3,
  },
  CRITICAL: {
    // Severity override — CRITICAL alerts go to ALL: doctor + patient
    primaryRole: 'ALL',
    specialistQueue: 'On-Call Physician',
    notifyPatient: true,
    escalateAfterMinutes: 2,
    emailSubject: '[CRITICAL ALERT] MediSphere — Emergency Patient Status',
    smsSuffix: 'CRITICAL health emergency.',
    priority: 0, // highest override
  },
};

/**
 * Get routing config for a given alert type + severity.
 * CRITICAL severity overrides type-level routing to notify ALL.
 *
 * @param {string} type      Alert type (e.g. 'CARDIAC', 'RESPIRATORY')
 * @param {string} severity  Alert severity (e.g. 'CRITICAL', 'HIGH')
 * @returns {Object} routing config
 */
function getRoutingConfig(type, severity) {
  if (severity === 'CRITICAL') {
    return ALERT_ROUTING_TABLE.CRITICAL;
  }
  return ALERT_ROUTING_TABLE[type] || {
    primaryRole: 'DOCTOR',
    specialistQueue: 'General Physician',
    notifyPatient: false,
    escalateAfterMinutes: 20,
    emailSubject: '[HEALTH ALERT] MediSphere — Patient Alert',
    smsSuffix: 'Health alert detected.',
    priority: 5,
  };
}

/**
 * Determine who should receive a notification for a given alert.
 * Returns an array of target descriptors.
 *
 * @param {string} type
 * @param {string} severity
 * @param {string} patientId
 * @param {string[]} doctorUsernames  List of doctors assigned to this patient
 * @returns {Array<{ targetUserId, targetRole, channel: 'IN_APP'|'EMAIL'|'SMS' }>}
 */
function resolveNotificationTargets(type, severity, patientId, doctorUsernames = []) {
  const config = getRoutingConfig(type, severity);
  const targets = [];

  // Always notify assigned doctors via in-app
  for (const doctorId of doctorUsernames) {
    targets.push({ targetUserId: doctorId, targetRole: 'DOCTOR', channel: 'IN_APP' });
    targets.push({ targetUserId: doctorId, targetRole: 'DOCTOR', channel: 'EMAIL' });
  }

  // If config says notify patient too (for CRITICAL/RESPIRATORY)
  if (config.notifyPatient && patientId) {
    targets.push({ targetUserId: patientId, targetRole: 'PATIENT', channel: 'IN_APP' });
  }

  return targets;
}

module.exports = {
  ALERT_ROUTING_TABLE,
  getRoutingConfig,
  resolveNotificationTargets,
};
