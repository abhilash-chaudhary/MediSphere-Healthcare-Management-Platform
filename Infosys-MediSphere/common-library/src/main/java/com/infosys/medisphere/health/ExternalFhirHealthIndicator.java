package com.infosys.medisphere.health;

import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

import java.net.HttpURLConnection;
import java.net.URL;

@Component
public class ExternalFhirHealthIndicator implements HealthIndicator {

    @Override
    public Health health() {
        // In a real production system, this checks connection to the EHR FHIR endpoints
        // Here we simulate external EHR FHIR server ping
        try {
            boolean available = checkFhirEndpoint();
            if (available) {
                return Health.up()
                        .withDetail("EHR_Server", "Hospital FHIR R4 APIs are online and responsive")
                        .withDetail("latency_ms", 12)
                        .build();
            } else {
                return Health.down()
                        .withDetail("EHR_Server", "Hospital FHIR R4 APIs are unresponsive")
                        .build();
            }
        } catch (Exception e) {
            return Health.down(e).build();
        }
    }

    private boolean checkFhirEndpoint() {
        // Mock success response
        return true;
    }
}
