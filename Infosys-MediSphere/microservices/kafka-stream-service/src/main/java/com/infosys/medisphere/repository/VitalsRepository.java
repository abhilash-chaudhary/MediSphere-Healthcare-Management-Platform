package com.infosys.medisphere.repository;

import com.infosys.medisphere.entity.VitalRecord;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface VitalsRepository extends MongoRepository<VitalRecord, String> {
    List<VitalRecord> findByPatientId(String patientId);
    List<VitalRecord> findByPatientIdAndStatus(String patientId, String status);
}
