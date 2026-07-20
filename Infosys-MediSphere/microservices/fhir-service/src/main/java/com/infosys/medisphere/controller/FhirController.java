package com.infosys.medisphere.controller;

import com.infosys.medisphere.dto.ApiResponse;
import com.infosys.medisphere.service.FhirService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/fhir")
public class FhirController {

    private final FhirService fhirService;

    public FhirController(FhirService fhirService) {
        this.fhirService = fhirService;
    }

    @GetMapping("/patient/{id}")
    public ApiResponse<String> getPatientResource(@PathVariable String id) {
        String fhirJson = fhirService.getPatientResource(id);
        return ApiResponse.success(fhirJson, "Patient FHIR Resource generated successfully");
    }

    @GetMapping("/observation/{id}")
    public ApiResponse<String> getObservationResource(@PathVariable String id) {
        String fhirJson = fhirService.getObservationResource(id);
        return ApiResponse.success(fhirJson, "Observation FHIR Resource generated successfully");
    }

    @GetMapping("/medication/{id}")
    public ApiResponse<String> getMedicationResource(@PathVariable String id) {
        String fhirJson = fhirService.getMedicationResource(id);
        return ApiResponse.success(fhirJson, "Medication FHIR Resource generated successfully");
    }

    @PostMapping("/sync/{id}")
    public ApiResponse<Boolean> syncFhirRecord(@PathVariable String id) {
        boolean result = fhirService.syncFhirRecord(id);
        return ApiResponse.success(result, "FHIR records synced with external hospital APIs successfully");
    }
}
