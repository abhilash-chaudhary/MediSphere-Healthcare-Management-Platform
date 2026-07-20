package com.infosys.medisphere.repository;

import com.infosys.medisphere.entity.AuditLog;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface AuditLogRepository extends MongoRepository<AuditLog, String> {
    List<AuditLog> findByUsername(String username);
    List<AuditLog> findByResource(String resource);
}
