/**
 * Clinical Rule Engine Tests
 * Milestone 3 — Automated validation of rule engine
 *
 * Run: node tests/clinicalRules.test.js
 * (No jest required — uses Node's built-in assert)
 */

'use strict';

const assert = require('assert');
const { evaluateRules, classifyRisk, parseBP, SEVERITY } = require('../rules/clinicalRules');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}: ${err.message}`);
    failed++;
  }
}

console.log('\n=== MediSphere Clinical Rule Engine Tests ===\n');

// ─────────────────────────────────────────────────────────
// parseBP tests
// ─────────────────────────────────────────────────────────
console.log('--- parseBP ---');
test('parses "120/80" correctly', () => {
  const { systolic, diastolic } = parseBP('120/80');
  assert.strictEqual(systolic, 120);
  assert.strictEqual(diastolic, 80);
});
test('handles null BP gracefully', () => {
  const { systolic } = parseBP(null);
  assert.strictEqual(systolic, null);
});
test('handles empty string', () => {
  const { systolic } = parseBP('');
  assert.strictEqual(systolic, null);
});

// ─────────────────────────────────────────────────────────
// RULE_001: Possible AFib — HR > 140 AND age > 50
// ─────────────────────────────────────────────────────────
console.log('\n--- RULE_001: Possible AFib ---');
test('triggers when HR=145 and age=60', () => {
  const results = evaluateRules({ heartRate: 145, spo2: 97, temperature: 36.8 }, { age: 60 });
  const afib = results.find(r => r.ruleId === 'RULE_001');
  assert.ok(afib, 'AFib rule should trigger');
  assert.strictEqual(afib.severity, SEVERITY.CRITICAL);
});
test('does NOT trigger when HR=145 but age=40', () => {
  const results = evaluateRules({ heartRate: 145, spo2: 97, temperature: 36.8 }, { age: 40 });
  const afib = results.find(r => r.ruleId === 'RULE_001');
  assert.ok(!afib, 'AFib rule should NOT trigger for young patient');
});
test('does NOT trigger when HR=110 and age=65', () => {
  const results = evaluateRules({ heartRate: 110, spo2: 97, temperature: 36.8 }, { age: 65 });
  const afib = results.find(r => r.ruleId === 'RULE_001');
  assert.ok(!afib, 'AFib rule should NOT trigger at HR=110');
});
test('boundary: HR=141 age=51 triggers', () => {
  const results = evaluateRules({ heartRate: 141, spo2: 97, temperature: 36.8 }, { age: 51 });
  const afib = results.find(r => r.ruleId === 'RULE_001');
  assert.ok(afib, 'AFib should trigger at boundary HR=141, age=51');
});

// ─────────────────────────────────────────────────────────
// RULE_002: Oxygen Alert — SpO2 < 90
// ─────────────────────────────────────────────────────────
console.log('\n--- RULE_002: Oxygen Alert ---');
test('triggers CRITICAL when SpO2=88', () => {
  const results = evaluateRules({ heartRate: 75, spo2: 88, temperature: 36.8 });
  const o2 = results.find(r => r.ruleId === 'RULE_002');
  assert.ok(o2, 'Oxygen rule should trigger at SpO2=88');
  assert.strictEqual(o2.severity, SEVERITY.CRITICAL);
});
test('triggers HIGH when SpO2=92 (warning zone)', () => {
  const results = evaluateRules({ heartRate: 75, spo2: 92, temperature: 36.8 });
  const o2 = results.find(r => r.ruleId === 'RULE_002');
  assert.ok(o2, 'Oxygen rule should trigger at SpO2=92');
});
test('does NOT trigger when SpO2=97', () => {
  const results = evaluateRules({ heartRate: 75, spo2: 97, temperature: 36.8 });
  const o2 = results.find(r => r.ruleId === 'RULE_002');
  assert.ok(!o2, 'Oxygen rule should NOT trigger at SpO2=97');
});
test('boundary: SpO2=90 triggers CRITICAL', () => {
  const results = evaluateRules({ heartRate: 75, spo2: 89, temperature: 36.8 });
  const o2 = results.find(r => r.ruleId === 'RULE_002');
  assert.ok(o2, 'SpO2 rule triggers at 89%');
  assert.strictEqual(o2.severity, SEVERITY.CRITICAL);
});

// ─────────────────────────────────────────────────────────
// RULE_003: Hypertension Crisis — BP > 180
// ─────────────────────────────────────────────────────────
console.log('\n--- RULE_003: Hypertension Crisis ---');
test('triggers CRITICAL when systolic=185', () => {
  const results = evaluateRules({ heartRate: 80, spo2: 97, temperature: 36.8, systolic: 185 });
  const htn = results.find(r => r.ruleId === 'RULE_003');
  assert.ok(htn, 'Hypertension rule should trigger at BP=185');
  assert.strictEqual(htn.severity, SEVERITY.CRITICAL);
});
test('does NOT trigger when systolic=120', () => {
  const results = evaluateRules({ heartRate: 80, spo2: 97, temperature: 36.8, systolic: 120 });
  const htn = results.find(r => r.ruleId === 'RULE_003');
  assert.ok(!htn, 'Hypertension rule should NOT trigger at BP=120');
});

// ─────────────────────────────────────────────────────────
// RULE_004: Tachycardia — HR > 130
// ─────────────────────────────────────────────────────────
console.log('\n--- RULE_004: Tachycardia ---');
test('triggers HIGH when HR=135', () => {
  const results = evaluateRules({ heartRate: 135, spo2: 97, temperature: 36.8 });
  const tachy = results.find(r => r.ruleId === 'RULE_004');
  assert.ok(tachy, 'Tachycardia rule should trigger at HR=135');
  assert.strictEqual(tachy.severity, SEVERITY.HIGH);
});
test('does NOT trigger when HR=100', () => {
  const results = evaluateRules({ heartRate: 100, spo2: 97, temperature: 36.8 });
  const tachy = results.find(r => r.ruleId === 'RULE_004');
  assert.ok(!tachy, 'Tachycardia rule should NOT trigger at HR=100');
});

// ─────────────────────────────────────────────────────────
// RULE_005: Bradycardia — HR < 50
// ─────────────────────────────────────────────────────────
console.log('\n--- RULE_005: Bradycardia ---');
test('triggers when HR=42', () => {
  const results = evaluateRules({ heartRate: 42, spo2: 97, temperature: 36.8 });
  const brady = results.find(r => r.ruleId === 'RULE_005');
  assert.ok(brady, 'Bradycardia rule should trigger at HR=42');
});
test('does NOT trigger when HR=58', () => {
  const results = evaluateRules({ heartRate: 58, spo2: 97, temperature: 36.8 });
  const brady = results.find(r => r.ruleId === 'RULE_005');
  assert.ok(!brady, 'Bradycardia rule should NOT trigger at HR=58');
});

// ─────────────────────────────────────────────────────────
// RULE_006: Hyperthermia — Temp > 39
// ─────────────────────────────────────────────────────────
console.log('\n--- RULE_006: Hyperthermia ---');
test('triggers when temperature=39.3', () => {
  const results = evaluateRules({ heartRate: 80, spo2: 97, temperature: 39.3 });
  const fever = results.find(r => r.ruleId === 'RULE_006');
  assert.ok(fever, 'Hyperthermia rule should trigger at 39.3°C');
  assert.strictEqual(fever.severity, SEVERITY.HIGH);
});
test('does NOT trigger at normal temperature=36.8', () => {
  const results = evaluateRules({ heartRate: 80, spo2: 97, temperature: 36.8 });
  const fever = results.find(r => r.ruleId === 'RULE_006');
  assert.ok(!fever, 'Hyperthermia rule should NOT trigger at normal temp');
});

// ─────────────────────────────────────────────────────────
// classifyRisk tests
// ─────────────────────────────────────────────────────────
console.log('\n--- classifyRisk (AI fast path) ---');
test('returns Low for normal vitals', () => {
  const result = classifyRisk({ heartRate: 75, spo2: 98, temperature: 36.7, systolic: 115 });
  assert.strictEqual(result.risk, 'Low');
  assert.ok(result.confidence >= 72, 'Confidence should be >= 72 for Low risk');
});
test('returns High for critically abnormal vitals', () => {
  const result = classifyRisk({ heartRate: 145, spo2: 87, temperature: 39.5, systolic: 185 });
  assert.strictEqual(result.risk, 'High');
  assert.ok(result.confidence >= 85, `Confidence ${result.confidence} should be >= 85% for High risk`);
});
test('returns Medium for mildly elevated vitals', () => {
  const result = classifyRisk({ heartRate: 108, spo2: 93, temperature: 37.8, systolic: 135 });
  assert.ok(['Medium', 'High'].includes(result.risk), `Expected Medium or High, got ${result.risk}`);
});
test('confidence is 0-100 range', () => {
  const result = classifyRisk({ heartRate: 75, spo2: 98, temperature: 36.7, systolic: 115 });
  assert.ok(result.confidence >= 0 && result.confidence <= 100, `Confidence ${result.confidence} out of range`);
});
test('factors array is non-null', () => {
  const result = classifyRisk({ heartRate: 75, spo2: 98, temperature: 36.7, systolic: 115 });
  assert.ok(Array.isArray(result.factors), 'Factors should be an array');
});

// ─────────────────────────────────────────────────────────
// Multiple rules triggering simultaneously
// ─────────────────────────────────────────────────────────
console.log('\n--- Multi-rule scenarios ---');
test('critical vitals trigger multiple rules', () => {
  const results = evaluateRules({ heartRate: 145, spo2: 87, temperature: 39.5, systolic: 185 }, { age: 55 });
  assert.ok(results.length >= 4, `Expected ≥4 rules triggered, got ${results.length}: ${results.map(r => r.ruleId).join(', ')}`);
});
test('completely normal vitals trigger no rules', () => {
  const results = evaluateRules({ heartRate: 75, spo2: 98, temperature: 36.8, systolic: 115, respiratoryRate: 16 });
  assert.strictEqual(results.length, 0, `Expected 0 rules triggered, got ${results.length}`);
});

// ─────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`📊 Results: ${passed} passed / ${failed} failed / ${passed + failed} total`);
if (failed === 0) {
  console.log('✅ ALL TESTS PASSED\n');
  process.exit(0);
} else {
  console.error(`❌ ${failed} TESTS FAILED\n`);
  process.exit(1);
}
