package com.infosys.medisphere.service;

import com.infosys.medisphere.dto.DashboardDTO;

public interface DashboardService {
    DashboardDTO getPatientDashboard360(String patientId, String doctorId);
}
