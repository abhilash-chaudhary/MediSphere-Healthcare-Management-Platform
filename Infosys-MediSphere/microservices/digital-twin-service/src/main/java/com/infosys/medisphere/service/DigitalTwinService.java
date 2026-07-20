package com.infosys.medisphere.service;

import com.infosys.medisphere.dto.HealthTwinDTO;

public interface DigitalTwinService {
    HealthTwinDTO createTwin(String patientId);
    HealthTwinDTO updateTwin(String patientId, HealthTwinDTO healthTwinDTO);
    HealthTwinDTO getTwinByPatientId(String patientId);
    HealthTwinDTO rebuildTwin(String patientId);
}
