package com.infosys.medisphere.service;

import com.infosys.medisphere.dto.VitalDTO;
import com.infosys.medisphere.entity.WearableDevice;
import com.infosys.medisphere.exception.ResourceNotFoundException;
import com.infosys.medisphere.publisher.VitalsStreamPublisher;
import com.infosys.medisphere.repository.WearableDeviceRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
public class WearableServiceImpl implements WearableService {

    private final WearableDeviceRepository deviceRepository;
    private final VitalsStreamPublisher vitalsPublisher;

    public WearableServiceImpl(WearableDeviceRepository deviceRepository, VitalsStreamPublisher vitalsPublisher) {
        this.deviceRepository = deviceRepository;
        this.vitalsPublisher = vitalsPublisher;
    }

    @Override
    public WearableDevice registerDevice(WearableDevice device) {
        log.info("Registering wearable device: {} for Patient ID: {}", device.getDeviceId(), device.getPatientId());
        device.setRegisteredAt(LocalDateTime.now());
        device.setStatus("ACTIVE");
        return deviceRepository.save(device);
    }

    @Override
    public void syncVitals(String deviceId, VitalDTO vitalDTO) {
        log.info("Syncing live vitals from Wearable Device ID: {}", deviceId);
        WearableDevice device = deviceRepository.findByDeviceId(deviceId)
                .orElseThrow(() -> new ResourceNotFoundException("Wearable Device not registered: " + deviceId));

        if (!"ACTIVE".equalsIgnoreCase(device.getStatus())) {
            throw new IllegalStateException("Wearable device is currently disconnected or inactive");
        }

        // Set missing fields in the streaming DTO
        vitalDTO.setPatientId(device.getPatientId());
        if (vitalDTO.getRecordedAt() == null) {
            vitalDTO.setRecordedAt(LocalDateTime.now());
        }

        // Stream downstream using Kafka Publisher
        vitalsPublisher.publishVitals(vitalDTO);
    }

    @Override
    public List<WearableDevice> getDevicesByPatientId(String patientId) {
        log.info("Fetching devices linked to Patient ID: {}", patientId);
        return deviceRepository.findByPatientId(patientId);
    }
}
