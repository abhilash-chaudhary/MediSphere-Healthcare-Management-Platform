package com.infosys.medisphere.controller;

import com.infosys.medisphere.dto.ApiResponse;
import com.infosys.medisphere.entity.Provider;
import com.infosys.medisphere.service.ProviderService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/provider")
public class ProviderController {

    private final ProviderService providerService;

    public ProviderController(ProviderService providerService) {
        this.providerService = providerService;
    }

    @PostMapping("/register")
    public ApiResponse<Provider> registerProvider(@RequestBody Provider provider) {
        Provider saved = providerService.registerProvider(provider);
        return ApiResponse.success(saved, "Healthcare provider registered successfully");
    }

    @PostMapping("/schedule")
    public ApiResponse<Provider> updateSchedule(@RequestParam String providerId, @RequestBody List<String> schedule) {
        Provider updated = providerService.updateSchedule(providerId, schedule);
        return ApiResponse.success(updated, "Provider schedule updated successfully");
    }

    @GetMapping("/{id}")
    public ApiResponse<Provider> getProvider(@PathVariable String id) {
        Provider provider = providerService.getProviderById(id);
        return ApiResponse.success(provider, "Provider details retrieved successfully");
    }

    @GetMapping("/list")
    public ApiResponse<List<Provider>> listProviders(
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String specialty) {
        
        List<Provider> list;
        if (type != null) {
            list = providerService.getProvidersByType(type);
        } else if (specialty != null) {
            list = providerService.getProvidersBySpecialty(specialty);
        } else {
            list = providerService.getAllProviders();
        }
        return ApiResponse.success(list, "Providers list retrieved successfully");
    }
}
