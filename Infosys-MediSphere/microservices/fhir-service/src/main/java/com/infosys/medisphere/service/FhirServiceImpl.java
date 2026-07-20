package com.infosys.medisphere.service;

import ca.uhn.fhir.context.FhirContext;
import ca.uhn.fhir.parser.IParser;
import com.infosys.medisphere.exception.ResourceNotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.hl7.fhir.r4.model.*;
import org.springframework.stereotype.Service;

import java.util.Date;

@Slf4j
@Service
public class FhirServiceImpl implements FhirService {

    private final FhirContext fhirContext = FhirContext.forR4();
    private final com.infosys.medisphere.validator.FhirResourceValidator fhirResourceValidator;

    public FhirServiceImpl(com.infosys.medisphere.validator.FhirResourceValidator fhirResourceValidator) {
        this.fhirResourceValidator = fhirResourceValidator;
    }

    @Override
    public String getPatientResource(String id) {
        log.info("Generating FHIR R4 Patient Resource for ID: {}", id);
        Patient fhirPatient = new Patient();
        fhirPatient.setId(id);
        fhirPatient.addName().setFamily("Doe").addGiven("John");
        fhirPatient.addTelecom().setSystem(ContactPoint.ContactPointSystem.EMAIL).setValue("john.doe@medisphere.com");
        fhirPatient.setGender(Enumerations.AdministrativeGender.MALE);
        fhirPatient.setBirthDate(new Date(1990 - 1900, 5, 15));

        IParser parser = fhirContext.newJsonParser().setPrettyPrint(true);
        return parser.encodeResourceToString(fhirPatient);
    }

    @Override
    public String getObservationResource(String id) {
        log.info("Generating FHIR R4 Observation Resource for ID: {}", id);
        Observation observation = new Observation();
        observation.setId(id);
        observation.setStatus(Observation.ObservationStatus.FINAL);
        observation.setCode(new CodeableConcept().addCoding(
                new Coding("http://loinc.org", "8867-4", "Heart rate")
        ));
        observation.setValue(new Quantity().setValue(72).setUnit("beats/minute"));
        observation.setEffective(new DateTimeType(new Date()));

        IParser parser = fhirContext.newJsonParser().setPrettyPrint(true);
        return parser.encodeResourceToString(observation);
    }

    @Override
    public String getMedicationResource(String id) {
        log.info("Generating FHIR R4 Medication Resource for ID: {}", id);
        Medication medication = new Medication();
        medication.setId(id);
        medication.setCode(new CodeableConcept().addCoding(
                new Coding("http://www.nlm.nih.gov/research/umls/rxnorm", "313782", "Acetaminophen 325 MG Oral Tablet")
        ));
        medication.setStatus(Medication.MedicationStatus.ACTIVE);

        IParser parser = fhirContext.newJsonParser().setPrettyPrint(true);
        return parser.encodeResourceToString(medication);
    }

    @Override
    public boolean syncFhirRecord(String id) {
        log.info("Simulating sync of FHIR records with external repository for Patient ID: {}", id);
        if (id == null || id.isBlank()) {
            throw new ResourceNotFoundException("Patient ID cannot be empty");
        }

        // Simulated external hospital response payload
        String remoteFhirPatientJson = "{\n" +
                "  \"resourceType\": \"Patient\",\n" +
                "  \"id\": \"" + id + "\",\n" +
                "  \"active\": true,\n" +
                "  \"name\": [\n" +
                "    {\n" +
                "      \"use\": \"official\",\n" +
                "      \"family\": \"Doe\",\n" +
                "      \"given\": [\"John\"]\n" +
                "    }\n" +
                "  ],\n" +
                "  \"telecom\": [\n" +
                "    {\n" +
                "      \"system\": \"email\",\n" +
                "      \"value\": \"john.doe@medisphere.com\"\n" +
                "    }\n" +
                "  ],\n" +
                "  \"gender\": \"male\",\n" +
                "  \"birthDate\": \"1990-06-15\"\n" +
                "}";

        // Parse and validate the FHIR payload
        fhirResourceValidator.validatePatient(remoteFhirPatientJson);

        log.info("FHIR Sync completed and validated successfully for Patient: {}", id);
        return true;
    }
}
