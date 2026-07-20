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
@Document(collection = "audit_logs")
public class AuditLog {
    @Id
    private String id;
    private String username;
    private String role;
    private String action; // e.g. READ, CREATE, UPDATE, DELETE
    private String resource;
    private String resourceId;
    private String details;
    private String clientIp;
    private LocalDateTime timestamp;
}
