package com.infosys.medisphere.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

/**
 * MongoDB document representing an AI prediction explanation.
 * Stored in the 'explanations' collection.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "explanations")
public class Explanation {
    @Id
    private String id;
    private String patientId;
    private String risk;            // HIGH, MEDIUM, LOW
    private List<String> topFactors;
    private List<FactorContribution> factors;
    private LocalDateTime createdAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FactorContribution {
        private String name;
        private int contribution;
        private String description;
    }
}
