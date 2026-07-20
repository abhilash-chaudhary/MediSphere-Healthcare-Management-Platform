package com.infosys.medisphere.listener;

import com.infosys.medisphere.constant.KafkaTopics;
import com.infosys.medisphere.dto.NotificationDTO;
import com.infosys.medisphere.service.NotificationService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class NotificationConsumer {

    private final NotificationService notificationService;

    public NotificationConsumer(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @KafkaListener(topics = KafkaTopics.NOTIFICATION_EVENTS, groupId = "medisphere-notification-group")
    public void consumeNotificationEvent(NotificationDTO notificationDTO) {
        log.info("Consumed notification event from topic: {}", KafkaTopics.NOTIFICATION_EVENTS);
        notificationService.sendNotification(notificationDTO);
    }
}
