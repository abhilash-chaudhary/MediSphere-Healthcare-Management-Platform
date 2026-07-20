package com.infosys.medisphere.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardDTO {
    private String patientId;
    private PatientDTO patientProfile;
    private HealthTwinDTO digitalTwin;
    private Boolean consentCheckResult;
    private String healthRiskLevel; // LOW, MEDIUM, HIGH
    private String alertStatusSummary; // NORMAL, ALERT
    
    private List<AppointmentDTO> appointments;
    private List<LabResultDTO> labReports;
    private List<PrescriptionDTO> activePrescriptions;
    private List<TimelineEventDTO> medicalTimeline;
}
