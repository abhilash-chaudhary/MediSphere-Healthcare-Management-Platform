package com.infosys.medisphere.listener;

import com.infosys.medisphere.constant.KafkaTopics;
import com.infosys.medisphere.dto.VitalDTO;
import com.infosys.medisphere.entity.VitalRecord;
import com.infosys.medisphere.publisher.AlertsPublisher;
import com.infosys.medisphere.repository.VitalsRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Slf4j
@Component
public class VitalsConsumer {

    private final VitalsRepository vitalsRepository;
    private final AlertsPublisher alertsPublisher;

    public VitalsConsumer(VitalsRepository vitalsRepository, AlertsPublisher alertsPublisher) {
        this.vitalsRepository = vitalsRepository;
        this.alertsPublisher = alertsPublisher;
    }

    @KafkaListener(topics = KafkaTopics.PATIENT_VITALS, groupId = "medisphere-stream-group")
    public void consumeVitals(VitalDTO vitalDTO) {
        log.info("Received vitals stream event: {}", vitalDTO);

        String status = "NORMAL";
        StringBuilder alertMessage = new StringBuilder();

        // Standard biometric boundary checks
        if (vitalDTO.getHeartRate() != null && (vitalDTO.getHeartRate() > 120 || vitalDTO.getHeartRate() < 50)) {
            status = "CRITICAL";
            alertMessage.append("Abnormal Heart Rate detected: ").append(vitalDTO.getHeartRate()).append(" bpm. ");
        }

        if (vitalDTO.getOxygenLevel() != null && vitalDTO.getOxygenLevel() < 90.0) {
            status = "CRITICAL";
            alertMessage.append("Low Oxygen Level (SpO2) detected: ").append(vitalDTO.getOxygenLevel()).append("%. ");
        }

        VitalRecord record = VitalRecord.builder()
                .patientId(vitalDTO.getPatientId())
                .heartRate(vitalDTO.getHeartRate())
                .bloodPressure(vitalDTO.getBloodPressure())
                .temperature(vitalDTO.getTemperature())
                .oxygenLevel(vitalDTO.getOxygenLevel())
                .caloriesBurned(vitalDTO.getCaloriesBurned())
                .sleepMinutes(vitalDTO.getSleepMinutes())
                .steps(vitalDTO.getSteps())
                .recordedAt(vitalDTO.getRecordedAt() != null ? vitalDTO.getRecordedAt() : LocalDateTime.now())
                .status(status)
                .build();

        vitalsRepository.save(record);

        if ("CRITICAL".equals(status)) {
            alertsPublisher.publishCriticalAlert(vitalDTO.getPatientId(), alertMessage.toString());
        }
    }
}
