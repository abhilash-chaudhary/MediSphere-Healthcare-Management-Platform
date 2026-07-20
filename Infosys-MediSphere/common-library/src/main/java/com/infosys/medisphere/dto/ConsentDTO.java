package com.infosys.medisphere.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConsentDTO {
    private String id;
    private String patientId;
    private String doctorId;
    private String status; // GRANTED, REVOKED, EXPIRED
    private LocalDateTime grantedAt;
    private LocalDateTime expiresAt;
    private List<String> authorizedResourceTypes; // e.g. ["Vitals", "Medications", "Conditions"]
}
