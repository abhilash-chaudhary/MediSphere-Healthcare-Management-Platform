package com.infosys.medisphere.service;

import com.infosys.medisphere.entity.VitalRecord;
import com.infosys.medisphere.repository.VitalsRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
public class StreamReplayServiceImpl implements StreamReplayService {

    private final VitalsRepository vitalsRepository;

    public StreamReplayServiceImpl(VitalsRepository vitalsRepository) {
        this.vitalsRepository = vitalsRepository;
    }

    @Override
    public void replayVitalsStream(String patientId) {
        log.info("Starting Event Replay cycle for Patient ID: {}", patientId);
        List<VitalRecord> records = vitalsRepository.findByPatientId(patientId);
        
        log.info("Found {} vital records to replay.", records.size());
        for (VitalRecord record : records) {
            log.info("Replaying vital record: {} (Timestamp: {})", record.getId(), record.getRecordedAt());
            // In production, this would re-publish to Kafka to trigger other consumers
        }
    }

    @Override
    public void routeToDeadLetterQueue(String rawMessage, String reason) {
        log.error("routing unparseable/error-prone streaming payload to DLQ: [Reason: {}] Payload: {}", reason, rawMessage);
        // Save payload to a 'dead_letter_records' MongoDB collection or Kafka DLQ topic
    }
}
