package com.infosys.medisphere.util;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public final class DateUtils {

    private static final DateTimeFormatter ISO_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE_TIME;
    private static final DateTimeFormatter PATIENT_DOB_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private DateUtils() {
        // Prevent instantiation
    }

    public static String formatIso(LocalDateTime dateTime) {
        if (dateTime == null) return null;
        return dateTime.format(ISO_FORMATTER);
    }

    public static LocalDateTime parseIso(String isoString) {
        if (isoString == null || isoString.isBlank()) return null;
        return LocalDateTime.parse(isoString, ISO_FORMATTER);
    }
}
