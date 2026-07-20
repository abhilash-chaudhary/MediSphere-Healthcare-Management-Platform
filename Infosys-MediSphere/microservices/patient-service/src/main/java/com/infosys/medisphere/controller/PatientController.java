package com.infosys.medisphere.controller;

import com.infosys.medisphere.dto.ApiResponse;
import com.infosys.medisphere.dto.PatientDTO;
import com.infosys.medisphere.dto.AppointmentDTO;
import com.infosys.medisphere.dto.LabResultDTO;
import com.infosys.medisphere.dto.PrescriptionDTO;
import com.infosys.medisphere.service.PatientService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/patients")
public class PatientController {

    private final PatientService patientService;

    public PatientController(PatientService patientService) {
        this.patientService = patientService;
    }

    @PostMapping
    public ApiResponse<PatientDTO> createPatient(@Valid @RequestBody PatientDTO patientDTO) {
        PatientDTO created = patientService.createPatient(patientDTO);
        return ApiResponse.success(created, "Patient record created successfully");
    }

    @GetMapping("/{id}")
    public ApiResponse<PatientDTO> getPatientById(@PathVariable String id) {
        PatientDTO patient = patientService.getPatientById(id);
        return ApiResponse.success(patient, "Patient profile retrieved successfully");
    }

    @PutMapping("/{id}")
    public ApiResponse<PatientDTO> updatePatient(@PathVariable String id, @Valid @RequestBody PatientDTO patientDTO) {
        PatientDTO updated = patientService.updatePatient(id, patientDTO);
        return ApiResponse.success(updated, "Patient profile updated successfully");
    }

    @PutMapping("/update")
    public ApiResponse<PatientDTO> updatePatientQuery(@RequestParam String id, @Valid @RequestBody PatientDTO patientDTO) {
        PatientDTO updated = patientService.updatePatient(id, patientDTO);
        return ApiResponse.success(updated, "Patient profile updated successfully");
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> deletePatient(@PathVariable String id) {
        patientService.deletePatient(id);
        return ApiResponse.success(null, "Patient record deleted successfully");
    }

    @GetMapping("/search")
    public ApiResponse<List<PatientDTO>> searchPatients(@RequestParam String query) {
        List<PatientDTO> list = patientService.searchPatients(query);
        return ApiResponse.success(list, "Patient search completed");
    }

    @GetMapping("/{id}/appointments")
    public ApiResponse<List<AppointmentDTO>> getAppointments(@PathVariable String id) {
        List<AppointmentDTO> list = patientService.getAppointmentsByPatientId(id);
        return ApiResponse.success(list, "Appointments retrieved successfully");
    }

    @GetMapping("/{id}/labs")
    public ApiResponse<List<LabResultDTO>> getLabResults(@PathVariable String id) {
        List<LabResultDTO> list = patientService.getLabResultsByPatientId(id);
        return ApiResponse.success(list, "Lab results retrieved successfully");
    }

    @GetMapping("/{id}/prescriptions")
    public ApiResponse<List<PrescriptionDTO>> getPrescriptions(@PathVariable String id) {
        List<PrescriptionDTO> list = patientService.getPrescriptionsByPatientId(id);
        return ApiResponse.success(list, "Prescriptions retrieved successfully");
    }
}
