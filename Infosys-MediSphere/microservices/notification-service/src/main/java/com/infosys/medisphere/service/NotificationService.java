package com.infosys.medisphere.service;

import com.infosys.medisphere.dto.NotificationDTO;

public interface NotificationService {
    void sendNotification(NotificationDTO notificationDTO);
    java.util.List<com.infosys.medisphere.entity.NotificationLog> getNotifications(String recipientId);
    void markAsRead(String recipientId);
}
