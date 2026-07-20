package com.infosys.medisphere.validator;

import ca.uhn.fhir.context.FhirContext;
import ca.uhn.fhir.parser.IParser;
import com.infosys.medisphere.exception.FhirValidationException;
import lombok.extern.slf4j.Slf4j;
import org.hl7.fhir.r4.model.Patient;
import org.hl7.fhir.r4.model.Observation;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class FhirResourceValidator {

    private final FhirContext fhirContext = FhirContext.forR4();

    public void validatePatient(String fhirJson) {
        try {
            IParser parser = fhirContext.newJsonParser();
            Patient patient = parser.parseResource(Patient.class, fhirJson);
            if (patient.getName().isEmpty()) {
                throw new FhirValidationException("Patient resource must contain a valid name property");
            }
            log.info("FHIR Patient resource format validated successfully for ID: {}", patient.getIdElement().getIdPart());
        } catch (Exception e) {
            throw new FhirValidationException("Invalid FHIR Patient JSON: " + e.getMessage());
        }
    }

    public void validateObservation(String fhirJson) {
        try {
            IParser parser = fhirContext.newJsonParser();
            Observation observation = parser.parseResource(Observation.class, fhirJson);
            if (observation.getCode() == null || observation.getCode().getCoding().isEmpty()) {
                throw new FhirValidationException("Observation resource must contain a valid observation code");
            }
            log.info("FHIR Observation resource format validated successfully for ID: {}", observation.getIdElement().getIdPart());
        } catch (Exception e) {
            throw new FhirValidationException("Invalid FHIR Observation JSON: " + e.getMessage());
        }
    }
}
