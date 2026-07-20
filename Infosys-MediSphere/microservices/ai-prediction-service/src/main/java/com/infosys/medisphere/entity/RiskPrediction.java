package com.infosys.medisphere.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;

/**
 * MongoDB document representing a risk prediction result.
 * Stored in the 'risk_predictions' collection.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "risk_predictions")
public class RiskPrediction {
    @Id
    private String id;
    private String patientId;
    private String riskType;          // CARDIO or DIABETES
    private Double riskPercentage;
    private String riskLevel;         // LOW, MEDIUM, HIGH
    private Integer confidence;
    private LocalDate predictionDate;
    private String modelVersion;
}
