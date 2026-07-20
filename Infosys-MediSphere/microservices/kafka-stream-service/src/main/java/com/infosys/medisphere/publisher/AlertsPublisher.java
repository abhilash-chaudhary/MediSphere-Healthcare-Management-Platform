package com.infosys.medisphere.publisher;

import com.infosys.medisphere.constant.KafkaTopics;
import com.infosys.medisphere.dto.NotificationDTO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Slf4j
@Component
public class AlertsPublisher {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public AlertsPublisher(KafkaTemplate<String, Object> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void publishCriticalAlert(String patientId, String message) {
        log.warn("ALERT TRIGGERED! Patient: {} Message: {}", patientId, message);

        NotificationDTO alertNotification = NotificationDTO.builder()
                .recipientId(patientId)
                .type("CRITICAL_ALERT")
                .channel("SMS") // Prioritize SMS for critical medical alarms
                .content("[CRITICAL ALERT] Patient " + patientId + ": " + message)
                .status("PENDING")
                .createdAt(LocalDateTime.now())
                .build();

        // Send to notification-events topic
        kafkaTemplate.send(KafkaTopics.NOTIFICATION_EVENTS, patientId, alertNotification);
    }
}
