package com.infosys.medisphere.entity;

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
@Document(collection = "consents")
public class Consent {
    @Id
    private String id;
    private String patientId;
    private String doctorId;
    private String status; // GRANTED, REVOKED, EXPIRED
    private LocalDateTime grantedAt;
    private LocalDateTime expiresAt;
    private List<String> authorizedResourceTypes; // e.g. ["Vitals", "Medications", "Conditions"]
}
