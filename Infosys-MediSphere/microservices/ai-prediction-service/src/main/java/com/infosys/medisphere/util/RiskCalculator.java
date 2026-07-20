package com.infosys.medisphere.util;

/**
 * Rule-based risk scoring utility.
 * Implements the scoring formula for cardiovascular and diabetes risk assessment.
 *
 * Scoring Rules:
 *   Age > 60      → +15
 *   BP > 140      → +20
 *   BMI > 30      → +15
 *   HbA1c > 7     → +20
 *   Cholesterol > 220 → +20
 *   Heart Rate > 110  → +10
 *
 * Risk Levels:
 *   0–30  → LOW
 *   31–60 → MEDIUM
 *   61+   → HIGH
 */
public final class RiskCalculator {

    private RiskCalculator() {
        // Prevent instantiation
    }

    /**
     * Calculate the total risk score based on patient health metrics.
     */
    public static int calculateRiskScore(Integer age, Integer bloodPressure, Double bmi,
                                         Double hba1c, Double cholesterol, Integer heartRate) {
        int score = 0;

        if (age != null && age > 60) {
            score += 15;
        }
        if (bloodPressure != null && bloodPressure > 140) {
            score += 20;
        }
        if (bmi != null && bmi > 30) {
            score += 15;
        }
        if (hba1c != null && hba1c > 7.0) {
            score += 20;
        }
        if (cholesterol != null && cholesterol > 220) {
            score += 20;
        }
        if (heartRate != null && heartRate > 110) {
            score += 10;
        }

        return score;
    }

    /**
     * Determine the risk level string from a numeric score.
     */
    public static String determineRiskLevel(int score) {
        if (score >= 61) {
            return "HIGH";
        } else if (score >= 31) {
            return "MEDIUM";
        } else {
            return "LOW";
        }
    }

    /**
     * Calculate prediction confidence based on data completeness.
     * More non-null inputs → higher confidence.
     */
    public static int calculateConfidence(Integer age, Integer bloodPressure, Double bmi,
                                          Double hba1c, Double cholesterol, Integer heartRate) {
        int dataPoints = 0;
        int totalPoints = 6;

        if (age != null) dataPoints++;
        if (bloodPressure != null) dataPoints++;
        if (bmi != null) dataPoints++;
        if (hba1c != null) dataPoints++;
        if (cholesterol != null) dataPoints++;
        if (heartRate != null) dataPoints++;

        // Base confidence 70% + up to 30% based on data completeness
        return 70 + (int) ((dataPoints / (double) totalPoints) * 30);
    }

    /**
     * Convert risk score to a percentage (capped at 100).
     */
    public static double scoreToPercentage(int score) {
        return Math.min(score, 100);
    }
}
