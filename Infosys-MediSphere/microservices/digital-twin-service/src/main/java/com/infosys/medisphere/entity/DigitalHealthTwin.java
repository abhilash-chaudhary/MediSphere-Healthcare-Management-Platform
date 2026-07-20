package com.infosys.medisphere.entity;

import com.infosys.medisphere.dto.VitalDTO;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "health_twins")
public class DigitalHealthTwin {
    @Id
    private String id;
    private String patientId;
    private Double completenessScore;
    private List<VitalDTO> vitalsHistory;
    private List<String> activeMedications;
    private List<String> activeConditions;
    private String riskCategory;
    private LocalDateTime lastRebuilt;
}
