package com.infosys.medisphere.service;

import com.infosys.medisphere.dto.NotificationDTO;
import com.infosys.medisphere.entity.NotificationLog;
import com.infosys.medisphere.repository.NotificationRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Slf4j
@Service
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;

    public NotificationServiceImpl(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @Override
    public void sendNotification(NotificationDTO dto) {
        log.info("Dispatching notification payload via [{} Channel] to recipient: {}", dto.getChannel(), dto.getRecipientId());
        log.info("Message body: {}", dto.getContent());

        NotificationLog notifyLog = NotificationLog.builder()
                .recipientId(dto.getRecipientId())
                .recipientEmail(dto.getRecipientEmail())
                .recipientPhone(dto.getRecipientPhone())
                .type(dto.getType())
                .channel(dto.getChannel())
                .content(dto.getContent())
                .status("SENT")
                .sentAt(LocalDateTime.now())
                .build();

        notificationRepository.save(notifyLog);
        log.info("Notification log successfully persisted to MongoDB");
    }

    @Override
    public java.util.List<NotificationLog> getNotifications(String recipientId) {
        log.info("Fetching notifications for recipient: {}", recipientId);
        return notificationRepository.findByRecipientId(recipientId);
    }

    @Override
    public void markAsRead(String recipientId) {
        log.info("Marking notifications as read for recipient: {}", recipientId);
        java.util.List<NotificationLog> list = notificationRepository.findByRecipientId(recipientId);
        for (NotificationLog nLog : list) {
            nLog.setStatus("READ");
        }
        notificationRepository.saveAll(list);
    }
}
