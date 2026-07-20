package com.infosys.medisphere.repository;

import com.infosys.medisphere.entity.Provider;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface ProviderRepository extends MongoRepository<Provider, String> {
    List<Provider> findByTypeIgnoreCase(String type);
    List<Provider> findBySpecialtyIgnoreCase(String specialty);
}
