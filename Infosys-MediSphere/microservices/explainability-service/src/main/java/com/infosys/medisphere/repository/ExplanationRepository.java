package com.infosys.medisphere.repository;

import com.infosys.medisphere.entity.Explanation;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ExplanationRepository extends MongoRepository<Explanation, String> {
    Optional<Explanation> findFirstByPatientIdOrderByCreatedAtDesc(String patientId);
}
