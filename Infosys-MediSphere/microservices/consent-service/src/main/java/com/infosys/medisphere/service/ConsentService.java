package com.infosys.medisphere.service;

import com.infosys.medisphere.dto.ConsentDTO;
import java.util.List;

public interface ConsentService {
    ConsentDTO grantConsent(ConsentDTO consentDTO);
    ConsentDTO revokeConsent(String patientId, String doctorId);
    boolean checkConsent(String patientId, String doctorId, String resourceType);
    List<ConsentDTO> getConsentHistory(String patientId);
}
