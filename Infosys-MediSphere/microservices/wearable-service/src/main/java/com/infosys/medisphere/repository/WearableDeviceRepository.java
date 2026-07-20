package com.infosys.medisphere.repository;

import com.infosys.medisphere.entity.WearableDevice;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
import java.util.Optional;

public interface WearableDeviceRepository extends MongoRepository<WearableDevice, String> {
    Optional<WearableDevice> findByDeviceId(String deviceId);
    List<WearableDevice> findByPatientId(String patientId);
}
