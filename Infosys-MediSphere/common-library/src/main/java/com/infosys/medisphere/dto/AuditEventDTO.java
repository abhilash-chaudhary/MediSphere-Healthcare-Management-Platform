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
public class AuditEventDTO {
    private String id;
    private String username;
    private String role;
    private String action; // e.g. READ, CREATE, UPDATE, DELETE
    private String resource; // e.g. Patient Profile, Consent Grant
    private String resourceId;
    private String details;
    private String clientIp;
    private LocalDateTime timestamp;
}
