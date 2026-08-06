package com.infosys.medisphere.service;

import com.infosys.medisphere.dto.PatientDTO;
import com.infosys.medisphere.dto.AppointmentDTO;
import com.infosys.medisphere.dto.LabResultDTO;
import com.infosys.medisphere.dto.PrescriptionDTO;
import java.util.List;

public interface PatientService {
    PatientDTO createPatient(PatientDTO patientDTO);
    PatientDTO getPatientById(String id);
    PatientDTO updatePatient(String id, PatientDTO patientDTO);
    void deletePatient(String id);
    List<PatientDTO> searchPatients(String query);
    List<PatientDTO> getAllPatients();
    
    // Assignment operations
    void assignPatientToDoctor(String patientId, String doctorUsername, String assignedBy);
    void unassignPatientFromDoctor(String patientId, String doctorUsername);
    List<PatientDTO> getAssignedPatients(String doctorUsername);
    List<PatientDTO> getUnassignedPatients(String doctorUsername);

    List<AppointmentDTO> getAppointmentsByPatientId(String patientId);
    List<LabResultDTO> getLabResultsByPatientId(String patientId);
    List<PrescriptionDTO> getPrescriptionsByPatientId(String patientId);
}
