package com.infosys.medisphere.service;

import com.infosys.medisphere.dto.HealthTwinDTO;
import com.infosys.medisphere.entity.DigitalHealthTwin;
import com.infosys.medisphere.exception.ResourceNotFoundException;
import com.infosys.medisphere.repository.DigitalHealthTwinRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;

@Slf4j
@Service
public class DigitalTwinServiceImpl implements DigitalTwinService {

    private final DigitalHealthTwinRepository twinRepository;

    public DigitalTwinServiceImpl(DigitalHealthTwinRepository twinRepository) {
        this.twinRepository = twinRepository;
    }

    @Override
    public HealthTwinDTO createTwin(String patientId) {
        log.info("Creating a new digital health twin for Patient ID: {}", patientId);
        
        DigitalHealthTwin twin = DigitalHealthTwin.builder()
                .patientId(patientId)
                .completenessScore(60.0) // Initial score
                .vitalsHistory(new ArrayList<>())
                .activeMedications(new ArrayList<>())
                .activeConditions(new ArrayList<>())
                .riskCategory("LOW")
                .lastRebuilt(LocalDateTime.now())
                .build();

        DigitalHealthTwin savedTwin = twinRepository.save(twin);
        return mapToDto(savedTwin);
    }

    @Override
    public HealthTwinDTO updateTwin(String patientId, HealthTwinDTO dto) {
        log.info("Updating digital health twin for Patient ID: {}", patientId);
        DigitalHealthTwin twin = twinRepository.findByPatientId(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("Digital Twin not found for Patient: " + patientId));

        twin.setVitalsHistory(dto.getVitalsHistory());
        twin.setActiveMedications(dto.getActiveMedications());
        twin.setActiveConditions(dto.getActiveConditions());
        twin.setCompletenessScore(calculateCompleteness(twin));
        twin.setRiskCategory(evaluateRiskCategory(twin));
        twin.setLastRebuilt(LocalDateTime.now());

        DigitalHealthTwin saved = twinRepository.save(twin);
        return mapToDto(saved);
    }

    @Override
    public HealthTwinDTO getTwinByPatientId(String patientId) {
        log.info("Retrieving digital health twin for Patient ID: {}", patientId);
        DigitalHealthTwin twin = twinRepository.findByPatientId(patientId)
                .orElseGet(() -> {
                    log.info("Twin not found, creating a new default twin for Patient ID: {}", patientId);
                    HealthTwinDTO defaultTwin = createTwin(patientId);
                    DigitalHealthTwin t = new DigitalHealthTwin();
                    t.setId(defaultTwin.getId());
                    t.setPatientId(defaultTwin.getPatientId());
                    t.setCompletenessScore(defaultTwin.getCompletenessScore());
                    t.setVitalsHistory(new ArrayList<>());
                    t.setActiveMedications(new ArrayList<>());
                    t.setActiveConditions(new ArrayList<>());
                    t.setRiskCategory(defaultTwin.getRiskCategory());
                    t.setLastRebuilt(defaultTwin.getLastRebuilt());
                    return twinRepository.save(t);
                });
        return mapToDto(twin);
    }

    @Override
    public HealthTwinDTO rebuildTwin(String patientId) {
        log.info("Triggering twin rebuild analysis for Patient ID: {}", patientId);
        DigitalHealthTwin twin = twinRepository.findByPatientId(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("Digital Twin not found for Patient: " + patientId));

        // Simulate fetching latest EHR and Wearable records and merging them
        twin.setCompletenessScore(calculateCompleteness(twin) + 10.0 > 100.0 ? 100.0 : calculateCompleteness(twin) + 10.0);
        twin.setRiskCategory(evaluateRiskCategory(twin));
        twin.setLastRebuilt(LocalDateTime.now());

        DigitalHealthTwin saved = twinRepository.save(twin);
        return mapToDto(saved);
    }

    private Double calculateCompleteness(DigitalHealthTwin twin) {
        double score = 50.0; // Baseline
        if (twin.getVitalsHistory() != null && !twin.getVitalsHistory().isEmpty()) {
            score += 20.0;
        }
        if (twin.getActiveMedications() != null && !twin.getActiveMedications().isEmpty()) {
            score += 15.0;
        }
        if (twin.getActiveConditions() != null && !twin.getActiveConditions().isEmpty()) {
            score += 15.0;
        }
        return score;
    }

    private String evaluateRiskCategory(DigitalHealthTwin twin) {
        if (twin.getActiveConditions() != null && twin.getActiveConditions().size() > 3) {
            return "HIGH";
        } else if (twin.getActiveConditions() != null && twin.getActiveConditions().size() > 1) {
            return "MEDIUM";
        }
        return "LOW";
    }

    private HealthTwinDTO mapToDto(DigitalHealthTwin twin) {
        return HealthTwinDTO.builder()
                .id(twin.getId())
                .patientId(twin.getPatientId())
                .completenessScore(twin.getCompletenessScore())
                .vitalsHistory(twin.getVitalsHistory() != null ? twin.getVitalsHistory() : Collections.emptyList())
                .activeMedications(twin.getActiveMedications() != null ? twin.getActiveMedications() : Collections.emptyList())
                .activeConditions(twin.getActiveConditions() != null ? twin.getActiveConditions() : Collections.emptyList())
                .riskCategory(twin.getRiskCategory())
                .lastRebuilt(twin.getLastRebuilt())
                .build();
    }
}
