package com.infosys.medisphere.controller;

import com.infosys.medisphere.constant.SecurityConstants;
import com.infosys.medisphere.dto.ApiResponse;
import com.infosys.medisphere.dto.LoginRequest;
import com.infosys.medisphere.dto.TokenResponse;
import com.infosys.medisphere.dto.UserDTO;
import com.infosys.medisphere.entity.User;
import com.infosys.medisphere.exception.UnauthorizedException;
import com.infosys.medisphere.repository.UserRepository;
import com.infosys.medisphere.security.JwtUtils;
import jakarta.validation.Valid;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;
    private final UserDetailsService userDetailsService;

    public AuthController(AuthenticationManager authenticationManager, UserRepository userRepository,
                          PasswordEncoder passwordEncoder, JwtUtils jwtUtils, UserDetailsService userDetailsService) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtils = jwtUtils;
        this.userDetailsService = userDetailsService;
    }

    @PostMapping("/register")
    public ApiResponse<UserDTO> register(@Valid @RequestBody UserDTO userDTO) {
        if (userRepository.existsByUsername(userDTO.getUsername())) {
            return ApiResponse.error("Username is already taken");
        }
        if (userRepository.existsByEmail(userDTO.getEmail())) {
            return ApiResponse.error("Email is already registered");
        }

        User user = User.builder()
                .username(userDTO.getUsername())
                .email(userDTO.getEmail())
                .password(passwordEncoder.encode(userDTO.getPassword()))
                .roles(userDTO.getRoles() != null ? userDTO.getRoles() : Collections.singletonList(SecurityConstants.ROLE_PATIENT))
                .build();

        User savedUser = userRepository.save(user);

        UserDTO savedUserDTO = UserDTO.builder()
                .id(savedUser.getId())
                .username(savedUser.getUsername())
                .email(savedUser.getEmail())
                .roles(savedUser.getRoles())
                .build();

        return ApiResponse.success(savedUserDTO, "User registered successfully");
    }

    @PostMapping("/login")
    public ApiResponse<TokenResponse> login(@Valid @RequestBody LoginRequest loginRequest) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginRequest.getUsername(), loginRequest.getPassword())
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);
        
        User user = userRepository.findByUsername(loginRequest.getUsername())
                .orElseThrow(() -> new UnauthorizedException("User not found"));

        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getUsername());
        java.util.List<String> roles = userDetails.getAuthorities().stream()
                .map(org.springframework.security.core.GrantedAuthority::getAuthority)
                .toList();

        String accessToken = jwtUtils.generateToken(user.getUsername(), roles);
        String refreshToken = jwtUtils.generateRefreshToken(user.getUsername());

        TokenResponse tokenResponse = TokenResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType(SecurityConstants.TOKEN_PREFIX.trim())
                .expiresIn(SecurityConstants.ACCESS_TOKEN_VALIDITY_SECONDS)
                .otpRequired(false)
                .build();

        return ApiResponse.success(tokenResponse, "Login successful");
    }

    @PostMapping("/refresh")
    public ApiResponse<TokenResponse> refresh(@RequestParam String refreshToken) {
        if (jwtUtils.validateToken(refreshToken)) {
            String username = jwtUtils.extractUsername(refreshToken);
            UserDetails userDetails = userDetailsService.loadUserByUsername(username);

            java.util.List<String> roles = userDetails.getAuthorities().stream()
                    .map(org.springframework.security.core.GrantedAuthority::getAuthority)
                    .toList();

            String newAccessToken = jwtUtils.generateToken(username, roles);
            String newRefreshToken = jwtUtils.generateRefreshToken(username);

            TokenResponse tokenResponse = TokenResponse.builder()
                    .accessToken(newAccessToken)
                    .refreshToken(newRefreshToken)
                    .tokenType(SecurityConstants.TOKEN_PREFIX.trim())
                    .expiresIn(SecurityConstants.ACCESS_TOKEN_VALIDITY_SECONDS)
                    .build();

            return ApiResponse.success(tokenResponse, "Token refreshed successfully");
        }
        throw new UnauthorizedException("Invalid refresh token");
    }

    @PostMapping("/verify-otp")
    public ApiResponse<TokenResponse> verifyOtp(@RequestBody java.util.Map<String, String> payload) {
        String username = payload.get("username");
        String otp = payload.get("otp");

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UnauthorizedException("User not found"));

        if (user.getOtpCode() == null || !user.getOtpCode().equals(otp)) {
            return ApiResponse.error("Invalid OTP code");
        }

        if (user.getOtpExpiry() == null || user.getOtpExpiry().isBefore(java.time.LocalDateTime.now())) {
            return ApiResponse.error("OTP has expired");
        }

        user.setOtpCode(null);
        user.setOtpExpiry(null);
        userRepository.save(user);

        UserDetails userDetails = userDetailsService.loadUserByUsername(username);
        java.util.List<String> roles = userDetails.getAuthorities().stream()
                .map(org.springframework.security.core.GrantedAuthority::getAuthority)
                .toList();

        String accessToken = jwtUtils.generateToken(username, roles);
        String refreshToken = jwtUtils.generateRefreshToken(username);

        TokenResponse tokenResponse = TokenResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType(SecurityConstants.TOKEN_PREFIX.trim())
                .expiresIn(SecurityConstants.ACCESS_TOKEN_VALIDITY_SECONDS)
                .otpRequired(false)
                .build();

        return ApiResponse.success(tokenResponse, "OTP verification successful");
    }

    @PostMapping("/forgot-password")
    public ApiResponse<Void> forgotPassword(@RequestBody java.util.Map<String, String> payload) {
        String username = payload.get("username");
        String email = payload.get("email");
        String newPassword = payload.get("newPassword");

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UnauthorizedException("User not found"));

        if (!user.getEmail().equalsIgnoreCase(email)) {
            return ApiResponse.error("Verification mismatch: username and email do not match records");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        return ApiResponse.success(null, "Password reset successfully");
    }

    @GetMapping("/profile")
    public ApiResponse<UserDTO> profile() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new UnauthorizedException("Not authenticated");
        }

        String username = authentication.getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UnauthorizedException("User not found"));

        UserDTO userDTO = UserDTO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .roles(user.getRoles())
                .build();

        return ApiResponse.success(userDTO, "Profile retrieved successfully");
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout() {
        SecurityContextHolder.clearContext();
        return ApiResponse.success(null, "Logged out successfully");
    }

    @GetMapping("/users")
    public ApiResponse<java.util.List<UserDTO>> getUsersByRole(@RequestParam(required = false) String role) {
        java.util.List<User> users;
        if (role != null && !role.isEmpty()) {
            users = userRepository.findByRolesContaining(role.toUpperCase());
        } else {
            users = userRepository.findAll();
        }
        java.util.List<UserDTO> dtos = users.stream()
                .map(u -> UserDTO.builder()
                        .id(u.getId())
                        .username(u.getUsername())
                        .email(u.getEmail())
                        .roles(u.getRoles())
                        .build())
                .toList();
        return ApiResponse.success(dtos, "Users retrieved successfully");
    }
}
