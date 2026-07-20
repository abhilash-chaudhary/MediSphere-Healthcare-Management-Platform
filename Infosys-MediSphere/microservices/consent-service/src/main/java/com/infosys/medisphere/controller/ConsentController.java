package com.infosys.medisphere.controller;

import com.infosys.medisphere.dto.ApiResponse;
import com.infosys.medisphere.dto.ConsentDTO;
import com.infosys.medisphere.service.ConsentService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/consent")
public class ConsentController {

    private final ConsentService consentService;

    public ConsentController(ConsentService consentService) {
        this.consentService = consentService;
    }

    @PostMapping("/grant")
    public ApiResponse<ConsentDTO> grantConsent(@RequestBody ConsentDTO consentDTO) {
        ConsentDTO granted = consentService.grantConsent(consentDTO);
        return ApiResponse.success(granted, "Consent granted successfully");
    }

    @PostMapping("/revoke")
    public ApiResponse<ConsentDTO> revokeConsent(@RequestParam String patientId, @RequestParam String doctorId) {
        ConsentDTO revoked = consentService.revokeConsent(patientId, doctorId);
        return ApiResponse.success(revoked, "Consent revoked successfully");
    }

    @GetMapping("/check")
    public ApiResponse<Boolean> checkConsent(@RequestParam String patientId, @RequestParam String doctorId, @RequestParam String resourceType) {
        boolean accessGranted = consentService.checkConsent(patientId, doctorId, resourceType);
        String msg = accessGranted ? "Access authorized under HIPAA rules" : "Access denied or consent missing/expired";
        return ApiResponse.success(accessGranted, msg);
    }

    @GetMapping("/history")
    public ApiResponse<List<ConsentDTO>> getHistory(@RequestParam String patientId) {
        List<ConsentDTO> list = consentService.getConsentHistory(patientId);
        return ApiResponse.success(list, "Consent history retrieved");
    }
}
