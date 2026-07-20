package com.infosys.medisphere.controller;

import com.infosys.medisphere.dto.ApiResponse;
import com.infosys.medisphere.dto.HealthTwinDTO;
import com.infosys.medisphere.service.DigitalTwinService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/twin")
public class DigitalTwinController {

    private final DigitalTwinService twinService;

    public DigitalTwinController(DigitalTwinService twinService) {
        this.twinService = twinService;
    }

    @PostMapping("/create")
    public ApiResponse<HealthTwinDTO> createTwin(@RequestParam String patientId) {
        HealthTwinDTO twin = twinService.createTwin(patientId);
        return ApiResponse.success(twin, "Digital Health Twin created successfully");
    }

    @PutMapping("/update")
    public ApiResponse<HealthTwinDTO> updateTwin(@RequestParam String patientId, @RequestBody HealthTwinDTO dto) {
        HealthTwinDTO twin = twinService.updateTwin(patientId, dto);
        return ApiResponse.success(twin, "Digital Health Twin updated successfully");
    }

    @GetMapping("/{patientId}")
    public ApiResponse<HealthTwinDTO> getTwin(@PathVariable String patientId) {
        HealthTwinDTO twin = twinService.getTwinByPatientId(patientId);
        return ApiResponse.success(twin, "Digital Health Twin retrieved successfully");
    }

    @PostMapping("/rebuild")
    public ApiResponse<HealthTwinDTO> rebuildTwin(@RequestParam String patientId) {
        HealthTwinDTO twin = twinService.rebuildTwin(patientId);
        return ApiResponse.success(twin, "Digital Health Twin analysis rebuilt successfully");
    }
}
