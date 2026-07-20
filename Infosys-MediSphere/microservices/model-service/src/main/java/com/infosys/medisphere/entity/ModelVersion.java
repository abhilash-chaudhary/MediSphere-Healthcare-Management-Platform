package com.infosys.medisphere.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;

/**
 * MongoDB document representing an AI model version.
 * Stored in the 'models' collection.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "models")
public class ModelVersion {
    @Id
    private String id;

    @Indexed(unique = true)
    private String version;

    private Double accuracy;
    private LocalDate createdDate;
    private String status;          // ACTIVE, INACTIVE, DEPRECATED
}
