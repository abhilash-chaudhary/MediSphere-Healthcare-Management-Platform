package com.infosys.medisphere.repository;

import com.infosys.medisphere.entity.Consent;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
import java.util.Optional;

public interface ConsentRepository extends MongoRepository<Consent, String> {
    Optional<Consent> findByPatientIdAndDoctorId(String patientId, String doctorId);
    List<Consent> findByPatientId(String patientId);
    List<Consent> findByStatusAndExpiresAtBefore(String status, java.time.LocalDateTime now);
}
