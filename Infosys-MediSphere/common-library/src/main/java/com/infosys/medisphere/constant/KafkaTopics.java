package com.infosys.medisphere.constant;

public final class KafkaTopics {
    public static final String PATIENT_VITALS = "patient-vitals";
    public static final String PATIENT_EVENTS = "patient-events";
    public static final String PATIENT_CREATED = "patient-created";
    public static final String PATIENT_UPDATED = "patient-updated";
    public static final String CONSENT_EVENTS = "consent-events";
    public static final String NOTIFICATION_EVENTS = "notification-events";
    public static final String AUDIT_EVENTS = "audit-events";
    public static final String PREDICTION_EVENTS = "prediction-events";

    private KafkaTopics() {
        // Prevent instantiation
    }
}
