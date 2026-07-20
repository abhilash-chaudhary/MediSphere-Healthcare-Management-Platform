package com.infosys.medisphere.service;

import com.infosys.medisphere.dto.VitalDTO;
import com.infosys.medisphere.entity.WearableDevice;
import java.util.List;

public interface WearableService {
    WearableDevice registerDevice(WearableDevice device);
    void syncVitals(String deviceId, VitalDTO vitalDTO);
    List<WearableDevice> getDevicesByPatientId(String patientId);
}
