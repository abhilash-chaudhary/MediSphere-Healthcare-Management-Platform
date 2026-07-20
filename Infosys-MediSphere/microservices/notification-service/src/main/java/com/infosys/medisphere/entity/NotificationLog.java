package com.infosys.medisphere.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "notifications")
public class NotificationLog {
    @Id
    private String id;
    private String recipientId;
    private String recipientEmail;
    private String recipientPhone;
    private String type; // e.g. APPOINTMENT_REMINDER, MEDICINE_REMINDER, CRITICAL_ALERT
    private String channel; // EMAIL, SMS, PUSH
    private String content;
    private String status; // SENT, FAILED
    private LocalDateTime sentAt;
}
