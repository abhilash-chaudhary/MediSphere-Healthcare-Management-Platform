package com.infosys.medisphere.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "vitals")
public class VitalRecord {
    @Id
    private String id;
    private String patientId;
    private Double heartRate;
    private String bloodPressure;
    private Double temperature;
    private Double oxygenLevel;
    private Double caloriesBurned;
    private Integer sleepMinutes;
    private Integer steps;
    private LocalDateTime recordedAt;
    private String status; // NORMAL, ABNORMAL, CRITICAL
}
