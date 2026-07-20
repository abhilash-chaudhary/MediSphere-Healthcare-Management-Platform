package com.infosys.medisphere.validator;

import com.infosys.medisphere.dto.VitalDTO;
import org.springframework.stereotype.Component;

@Component
public class VitalsRangeValidator {

    public static class VitalStatus {
        public final String status; // NORMAL, ALERT, CRITICAL
        public final String message;

        public VitalStatus(String status, String message) {
            this.status = status;
            this.message = message;
        }
    }

    public VitalStatus validate(VitalDTO vitals) {
        StringBuilder alerts = new StringBuilder();
        String currentStatus = "NORMAL";

        // Heart Rate Checks
        if (vitals.getHeartRate() != null) {
            double hr = vitals.getHeartRate();
            if (hr < 50 || hr > 120) {
                currentStatus = "CRITICAL";
                alerts.append("Critical heart rate: ").append(hr).append(" bpm. ");
            } else if (hr < 60 || hr > 100) {
                if (!"CRITICAL".equals(currentStatus)) currentStatus = "ALERT";
                alerts.append("Elevated heart rate: ").append(hr).append(" bpm. ");
            }
        }

        // Oxygen Level (SpO2) Checks
        if (vitals.getOxygenLevel() != null) {
            double spo2 = vitals.getOxygenLevel();
            if (spo2 < 90.0) {
                currentStatus = "CRITICAL";
                alerts.append("Critical low oxygen saturation: ").append(spo2).append("%. ");
            } else if (spo2 < 95.0) {
                if (!"CRITICAL".equals(currentStatus)) currentStatus = "ALERT";
                alerts.append("Borderline oxygen saturation: ").append(spo2).append("%. ");
            }
        }

        // Temperature Checks
        if (vitals.getTemperature() != null) {
            double temp = vitals.getTemperature();
            if (temp < 35.0 || temp > 38.8) {
                currentStatus = "CRITICAL";
                alerts.append("Critical body temperature: ").append(temp).append("°C. ");
            } else if (temp < 36.0 || temp > 37.5) {
                if (!"CRITICAL".equals(currentStatus)) currentStatus = "ALERT";
                alerts.append("Mild temperature anomaly: ").append(temp).append("°C. ");
            }
        }

        // Blood Pressure Checks
        if (vitals.getBloodPressure() != null && !vitals.getBloodPressure().isBlank()) {
            try {
                String[] parts = vitals.getBloodPressure().split("/");
                if (parts.length == 2) {
                    int sys = Integer.parseInt(parts[0].trim());
                    int dia = Integer.parseInt(parts[1].trim());

                    if (sys < 90 || sys > 140 || dia < 60 || dia > 90) {
                        currentStatus = "CRITICAL";
                        alerts.append("Critical Blood Pressure: ").append(vitals.getBloodPressure()).append(" mmHg. ");
                    } else if (sys > 120 || dia > 80) {
                        if (!"CRITICAL".equals(currentStatus)) currentStatus = "ALERT";
                        alerts.append("Prehypertensive Blood Pressure: ").append(vitals.getBloodPressure()).append(" mmHg. ");
                    }
                }
            } catch (Exception e) {
                // Ignore parsing errors and assume format is valid or handled by schema
            }
        }

        return new VitalStatus(currentStatus, alerts.toString().trim());
    }
}
