package com.infosys.medisphere.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "lab_results")
public class LabResult {
    @Id
    private String id;
    private String patientId;
    private String test;
    private String value;
    private String range;
    private String status;
    private LocalDate date;
}
