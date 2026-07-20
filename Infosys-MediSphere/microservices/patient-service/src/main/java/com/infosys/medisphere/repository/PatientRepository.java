package com.infosys.medisphere.repository;

import com.infosys.medisphere.entity.Patient;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import java.util.List;

public interface PatientRepository extends MongoRepository<Patient, String> {
    List<Patient> findByLastNameIgnoreCase(String lastName);
    
    @Query("{'$or':[ {'firstName': { $regex: ?0, $options: 'i' }}, {'lastName': { $regex: ?0, $options: 'i' }} ]}")
    List<Patient> searchByName(String nameQuery);
}
