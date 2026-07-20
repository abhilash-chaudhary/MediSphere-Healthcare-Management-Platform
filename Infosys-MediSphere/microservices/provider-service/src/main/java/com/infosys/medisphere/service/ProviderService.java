package com.infosys.medisphere.service;

import com.infosys.medisphere.entity.Provider;
import java.util.List;

public interface ProviderService {
    Provider registerProvider(Provider provider);
    Provider updateSchedule(String providerId, List<String> schedule);
    List<Provider> getAllProviders();
    List<Provider> getProvidersByType(String type);
    List<Provider> getProvidersBySpecialty(String specialty);
    Provider getProviderById(String id);
}
