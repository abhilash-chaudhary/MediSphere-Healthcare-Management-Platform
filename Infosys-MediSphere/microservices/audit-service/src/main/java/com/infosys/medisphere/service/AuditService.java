package com.infosys.medisphere.service;

import com.infosys.medisphere.dto.AuditEventDTO;
import java.util.List;

public interface AuditService {
    void logAuditEvent(AuditEventDTO auditEventDTO);
    List<AuditEventDTO> getAuditLogsByUsername(String username);
    List<AuditEventDTO> getAllLogs();
}
