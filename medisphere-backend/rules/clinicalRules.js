/**
 * MediSphere Clinical Rule Engine
 * Strategy pattern: each rule is a self-contained object with evaluate() method.
 * Rules are composable, configurable, and not hardcoded as if-chains.
 *
 * Milestone 3 — Continuous Monitoring & Alerts
 */

'use strict';

// ─────────────────────────────────────────────────────────
// Rule severity constants
// ─────────────────────────────────────────────────────────
const SEVERITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
};

// ─────────────────────────────────────────────────────────
// Base Rule class (Strategy interface)
// ─────────────────────────────────────────────────────────
class ClinicalRule {
  constructor({ id, name, description, severity, type }) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.severity = severity;
    this.type = type; // e.g. 'CARDIAC', 'RESPIRATORY', 'METABOLIC', 'HYPERTENSION'
  }

  /**
   * Evaluate rule against vitals + patient context.
   * @param {Object} vitals  { heartRate, spo2, temperature, systolic, diastolic, respiratoryRate }
   * @param {Object} patient { age, conditions[] }
   * @returns {{ triggered: boolean, message: string, details: Object }}
   */
  evaluate(vitals, patient = {}) {
    throw new Error(`Rule "${this.name}" must implement evaluate()`);
  }
}

// ─────────────────────────────────────────────────────────
// Concrete Rule Implementations
// ─────────────────────────────────────────────────────────

class PossibleAFibRule extends ClinicalRule {
  constructor() {
    super({
      id: 'RULE_001',
      name: 'Possible Atrial Fibrillation',
      description: 'HR > 140 AND patient age > 50',
      severity: SEVERITY.CRITICAL,
      type: 'CARDIAC',
    });
    this.hrThreshold = 140;
    this.ageThreshold = 50;
  }

  evaluate(vitals, patient = {}) {
    const { heartRate } = vitals;
    const age = patient.age || 0;
    const triggered = heartRate > this.hrThreshold && age > this.ageThreshold;
    return {
      triggered,
      message: triggered
        ? `Possible AFib: Heart rate ${heartRate} bpm in patient aged ${age}. Immediate cardiology review required.`
        : null,
      details: { heartRate, age, hrThreshold: this.hrThreshold, ageThreshold: this.ageThreshold },
    };
  }
}

class OxygenAlertRule extends ClinicalRule {
  constructor() {
    super({
      id: 'RULE_002',
      name: 'Oxygen Saturation Alert',
      description: 'SpO2 < 90%',
      severity: SEVERITY.CRITICAL,
      type: 'RESPIRATORY',
    });
    this.spo2CriticalThreshold = 90;
    this.spo2WarningThreshold = 94;
  }

  evaluate(vitals, patient = {}) {
    const { spo2 } = vitals;
    if (spo2 < this.spo2CriticalThreshold) {
      return {
        triggered: true,
        message: `Critical Oxygen Alert: SpO2 at ${spo2}% — hypoxia risk. Immediate oxygen therapy required.`,
        details: { spo2, threshold: this.spo2CriticalThreshold },
      };
    }
    if (spo2 < this.spo2WarningThreshold) {
      return {
        triggered: true,
        message: `Low SpO2 Warning: Oxygen saturation at ${spo2}% — below normal range.`,
        details: { spo2, threshold: this.spo2WarningThreshold },
        overrideSeverity: SEVERITY.HIGH,
      };
    }
    return { triggered: false, message: null, details: { spo2 } };
  }
}

class HypertensionCrisisRule extends ClinicalRule {
  constructor() {
    super({
      id: 'RULE_003',
      name: 'Hypertension Crisis',
      description: 'Systolic BP > 180 mmHg',
      severity: SEVERITY.CRITICAL,
      type: 'HYPERTENSION',
    });
    this.systolicCritical = 180;
    this.systolicHigh = 160;
  }

  evaluate(vitals, patient = {}) {
    const { systolic } = vitals;
    if (!systolic) return { triggered: false, message: null, details: {} };

    if (systolic > this.systolicCritical) {
      return {
        triggered: true,
        message: `Hypertension Crisis: Systolic BP at ${systolic} mmHg — hypertensive emergency. Immediate intervention required.`,
        details: { systolic, threshold: this.systolicCritical },
      };
    }
    if (systolic > this.systolicHigh) {
      return {
        triggered: true,
        message: `Stage 2 Hypertension: Systolic BP at ${systolic} mmHg — elevated risk.`,
        details: { systolic, threshold: this.systolicHigh },
        overrideSeverity: SEVERITY.HIGH,
      };
    }
    return { triggered: false, message: null, details: { systolic } };
  }
}

class TachycardiaRule extends ClinicalRule {
  constructor() {
    super({
      id: 'RULE_004',
      name: 'Severe Tachycardia',
      description: 'HR > 130 bpm',
      severity: SEVERITY.HIGH,
      type: 'CARDIAC',
    });
    this.hrCritical = 130;
    this.hrHigh = 110;
  }

  evaluate(vitals, patient = {}) {
    const { heartRate } = vitals;
    if (heartRate > this.hrCritical) {
      return {
        triggered: true,
        message: `Severe Tachycardia: Heart rate at ${heartRate} bpm — critical threshold exceeded.`,
        details: { heartRate, threshold: this.hrCritical },
      };
    }
    if (heartRate > this.hrHigh) {
      return {
        triggered: true,
        message: `Elevated Heart Rate: ${heartRate} bpm — monitor closely.`,
        details: { heartRate, threshold: this.hrHigh },
        overrideSeverity: SEVERITY.MEDIUM,
      };
    }
    return { triggered: false, message: null, details: { heartRate } };
  }
}

class BradycardiaRule extends ClinicalRule {
  constructor() {
    super({
      id: 'RULE_005',
      name: 'Bradycardia',
      description: 'HR < 50 bpm',
      severity: SEVERITY.HIGH,
      type: 'CARDIAC',
    });
    this.hrLow = 50;
    this.hrWarning = 60;
  }

  evaluate(vitals, patient = {}) {
    const { heartRate } = vitals;
    if (heartRate < this.hrLow) {
      return {
        triggered: true,
        message: `Bradycardia: Heart rate critically low at ${heartRate} bpm.`,
        details: { heartRate, threshold: this.hrLow },
      };
    }
    return { triggered: false, message: null, details: { heartRate } };
  }
}

class HypertemiaRule extends ClinicalRule {
  constructor() {
    super({
      id: 'RULE_006',
      name: 'High Fever / Hyperthermia',
      description: 'Temperature > 39°C',
      severity: SEVERITY.HIGH,
      type: 'METABOLIC',
    });
    this.tempCritical = 39.0;
    this.tempHigh = 37.5;
  }

  evaluate(vitals, patient = {}) {
    const { temperature } = vitals;
    if (temperature > this.tempCritical) {
      return {
        triggered: true,
        message: `Hyperthermia: Temperature at ${temperature}°C — fever requiring immediate assessment.`,
        details: { temperature, threshold: this.tempCritical },
      };
    }
    if (temperature > this.tempHigh) {
      return {
        triggered: true,
        message: `Elevated Temperature: ${temperature}°C — above normal range.`,
        details: { temperature, threshold: this.tempHigh },
        overrideSeverity: SEVERITY.MEDIUM,
      };
    }
    return { triggered: false, message: null, details: { temperature } };
  }
}

class RapidRespirationRule extends ClinicalRule {
  constructor() {
    super({
      id: 'RULE_007',
      name: 'Tachypnea',
      description: 'Respiratory rate > 25 breaths/min',
      severity: SEVERITY.MEDIUM,
      type: 'RESPIRATORY',
    });
    this.rrHigh = 25;
    this.rrCritical = 30;
  }

  evaluate(vitals, patient = {}) {
    const { respiratoryRate } = vitals;
    if (!respiratoryRate) return { triggered: false, message: null, details: {} };
    if (respiratoryRate > this.rrCritical) {
      return {
        triggered: true,
        message: `Severe Tachypnea: Respiratory rate at ${respiratoryRate} breaths/min.`,
        details: { respiratoryRate, threshold: this.rrCritical },
        overrideSeverity: SEVERITY.HIGH,
      };
    }
    if (respiratoryRate > this.rrHigh) {
      return {
        triggered: true,
        message: `Elevated Respiratory Rate: ${respiratoryRate} breaths/min.`,
        details: { respiratoryRate, threshold: this.rrHigh },
      };
    }
    return { triggered: false, message: null, details: { respiratoryRate } };
  }
}

// ─────────────────────────────────────────────────────────
// AI Risk Classification (fast-path rule-based)
// ─────────────────────────────────────────────────────────

/**
 * Determine overall AI risk level from vitals.
 * This is the "fast path" before calling the Python FastAPI service.
 * @param {Object} vitals
 * @returns {{ risk: 'Low'|'Medium'|'High', confidence: number, factors: string[] }}
 */
function classifyRisk(vitals) {
  const { heartRate, spo2, temperature, systolic } = vitals;
  let score = 0;
  const factors = [];

  // Heart Rate scoring
  if (heartRate > 140) { score += 40; factors.push('Severe tachycardia'); }
  else if (heartRate > 120) { score += 25; factors.push('Tachycardia'); }
  else if (heartRate > 100) { score += 10; factors.push('Elevated HR'); }
  else if (heartRate < 50) { score += 35; factors.push('Bradycardia'); }
  else if (heartRate < 60) { score += 10; factors.push('Low HR'); }

  // SpO2 scoring
  if (spo2 < 88) { score += 45; factors.push('Severe hypoxia'); }
  else if (spo2 < 90) { score += 35; factors.push('Critical SpO2'); }
  else if (spo2 < 94) { score += 15; factors.push('Low SpO2'); }

  // Temperature scoring
  if (temperature > 39.5) { score += 20; factors.push('High fever'); }
  else if (temperature > 39) { score += 12; factors.push('Fever'); }
  else if (temperature > 37.5) { score += 5; factors.push('Elevated temp'); }

  // Blood pressure scoring
  if (systolic && systolic > 180) { score += 35; factors.push('Hypertensive crisis'); }
  else if (systolic && systolic > 160) { score += 20; factors.push('Stage 2 hypertension'); }
  else if (systolic && systolic > 140) { score += 8; factors.push('Elevated BP'); }

  const normalizedScore = Math.min(score, 100);
  let risk;
  let confidence;

  if (normalizedScore >= 50) {
    risk = 'High';
    confidence = Math.min(85 + (normalizedScore - 50) * 0.3, 99);
  } else if (normalizedScore >= 20) {
    risk = 'Medium';
    confidence = 70 + normalizedScore * 0.5;
  } else {
    risk = 'Low';
    confidence = 90 - normalizedScore;
  }

  return {
    risk,
    confidence: parseFloat(confidence.toFixed(1)),
    score: normalizedScore,
    factors,
  };
}

// ─────────────────────────────────────────────────────────
// Rule Engine Evaluator
// ─────────────────────────────────────────────────────────

const ACTIVE_RULES = [
  new PossibleAFibRule(),
  new OxygenAlertRule(),
  new HypertensionCrisisRule(),
  new TachycardiaRule(),
  new BradycardiaRule(),
  new HypertemiaRule(),
  new RapidRespirationRule(),
];

/**
 * Evaluate all active rules against a vitals reading.
 * @param {Object} vitals  { heartRate, spo2, temperature, systolic, diastolic, respiratoryRate }
 * @param {Object} patient { age, conditions[] }
 * @returns {Object[]} triggered alert objects
 */
function evaluateRules(vitals, patient = {}) {
  const triggeredAlerts = [];

  for (const rule of ACTIVE_RULES) {
    try {
      const result = rule.evaluate(vitals, patient);
      if (result.triggered) {
        triggeredAlerts.push({
          ruleId: rule.id,
          ruleName: rule.name,
          severity: result.overrideSeverity || rule.severity,
          type: rule.type,
          message: result.message,
          details: result.details,
        });
      }
    } catch (err) {
      console.error(`[RuleEngine] Error in rule "${rule.name}":`, err.message);
    }
  }

  return triggeredAlerts;
}

/**
 * Parse blood pressure string "120/80" → { systolic: 120, diastolic: 80 }
 */
function parseBP(bpString) {
  if (!bpString || typeof bpString !== 'string') return { systolic: null, diastolic: null };
  const parts = bpString.split('/');
  return {
    systolic: parseInt(parts[0]) || null,
    diastolic: parseInt(parts[1]) || null,
  };
}

module.exports = {
  evaluateRules,
  classifyRisk,
  parseBP,
  SEVERITY,
  ACTIVE_RULES,
};
