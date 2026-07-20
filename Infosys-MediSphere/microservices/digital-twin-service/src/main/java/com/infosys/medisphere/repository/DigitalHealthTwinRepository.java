package com.infosys.medisphere.repository;

import com.infosys.medisphere.entity.DigitalHealthTwin;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.Optional;

public interface DigitalHealthTwinRepository extends MongoRepository<DigitalHealthTwin, String> {
    Optional<DigitalHealthTwin> findByPatientId(String patientId);
}
