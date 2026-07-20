package com.infosys.medisphere.controller;

import com.infosys.medisphere.dto.ApiResponse;
import com.infosys.medisphere.dto.DashboardDTO;
import com.infosys.medisphere.service.DashboardService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/patient360")
    public ApiResponse<DashboardDTO> getPatient360(
            @RequestParam String patientId,
            @RequestParam String doctorId) {
        DashboardDTO dashboard = dashboardService.getPatientDashboard360(patientId, doctorId);
        return ApiResponse.success(dashboard, "Patient 360 degree dashboard compiled successfully");
    }
}
