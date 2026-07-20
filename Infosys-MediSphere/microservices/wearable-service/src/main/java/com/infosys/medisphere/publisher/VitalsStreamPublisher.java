package com.infosys.medisphere.publisher;

import com.infosys.medisphere.constant.KafkaTopics;
import com.infosys.medisphere.dto.VitalDTO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class VitalsStreamPublisher {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public VitalsStreamPublisher(KafkaTemplate<String, Object> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void publishVitals(VitalDTO vitalDTO) {
        log.info("Streaming live vitals for Patient ID: {} (HR: {}, BP: {})", 
                vitalDTO.getPatientId(), vitalDTO.getHeartRate(), vitalDTO.getBloodPressure());
        kafkaTemplate.send(KafkaTopics.PATIENT_VITALS, vitalDTO.getPatientId(), vitalDTO);
    }
}
