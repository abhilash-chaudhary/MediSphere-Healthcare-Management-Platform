package com.infosys.medisphere.repository;

import com.infosys.medisphere.entity.ModelVersion;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ModelRepository extends MongoRepository<ModelVersion, String> {
    Optional<ModelVersion> findByVersion(String version);
    Optional<ModelVersion> findFirstByStatusOrderByCreatedDateDesc(String status);
    void deleteByVersion(String version);
}
