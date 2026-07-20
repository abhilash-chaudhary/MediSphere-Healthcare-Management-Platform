package com.infosys.medisphere.service;

import com.infosys.medisphere.dto.PatientDTO;
import com.infosys.medisphere.dto.AppointmentDTO;
import com.infosys.medisphere.dto.LabResultDTO;
import com.infosys.medisphere.dto.PrescriptionDTO;
import com.infosys.medisphere.entity.Patient;
import com.infosys.medisphere.entity.Appointment;
import com.infosys.medisphere.entity.LabResult;
import com.infosys.medisphere.entity.Prescription;
import com.infosys.medisphere.exception.ResourceNotFoundException;
import com.infosys.medisphere.mapper.PatientMapper;
import com.infosys.medisphere.publisher.PatientEventPublisher;
import com.infosys.medisphere.repository.PatientRepository;
import com.infosys.medisphere.repository.AppointmentRepository;
import com.infosys.medisphere.repository.LabResultRepository;
import com.infosys.medisphere.repository.PrescriptionRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
public class PatientServiceImpl implements PatientService {

    private final PatientRepository patientRepository;
    private final AppointmentRepository appointmentRepository;
    private final LabResultRepository labResultRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final PatientMapper patientMapper;
    private final PatientEventPublisher eventPublisher;

    public PatientServiceImpl(PatientRepository patientRepository, 
                              AppointmentRepository appointmentRepository,
                              LabResultRepository labResultRepository,
                              PrescriptionRepository prescriptionRepository,
                              PatientMapper patientMapper,
                              PatientEventPublisher eventPublisher) {
        this.patientRepository = patientRepository;
        this.appointmentRepository = appointmentRepository;
        this.labResultRepository = labResultRepository;
        this.prescriptionRepository = prescriptionRepository;
        this.patientMapper = patientMapper;
        this.eventPublisher = eventPublisher;
    }

    @Override
    public PatientDTO createPatient(PatientDTO patientDTO) {
        log.info("Creating patient with email: {}", patientDTO.getEmail());
        Patient patient = patientMapper.toEntity(patientDTO);
        Patient savedPatient = patientRepository.save(patient);
        PatientDTO savedDTO = patientMapper.toDto(savedPatient);

        // Publish Event
        eventPublisher.publishPatientCreated(savedDTO);

        return savedDTO;
    }

    @Override
    public PatientDTO getPatientById(String id) {
        log.info("Fetching patient with ID: {}", id);
        Patient patient = patientRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found with ID: " + id));
        return patientMapper.toDto(patient);
    }

    @Override
    public PatientDTO updatePatient(String id, PatientDTO patientDTO) {
        log.info("Updating patient with ID: {}", id);
        Patient existingPatient = patientRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found with ID: " + id));

        existingPatient.setFirstName(patientDTO.getFirstName());
        existingPatient.setLastName(patientDTO.getLastName());
        existingPatient.setEmail(patientDTO.getEmail());
        existingPatient.setPhoneNumber(patientDTO.getPhoneNumber());
        existingPatient.setDateOfBirth(patientDTO.getDateOfBirth());
        existingPatient.setGender(patientDTO.getGender());
        existingPatient.setAddress(patientDTO.getAddress());
        existingPatient.setEmergencyContactName(patientDTO.getEmergencyContactName());
        existingPatient.setEmergencyContactPhone(patientDTO.getEmergencyContactPhone());
        existingPatient.setMedicalHistory(patientDTO.getMedicalHistory());
        existingPatient.setInsuranceProvider(patientDTO.getInsuranceProvider());
        existingPatient.setInsurancePolicyNumber(patientDTO.getInsurancePolicyNumber());

        Patient savedPatient = patientRepository.save(existingPatient);
        PatientDTO savedDTO = patientMapper.toDto(savedPatient);

        // Publish Event
        eventPublisher.publishPatientUpdated(savedDTO);

        return savedDTO;
    }

    @Override
    public void deletePatient(String id) {
        log.info("Deleting patient with ID: {}", id);
        if (!patientRepository.existsById(id)) {
            throw new ResourceNotFoundException("Patient not found with ID: " + id);
        }
        patientRepository.deleteById(id);
    }

    @Override
    public List<PatientDTO> searchPatients(String query) {
        log.info("Searching patients with query: {}", query);
        List<Patient> patients = patientRepository.searchByName(query);
        return patients.stream()
                .map(patientMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<AppointmentDTO> getAppointmentsByPatientId(String patientId) {
        return appointmentRepository.findByPatientId(patientId).stream()
                .map(a -> AppointmentDTO.builder()
                        .id(a.getId())
                        .patientId(a.getPatientId())
                        .doctorId(a.getDoctorId())
                        .appointmentDate(a.getAppointmentDate())
                        .status(a.getStatus())
                        .notes(a.getNotes())
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    public List<LabResultDTO> getLabResultsByPatientId(String patientId) {
        return labResultRepository.findByPatientId(patientId).stream()
                .map(l -> LabResultDTO.builder()
                        .test(l.getTest())
                        .value(l.getValue())
                        .range(l.getRange())
                        .status(l.getStatus())
                        .date(l.getDate())
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    public List<PrescriptionDTO> getPrescriptionsByPatientId(String patientId) {
        return prescriptionRepository.findByPatientId(patientId).stream()
                .map(p -> PrescriptionDTO.builder()
                        .medication(p.getMedication())
                        .dosage(p.getDosage())
                        .frequency(p.getFrequency())
                        .status(p.getStatus())
                        .doctorId(p.getDoctorId())
                        .build())
                .collect(Collectors.toList());
    }
}
