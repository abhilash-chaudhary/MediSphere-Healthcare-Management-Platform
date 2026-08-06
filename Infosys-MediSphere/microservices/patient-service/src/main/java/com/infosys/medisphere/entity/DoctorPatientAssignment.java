package com.infosys.medisphere.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "doctor_patient_assignments")
@CompoundIndex(name = "doctor_patient_idx", def = "{'doctorUsername': 1, 'patientId': 1}", unique = true)
public class DoctorPatientAssignment {
    @Id
    private String id;
    private String doctorUsername;
    private String patientId;
    @Builder.Default
    private LocalDateTime assignedAt = LocalDateTime.now();
    private String assignedBy; // admin username who made the assignment
}
