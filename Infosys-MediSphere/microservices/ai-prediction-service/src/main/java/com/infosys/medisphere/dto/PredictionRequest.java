package com.infosys.medisphere.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for prediction endpoints.
 * If health data fields are provided, they are used directly.
 * Otherwise, the service fetches data from the Health Twin Service.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PredictionRequest {
    private String patientId;

    // Optional — if not provided, fetched from Health Twin Service
    private Integer age;
    private Integer bloodPressure;      // Systolic BP
    private Double bmi;
    private Double hba1c;
    private Double cholesterol;
    private Integer heartRate;
}
