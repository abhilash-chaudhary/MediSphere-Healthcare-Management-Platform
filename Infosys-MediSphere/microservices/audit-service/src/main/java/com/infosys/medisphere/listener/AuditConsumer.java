package com.infosys.medisphere.listener;

import com.infosys.medisphere.constant.KafkaTopics;
import com.infosys.medisphere.dto.AuditEventDTO;
import com.infosys.medisphere.service.AuditService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class AuditConsumer {

    private final AuditService auditService;

    public AuditConsumer(AuditService auditService) {
        this.auditService = auditService;
    }

    @KafkaListener(topics = KafkaTopics.AUDIT_EVENTS, groupId = "medisphere-audit-group")
    public void consumeAuditEvent(AuditEventDTO auditEventDTO) {
        log.info("Consumed audit log event from topic: {}", KafkaTopics.AUDIT_EVENTS);
        auditService.logAuditEvent(auditEventDTO);
    }
}
