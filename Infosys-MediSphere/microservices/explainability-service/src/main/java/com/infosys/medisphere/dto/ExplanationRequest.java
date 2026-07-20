package com.infosys.medisphere.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for generating explanations.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExplanationRequest {
    private String patientId;
    private Integer age;
    private Integer bloodPressure;
    private Double bmi;
    private Double hba1c;
    private Double cholesterol;
    private Integer heartRate;
    private String riskLevel;
}
