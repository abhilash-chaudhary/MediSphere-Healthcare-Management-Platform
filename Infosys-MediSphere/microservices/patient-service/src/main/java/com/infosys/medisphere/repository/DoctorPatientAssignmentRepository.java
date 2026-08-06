package com.infosys.medisphere.repository;

import com.infosys.medisphere.entity.DoctorPatientAssignment;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface DoctorPatientAssignmentRepository extends MongoRepository<DoctorPatientAssignment, String> {
    List<DoctorPatientAssignment> findByDoctorUsername(String doctorUsername);
    List<DoctorPatientAssignment> findByPatientId(String patientId);
    Optional<DoctorPatientAssignment> findByDoctorUsernameAndPatientId(String doctorUsername, String patientId);
    void deleteByDoctorUsernameAndPatientId(String doctorUsername, String patientId);
}
