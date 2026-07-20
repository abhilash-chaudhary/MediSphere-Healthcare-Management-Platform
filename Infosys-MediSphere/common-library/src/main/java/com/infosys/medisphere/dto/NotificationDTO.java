package com.infosys.medisphere.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationDTO {
    private String id;
    private String recipientId;
    private String recipientEmail;
    private String recipientPhone;
    private String type; // e.g. APPOINTMENT_REMINDER, MEDICINE_REMINDER, CRITICAL_ALERT
    private String channel; // EMAIL, SMS, PUSH
    private String content;
    private String status; // PENDING, SENT, FAILED
    private LocalDateTime createdAt;
}
