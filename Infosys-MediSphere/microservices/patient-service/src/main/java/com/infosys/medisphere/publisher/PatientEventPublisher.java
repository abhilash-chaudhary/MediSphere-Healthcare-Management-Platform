package com.infosys.medisphere.publisher;

import com.infosys.medisphere.constant.KafkaTopics;
import com.infosys.medisphere.dto.PatientDTO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class PatientEventPublisher {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public PatientEventPublisher(KafkaTemplate<String, Object> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void publishPatientCreated(PatientDTO patientDTO) {
        log.info("Publishing patient-created event for ID: {}", patientDTO.getId());
        kafkaTemplate.send(KafkaTopics.PATIENT_CREATED, patientDTO.getId(), patientDTO);
    }

    public void publishPatientUpdated(PatientDTO patientDTO) {
        log.info("Publishing patient-updated event for ID: {}", patientDTO.getId());
        kafkaTemplate.send(KafkaTopics.PATIENT_UPDATED, patientDTO.getId(), patientDTO);
    }
}
