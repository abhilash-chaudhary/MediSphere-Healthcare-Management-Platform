package com.infosys.medisphere.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TokenResponse {
    private String accessToken;
    private String refreshToken;
    private String tokenType; // e.g. "Bearer"
    private Long expiresIn; // in seconds
    private Boolean otpRequired;
    private String email;
}
