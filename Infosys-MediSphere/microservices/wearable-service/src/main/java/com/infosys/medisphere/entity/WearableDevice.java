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
@Document(collection = "wearables")
public class WearableDevice {
    @Id
    private String id;
    private String deviceId;
    private String patientId;
    private String deviceModel; // e.g. Fitbit, Apple Watch
    private String status; // ACTIVE, DISCONNECTED
    private LocalDateTime registeredAt;
}
