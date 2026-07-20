package com.infosys.medisphere.service;

import com.infosys.medisphere.dto.ExplanationRequest;
import com.infosys.medisphere.dto.ExplanationResponse;
import com.infosys.medisphere.entity.Explanation;
import com.infosys.medisphere.entity.Explanation.FactorContribution;
import com.infosys.medisphere.repository.ExplanationRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service that generates SHAP-style explanations for AI predictions.
 * Analyzes which health factors contributed most to the risk assessment.
 */
@Slf4j
@Service
public class ExplainabilityService {

    private final ExplanationRepository explanationRepository;

    public ExplainabilityService(ExplanationRepository explanationRepository) {
        this.explanationRepository = explanationRepository;
    }

    /**
     * Generate an explanation based on patient health data.
     * Calculates each factor's contribution to the risk score.
     */
    public ExplanationResponse generateExplanation(ExplanationRequest request) {
        List<FactorContribution> factors = new ArrayList<>();

        // Calculate individual factor contributions (mirrors RiskCalculator logic)
        if (request.getBloodPressure() != null && request.getBloodPressure() > 140) {
            factors.add(FactorContribution.builder()
                    .name("Blood Pressure")
                    .contribution(20)
                    .description("Systolic BP " + request.getBloodPressure() + " mmHg exceeds threshold of 140")
                    .build());
        } else if (request.getBloodPressure() != null) {
            factors.add(FactorContribution.builder()
                    .name("Blood Pressure")
                    .contribution(0)
                    .description("Systolic BP " + request.getBloodPressure() + " mmHg is within normal range")
                    .build());
        }

        if (request.getHba1c() != null && request.getHba1c() > 7.0) {
            factors.add(FactorContribution.builder()
                    .name("HbA1c")
                    .contribution(20)
                    .description("HbA1c " + request.getHba1c() + "% exceeds threshold of 7.0%")
                    .build());
        } else if (request.getHba1c() != null) {
            factors.add(FactorContribution.builder()
                    .name("HbA1c")
                    .contribution(0)
                    .description("HbA1c " + request.getHba1c() + "% is within normal range")
                    .build());
        }

        if (request.getCholesterol() != null && request.getCholesterol() > 220) {
            factors.add(FactorContribution.builder()
                    .name("Cholesterol")
                    .contribution(20)
                    .description("Cholesterol " + request.getCholesterol() + " mg/dL exceeds threshold of 220")
                    .build());
        } else if (request.getCholesterol() != null) {
            factors.add(FactorContribution.builder()
                    .name("Cholesterol")
                    .contribution(0)
                    .description("Cholesterol " + request.getCholesterol() + " mg/dL is within normal range")
                    .build());
        }

        if (request.getAge() != null && request.getAge() > 60) {
            factors.add(FactorContribution.builder()
                    .name("Age")
                    .contribution(15)
                    .description("Age " + request.getAge() + " exceeds threshold of 60")
                    .build());
        } else if (request.getAge() != null) {
            factors.add(FactorContribution.builder()
                    .name("Age")
                    .contribution(0)
                    .description("Age " + request.getAge() + " is within normal range")
                    .build());
        }

        if (request.getBmi() != null && request.getBmi() > 30) {
            factors.add(FactorContribution.builder()
                    .name("BMI")
                    .contribution(15)
                    .description("BMI " + request.getBmi() + " exceeds threshold of 30 (Obese)")
                    .build());
        } else if (request.getBmi() != null) {
            factors.add(FactorContribution.builder()
                    .name("BMI")
                    .contribution(0)
                    .description("BMI " + request.getBmi() + " is within normal range")
                    .build());
        }

        if (request.getHeartRate() != null && request.getHeartRate() > 110) {
            factors.add(FactorContribution.builder()
                    .name("Heart Rate")
                    .contribution(10)
                    .description("Heart Rate " + request.getHeartRate() + " bpm exceeds threshold of 110")
                    .build());
        } else if (request.getHeartRate() != null) {
            factors.add(FactorContribution.builder()
                    .name("Heart Rate")
                    .contribution(0)
                    .description("Heart Rate " + request.getHeartRate() + " bpm is within normal range")
                    .build());
        }

        // Sort by contribution (highest first) and get top factor names
        factors.sort(Comparator.comparingInt(FactorContribution::getContribution).reversed());
        List<String> topFactors = factors.stream()
                .filter(f -> f.getContribution() > 0)
                .map(FactorContribution::getName)
                .collect(Collectors.toList());

        String riskLevel = request.getRiskLevel() != null ? request.getRiskLevel() : "UNKNOWN";

        // Save the explanation to MongoDB
        Explanation explanation = Explanation.builder()
                .patientId(request.getPatientId())
                .risk(riskLevel)
                .topFactors(topFactors)
                .factors(factors)
                .createdAt(LocalDateTime.now())
                .build();

        explanationRepository.save(explanation);
        log.info("Generated explanation for patient: {} with {} contributing factors",
                request.getPatientId(), topFactors.size());

        return ExplanationResponse.builder()
                .patientId(request.getPatientId())
                .risk(riskLevel)
                .topFactors(topFactors)
                .factors(factors)
                .build();
    }

    /**
     * Retrieve the latest stored explanation for a patient.
     */
    public ExplanationResponse getExplanation(String patientId) {
        return explanationRepository.findFirstByPatientIdOrderByCreatedAtDesc(patientId)
                .map(e -> ExplanationResponse.builder()
                        .patientId(e.getPatientId())
                        .risk(e.getRisk())
                        .topFactors(e.getTopFactors())
                        .factors(e.getFactors())
                        .build())
                .orElse(null);
    }
}
