package com.infosys.medisphere.repository;

import com.infosys.medisphere.entity.LabResult;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LabResultRepository extends MongoRepository<LabResult, String> {
    List<LabResult> findByPatientId(String patientId);
}
