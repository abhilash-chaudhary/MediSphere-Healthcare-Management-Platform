package com.infosys.medisphere.validator;

import com.infosys.medisphere.dto.ApiResponse;
import com.infosys.medisphere.exception.InvalidConsentException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Slf4j
@Component
public class ConsentValidator {

    private final RestTemplate restTemplate;

    public ConsentValidator(@Lazy RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public void validateAccess(String patientId, String doctorId, String resourceType) {
        log.info("Consent Verification: Doctor {} requesting {}'s resource of type {}", doctorId, patientId, resourceType);
        
        try {
            String consentUrl = "http://consent-service/consent/check?patientId=" + patientId 
                    + "&doctorId=" + doctorId + "&resourceType=" + resourceType;
            
            ResponseEntity<ApiResponse<Boolean>> response = restTemplate.exchange(
                    consentUrl,
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<ApiResponse<Boolean>>() {}
            );
            
            if (response.getBody() != null && response.getBody().isSuccess()) {
                Boolean isGranted = response.getBody().getData();
                if (Boolean.FALSE.equals(isGranted)) {
                    throw new InvalidConsentException("Access denied: active HIPAA consent record missing or expired for Patient ID: " + patientId);
                }
            } else {
                throw new InvalidConsentException("Consent validation request failed to parse correctly");
            }
        } catch (InvalidConsentException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to invoke consent check on consent-service: {}", e.getMessage());
            throw new InvalidConsentException("Consent verification check service is unreachable: access denied");
        }
    }
}
