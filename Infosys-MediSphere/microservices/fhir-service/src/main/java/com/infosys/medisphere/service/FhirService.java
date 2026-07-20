package com.infosys.medisphere.service;

public interface FhirService {
    String getPatientResource(String id);
    String getObservationResource(String id);
    String getMedicationResource(String id);
    boolean syncFhirRecord(String id);
}
