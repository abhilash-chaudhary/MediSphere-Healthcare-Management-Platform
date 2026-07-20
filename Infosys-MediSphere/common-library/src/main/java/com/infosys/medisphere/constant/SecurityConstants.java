package com.infosys.medisphere.constant;

public final class SecurityConstants {
    public static final String HEADER_STRING = "Authorization";
    public static final String TOKEN_PREFIX = "Bearer ";
    public static final String AUTHORITIES_KEY = "roles";
    
    // Default token validity configurations
    public static final long ACCESS_TOKEN_VALIDITY_SECONDS = 1800; // 30 minutes
    public static final long REFRESH_TOKEN_VALIDITY_SECONDS = 86400; // 24 hours
    
    // Roles
    public static final String ROLE_ADMIN = "ADMIN";
    public static final String ROLE_DOCTOR = "DOCTOR";
    public static final String ROLE_PATIENT = "PATIENT";
    
    private SecurityConstants() {
        // Prevent instantiation
    }
}
