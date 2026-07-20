package com.infosys.medisphere.service;

import com.infosys.medisphere.dto.AuditEventDTO;
import com.infosys.medisphere.entity.AuditLog;
import com.infosys.medisphere.repository.AuditLogRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
public class AuditServiceImpl implements AuditService {

    private final AuditLogRepository auditLogRepository;

    public AuditServiceImpl(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @Override
    public void logAuditEvent(AuditEventDTO dto) {
        log.info("Processing audit log registration from event queue: {} on {}", dto.getAction(), dto.getResource());

        AuditLog auditLog = AuditLog.builder()
                .username(dto.getUsername())
                .role(dto.getRole())
                .action(dto.getAction())
                .resource(dto.getResource())
                .resourceId(dto.getResourceId())
                .details(dto.getDetails())
                .clientIp(dto.getClientIp())
                .timestamp(dto.getTimestamp() != null ? dto.getTimestamp() : LocalDateTime.now())
                .build();

        auditLogRepository.save(auditLog);
        log.info("Compliance Audit Log registered successfully.");
    }

    @Override
    public List<AuditEventDTO> getAuditLogsByUsername(String username) {
        log.info("Retrieving audit history for principal: {}", username);
        List<AuditLog> list = auditLogRepository.findByUsername(username);
        return list.stream().map(this::mapToDto).collect(Collectors.toList());
    }

    @Override
    public List<AuditEventDTO> getAllLogs() {
        log.info("Retrieving complete compliance audit history");
        return auditLogRepository.findAll().stream().map(this::mapToDto).collect(Collectors.toList());
    }

    private AuditEventDTO mapToDto(AuditLog audit) {
        return AuditEventDTO.builder()
                .id(audit.getId())
                .username(audit.getUsername())
                .role(audit.getRole())
                .action(audit.getAction())
                .resource(audit.getResource())
                .resourceId(audit.getResourceId())
                .details(audit.getDetails())
                .clientIp(audit.getClientIp())
                .timestamp(audit.getTimestamp())
                .build();
    }
}
