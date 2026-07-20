package com.infosys.medisphere.repository;

import com.infosys.medisphere.entity.RiskPrediction;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * MongoDB repository for risk prediction documents.
 */
@Repository
public interface PredictionRepository extends MongoRepository<RiskPrediction, String> {

    List<RiskPrediction> findByPatientIdOrderByPredictionDateDesc(String patientId);

    Optional<RiskPrediction> findFirstByPatientIdOrderByPredictionDateDesc(String patientId);

    List<RiskPrediction> findByPatientIdAndRiskType(String patientId, String riskType);
}
