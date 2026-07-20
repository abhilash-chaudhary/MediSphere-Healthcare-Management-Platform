package com.infosys.medisphere.audit;

import com.infosys.medisphere.constant.KafkaTopics;
import com.infosys.medisphere.events.AuditLogEvent;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.lang.reflect.Method;
import java.time.LocalDateTime;

@Slf4j
@Aspect
@Component
public class AuditAspect {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public AuditAspect(KafkaTemplate<String, Object> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    @AfterReturning(pointcut = "@annotation(auditable)", returning = "result")
    public void auditMethodCall(JoinPoint joinPoint, Auditable auditable, Object result) {
        try {
            String username = "SYSTEM";
            String ipAddress = "0.0.0.0";

            ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attributes != null) {
                HttpServletRequest request = attributes.getRequest();
                String headerUser = request.getHeader("X-Auth-User");
                if (headerUser != null && !headerUser.isBlank()) {
                    username = headerUser;
                } else if (request.getUserPrincipal() != null) {
                    username = request.getUserPrincipal().getName();
                }
                ipAddress = request.getRemoteAddr();
            }

            String action = auditable.action();
            String resource = auditable.resource();
            String details = String.format("Method %s executed successfully. Args count: %d", 
                    joinPoint.getSignature().toShortString(), joinPoint.getArgs().length);

            AuditLogEvent auditLog = AuditLogEvent.builder()
                    .username(username)
                    .action(action)
                    .resource(resource)
                    .timestamp(LocalDateTime.now())
                    .ipAddress(ipAddress)
                    .details(details)
                    .build();

            log.info("AOP Auditing: Publishing audit log event to Kafka: {}", auditLog);
            kafkaTemplate.send(KafkaTopics.AUDIT_EVENTS, username, auditLog);
        } catch (Exception e) {
            log.error("Failed to process AOP audit log event: {}", e.getMessage());
        }
    }
}
