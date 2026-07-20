package com.infosys.medisphere.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * Response DTO returned by prediction endpoints.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PredictionResponse {
    private String id;
    private String patientId;
    private String riskType;
    private Double riskPercentage;
    private String riskLevel;
    private Integer confidence;
    private LocalDate predictionDate;
    private String modelVersion;
}
