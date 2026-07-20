package com.infosys.medisphere.service;

import com.infosys.medisphere.dto.ConsentDTO;
import com.infosys.medisphere.entity.Consent;
import com.infosys.medisphere.exception.InvalidConsentException;
import com.infosys.medisphere.exception.ResourceNotFoundException;
import com.infosys.medisphere.repository.ConsentRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
public class ConsentServiceImpl implements ConsentService {

    private final ConsentRepository consentRepository;

    public ConsentServiceImpl(ConsentRepository consentRepository) {
        this.consentRepository = consentRepository;
    }

    @Override
    public ConsentDTO grantConsent(ConsentDTO consentDTO) {
        log.info("Granting consent for Patient: {} to Doctor: {}", consentDTO.getPatientId(), consentDTO.getDoctorId());

        Optional<Consent> existingConsent = consentRepository.findByPatientIdAndDoctorId(
                consentDTO.getPatientId(), consentDTO.getDoctorId());

        Consent consent;
        if (existingConsent.isPresent()) {
            consent = existingConsent.get();
            consent.setStatus("GRANTED");
            consent.setGrantedAt(LocalDateTime.now());
            consent.setExpiresAt(consentDTO.getExpiresAt() != null ? consentDTO.getExpiresAt() : LocalDateTime.now().plusMonths(6));
            consent.setAuthorizedResourceTypes(consentDTO.getAuthorizedResourceTypes());
        } else {
            consent = Consent.builder()
                    .patientId(consentDTO.getPatientId())
                    .doctorId(consentDTO.getDoctorId())
                    .status("GRANTED")
                    .grantedAt(LocalDateTime.now())
                    .expiresAt(consentDTO.getExpiresAt() != null ? consentDTO.getExpiresAt() : LocalDateTime.now().plusMonths(6))
                    .authorizedResourceTypes(consentDTO.getAuthorizedResourceTypes())
                    .build();
        }

        Consent saved = consentRepository.save(consent);
        return mapToDto(saved);
    }

    @Override
    public ConsentDTO revokeConsent(String patientId, String doctorId) {
        log.info("Revoking consent for Patient: {} from Doctor: {}", patientId, doctorId);
        Consent consent = consentRepository.findByPatientIdAndDoctorId(patientId, doctorId)
                .orElseThrow(() -> new ResourceNotFoundException("No consent record found for Patient and Doctor"));

        consent.setStatus("REVOKED");
        Consent saved = consentRepository.save(consent);
        return mapToDto(saved);
    }

    @Override
    public boolean checkConsent(String patientId, String doctorId, String resourceType) {
        log.info("Checking consent for Doctor: {} to access Patient: {} data: {}", doctorId, patientId, resourceType);
        
        Optional<Consent> consentOpt = consentRepository.findByPatientIdAndDoctorId(patientId, doctorId);
        if (consentOpt.isEmpty()) {
            return false;
        }

        Consent consent = consentOpt.get();
        if (!"GRANTED".equalsIgnoreCase(consent.getStatus())) {
            return false;
        }

        if (consent.getExpiresAt() != null && consent.getExpiresAt().isBefore(LocalDateTime.now())) {
            consent.setStatus("EXPIRED");
            consentRepository.save(consent);
            return false;
        }

        if (consent.getAuthorizedResourceTypes() == null) {
            return false;
        }

        return consent.getAuthorizedResourceTypes().stream()
                .anyMatch(type -> type.equalsIgnoreCase(resourceType) || "*".equals(type));
    }

    @Override
    public List<ConsentDTO> getConsentHistory(String patientId) {
        log.info("Retrieving consent history for Patient: {}", patientId);
        List<Consent> history = consentRepository.findByPatientId(patientId);
        return history.stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    private ConsentDTO mapToDto(Consent consent) {
        return ConsentDTO.builder()
                .id(consent.getId())
                .patientId(consent.getPatientId())
                .doctorId(consent.getDoctorId())
                .status(consent.getStatus())
                .grantedAt(consent.getGrantedAt())
                .expiresAt(consent.getExpiresAt())
                .authorizedResourceTypes(consent.getAuthorizedResourceTypes())
                .build();
    }
}
