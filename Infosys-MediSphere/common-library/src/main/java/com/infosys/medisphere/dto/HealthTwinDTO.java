package com.infosys.medisphere.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HealthTwinDTO {
    private String id;
    private String patientId;
    private Double completenessScore; // Percentage
    private List<VitalDTO> vitalsHistory;
    private List<String> activeMedications;
    private List<String> activeConditions;
    private String riskCategory; // e.g. LOW, MEDIUM, HIGH
    private LocalDateTime lastRebuilt;
}
