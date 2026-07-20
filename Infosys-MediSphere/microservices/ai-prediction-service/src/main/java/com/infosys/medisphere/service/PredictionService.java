package com.infosys.medisphere.service;

import com.infosys.medisphere.constant.KafkaTopics;
import com.infosys.medisphere.dto.PredictionRequest;
import com.infosys.medisphere.dto.PredictionResponse;
import com.infosys.medisphere.entity.RiskPrediction;
import com.infosys.medisphere.exception.PredictionException;
import com.infosys.medisphere.repository.PredictionRepository;
import com.infosys.medisphere.util.RiskCalculator;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Core prediction service implementing rule-based AI risk scoring.
 * Fetches patient health data from Digital Twin Service when not provided directly.
 * Publishes prediction events to Kafka.
 */
@Slf4j
@Service
public class PredictionService {

    private final PredictionRepository predictionRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final RestTemplate restTemplate;

    public PredictionService(PredictionRepository predictionRepository,
                             KafkaTemplate<String, Object> kafkaTemplate,
                             RestTemplate restTemplate) {
        this.predictionRepository = predictionRepository;
        this.kafkaTemplate = kafkaTemplate;
        this.restTemplate = restTemplate;
    }

    /**
     * Predict cardiovascular disease risk.
     */
    public PredictionResponse predictCVD(PredictionRequest request) {
        return performPrediction(request, "CARDIO");
    }

    /**
     * Predict diabetes complication risk.
     */
    public PredictionResponse predictDiabetes(PredictionRequest request) {
        return performPrediction(request, "DIABETES");
    }

    /**
     * Core prediction logic used by both CVD and Diabetes endpoints.
     */
    private PredictionResponse performPrediction(PredictionRequest request, String riskType) {
        if (request.getPatientId() == null || request.getPatientId().isBlank()) {
            throw new PredictionException("Patient ID is required for prediction");
        }

        // Attempt to enrich request with Health Twin data if fields are missing
        enrichFromHealthTwin(request);

        // Calculate risk score using rule-based engine
        int score = RiskCalculator.calculateRiskScore(
                request.getAge(),
                request.getBloodPressure(),
                request.getBmi(),
                request.getHba1c(),
                request.getCholesterol(),
                request.getHeartRate()
        );

        String riskLevel = RiskCalculator.determineRiskLevel(score);
        double riskPercentage = RiskCalculator.scoreToPercentage(score);
        int confidence = RiskCalculator.calculateConfidence(
                request.getAge(),
                request.getBloodPressure(),
                request.getBmi(),
                request.getHba1c(),
                request.getCholesterol(),
                request.getHeartRate()
        );

        // Build and save the prediction entity
        RiskPrediction prediction = RiskPrediction.builder()
                .patientId(request.getPatientId())
                .riskType(riskType)
                .riskPercentage(riskPercentage)
                .riskLevel(riskLevel)
                .confidence(confidence)
                .predictionDate(LocalDate.now())
                .modelVersion("1.0")
                .build();

        RiskPrediction saved = predictionRepository.save(prediction);
        log.info("Prediction saved: {} risk for patient {} → {} ({}%)",
                riskType, request.getPatientId(), riskLevel, riskPercentage);

        // Publish prediction event to Kafka
        try {
            kafkaTemplate.send(KafkaTopics.PREDICTION_EVENTS, request.getPatientId(), mapToResponse(saved));
            log.info("Published prediction event to Kafka for patient: {}", request.getPatientId());
        } catch (Exception e) {
            log.warn("Failed to publish prediction event to Kafka: {}", e.getMessage());
        }

        return mapToResponse(saved);
    }

    /**
     * Enrich the prediction request with data from the Digital Twin Service
     * if health metrics are not directly provided.
     */
    @SuppressWarnings("unchecked")
    private void enrichFromHealthTwin(PredictionRequest request) {
        // Only fetch if critical fields are missing
        if (request.getAge() != null && request.getBloodPressure() != null) {
            return;
        }

        try {
            String url = "http://digital-twin-service/twin/" + request.getPatientId();
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);

            if (response != null && response.containsKey("data")) {
                Map<String, Object> data = (Map<String, Object>) response.get("data");
                log.info("Fetched Health Twin data for patient: {}", request.getPatientId());

                // Extract vitals from the twin data if available
                if (data.containsKey("vitalsHistory")) {
                    List<Map<String, Object>> vitals = (List<Map<String, Object>>) data.get("vitalsHistory");
                    if (vitals != null && !vitals.isEmpty()) {
                        Map<String, Object> latestVital = vitals.get(vitals.size() - 1);

                        if (request.getHeartRate() == null && latestVital.containsKey("heartRate")) {
                            Object hr = latestVital.get("heartRate");
                            if (hr instanceof Number) {
                                request.setHeartRate(((Number) hr).intValue());
                            }
                        }
                        if (request.getBloodPressure() == null && latestVital.containsKey("bloodPressure")) {
                            String bp = (String) latestVital.get("bloodPressure");
                            if (bp != null && bp.contains("/")) {
                                request.setBloodPressure(Integer.parseInt(bp.split("/")[0]));
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Could not fetch Health Twin data for patient {}: {}. Proceeding with available data.",
                    request.getPatientId(), e.getMessage());
        }
    }

    /**
     * Get prediction history for a patient.
     */
    public List<PredictionResponse> getHistory(String patientId) {
        return predictionRepository.findByPatientIdOrderByPredictionDateDesc(patientId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get the latest prediction for a patient.
     */
    public PredictionResponse getLatest(String patientId) {
        return predictionRepository.findFirstByPatientIdOrderByPredictionDateDesc(patientId)
                .map(this::mapToResponse)
                .orElse(null);
    }

    /**
     * Delete a prediction by ID.
     */
    public void deletePrediction(String id) {
        if (!predictionRepository.existsById(id)) {
            throw new PredictionException("Prediction not found with ID: " + id);
        }
        predictionRepository.deleteById(id);
        log.info("Deleted prediction with ID: {}", id);
    }

    private PredictionResponse mapToResponse(RiskPrediction prediction) {
        return PredictionResponse.builder()
                .id(prediction.getId())
                .patientId(prediction.getPatientId())
                .riskType(prediction.getRiskType())
                .riskPercentage(prediction.getRiskPercentage())
                .riskLevel(prediction.getRiskLevel())
                .confidence(prediction.getConfidence())
                .predictionDate(prediction.getPredictionDate())
                .modelVersion(prediction.getModelVersion())
                .build();
    }
}
