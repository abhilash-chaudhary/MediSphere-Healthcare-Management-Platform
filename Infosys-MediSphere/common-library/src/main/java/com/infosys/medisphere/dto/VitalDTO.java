package com.infosys.medisphere.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VitalDTO {
    private String id;
    private String patientId;
    private Double heartRate;
    private String bloodPressure; // format: "SYS/DIA"
    private Double temperature; // Celsius
    private Double oxygenLevel; // SpO2 percentage
    private Double caloriesBurned;
    private Integer sleepMinutes;
    private Integer steps;
    private LocalDateTime recordedAt;
}
