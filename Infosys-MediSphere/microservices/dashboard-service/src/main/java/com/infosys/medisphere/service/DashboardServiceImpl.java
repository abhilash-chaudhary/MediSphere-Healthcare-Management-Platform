package com.infosys.medisphere.service;

import com.infosys.medisphere.dto.ApiResponse;
import com.infosys.medisphere.dto.DashboardDTO;
import com.infosys.medisphere.dto.HealthTwinDTO;
import com.infosys.medisphere.dto.PatientDTO;
import com.infosys.medisphere.dto.AppointmentDTO;
import com.infosys.medisphere.dto.LabResultDTO;
import com.infosys.medisphere.dto.PrescriptionDTO;
import com.infosys.medisphere.dto.TimelineEventDTO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Slf4j
@Service
public class DashboardServiceImpl implements DashboardService {

    private final RestTemplate restTemplate;

    public DashboardServiceImpl(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @Override
    public DashboardDTO getPatientDashboard360(String patientId, String doctorId) {
        log.info("Aggregating Patient 360 Dashboard details for Patient: {} queried by Doctor: {}", patientId, doctorId);

        // 1. Verify consent from consent-service
        Boolean consentCheckResult = false;
        try {
            String consentUrl = "http://consent-service/consent/check?patientId=" + patientId 
                    + "&doctorId=" + doctorId + "&resourceType=Vitals";
            
            ResponseEntity<ApiResponse<Boolean>> consentResponse = restTemplate.exchange(
                    consentUrl,
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<ApiResponse<Boolean>>() {}
            );
            
            if (consentResponse.getBody() != null && consentResponse.getBody().isSuccess()) {
                consentCheckResult = consentResponse.getBody().getData();
            }
        } catch (Exception e) {
            log.error("Failed to verify consent from consent-service: {}", e.getMessage());
            // In case of error, assume false for security
        }

        // 2. Fetch Patient Profile from patient-service
        PatientDTO patientProfile = null;
        try {
            String patientUrl = "http://patient-service/patients/" + patientId;
            ResponseEntity<ApiResponse<PatientDTO>> patientResponse = restTemplate.exchange(
                    patientUrl,
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<ApiResponse<PatientDTO>>() {}
            );
            if (patientResponse.getBody() != null && patientResponse.getBody().isSuccess()) {
                patientProfile = patientResponse.getBody().getData();
            }
        } catch (Exception e) {
            log.error("Failed to fetch patient profile from patient-service: {}", e.getMessage());
        }

        // 3. Fetch Digital Twin from digital-twin-service
        HealthTwinDTO digitalTwin = null;
        try {
            String twinUrl = "http://digital-twin-service/twin/" + patientId;
            ResponseEntity<ApiResponse<HealthTwinDTO>> twinResponse = restTemplate.exchange(
                    twinUrl,
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<ApiResponse<HealthTwinDTO>>() {}
            );
            if (twinResponse.getBody() != null && twinResponse.getBody().isSuccess()) {
                digitalTwin = twinResponse.getBody().getData();
            }
        } catch (Exception e) {
            log.error("Failed to fetch digital twin from digital-twin-service: {}", e.getMessage());
        }

        String riskLevel = "UNKNOWN";
        String alertStatus = "UNKNOWN";
        if (digitalTwin != null) {
            riskLevel = digitalTwin.getRiskCategory();
            alertStatus = "HIGH".equalsIgnoreCase(riskLevel) ? "ALERT" : "NORMAL";
        }

        // 4. Fetch Appointments, Labs, and Prescriptions
        java.util.List<AppointmentDTO> appointments = null;
        java.util.List<LabResultDTO> labReports = null;
        java.util.List<PrescriptionDTO> activePrescriptions = null;
        java.util.List<TimelineEventDTO> medicalTimeline = new java.util.ArrayList<>();

        if (consentCheckResult) {
            try {
                // Fetch Appointments
                String apptUrl = "http://patient-service/patients/" + patientId + "/appointments";
                ResponseEntity<ApiResponse<java.util.List<AppointmentDTO>>> apptResponse = restTemplate.exchange(
                        apptUrl, HttpMethod.GET, null, new ParameterizedTypeReference<ApiResponse<java.util.List<AppointmentDTO>>>() {}
                );
                if (apptResponse.getBody() != null && apptResponse.getBody().isSuccess()) {
                    appointments = apptResponse.getBody().getData();
                    if (appointments != null) {
                        appointments.forEach(a -> medicalTimeline.add(TimelineEventDTO.builder()
                                .type("Appointment").event("Appointment with " + a.getDoctorId())
                                .date(a.getAppointmentDate().toString()).doctor(a.getDoctorId()).build()));
                    }
                }

                // Fetch Labs
                String labsUrl = "http://patient-service/patients/" + patientId + "/labs";
                ResponseEntity<ApiResponse<java.util.List<LabResultDTO>>> labsResponse = restTemplate.exchange(
                        labsUrl, HttpMethod.GET, null, new ParameterizedTypeReference<ApiResponse<java.util.List<LabResultDTO>>>() {}
                );
                if (labsResponse.getBody() != null && labsResponse.getBody().isSuccess()) {
                    labReports = labsResponse.getBody().getData();
                    if (labReports != null) {
                        labReports.forEach(l -> medicalTimeline.add(TimelineEventDTO.builder()
                                .type("LabResult").event("Lab Test: " + l.getTest())
                                .date(l.getDate().toString()).doctor("Lab Technician").build()));
                    }
                }

                // Fetch Prescriptions
                String rxUrl = "http://patient-service/patients/" + patientId + "/prescriptions";
                ResponseEntity<ApiResponse<java.util.List<PrescriptionDTO>>> rxResponse = restTemplate.exchange(
                        rxUrl, HttpMethod.GET, null, new ParameterizedTypeReference<ApiResponse<java.util.List<PrescriptionDTO>>>() {}
                );
                if (rxResponse.getBody() != null && rxResponse.getBody().isSuccess()) {
                    activePrescriptions = rxResponse.getBody().getData();
                    if (activePrescriptions != null) {
                        activePrescriptions.forEach(p -> medicalTimeline.add(TimelineEventDTO.builder()
                                .type("Prescription").event("Prescribed: " + p.getMedication())
                                .date(java.time.LocalDate.now().toString()).doctor(p.getDoctorId()).build()));
                    }
                }

            } catch (Exception e) {
                log.error("Failed to fetch additional patient records: {}", e.getMessage());
            }
        }

        return DashboardDTO.builder()
                .patientId(patientId)
                .patientProfile(patientProfile)
                .digitalTwin(digitalTwin)
                .consentCheckResult(consentCheckResult)
                .healthRiskLevel(riskLevel)
                .alertStatusSummary(alertStatus)
                .appointments(appointments)
                .labReports(labReports)
                .activePrescriptions(activePrescriptions)
                .medicalTimeline(medicalTimeline)
                .build();
    }
}
