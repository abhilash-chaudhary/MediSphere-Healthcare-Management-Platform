package com.infosys.medisphere.service;

import com.infosys.medisphere.entity.Provider;
import com.infosys.medisphere.exception.ResourceNotFoundException;
import com.infosys.medisphere.repository.ProviderRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
public class ProviderServiceImpl implements ProviderService {

    private final ProviderRepository providerRepository;

    public ProviderServiceImpl(ProviderRepository providerRepository) {
        this.providerRepository = providerRepository;
    }

    @Override
    public Provider registerProvider(Provider provider) {
        log.info("Registering healthcare provider: {} ({})", provider.getName(), provider.getType());
        return providerRepository.save(provider);
    }

    @Override
    public Provider updateSchedule(String providerId, List<String> schedule) {
        log.info("Updating schedule slots for Provider ID: {}", providerId);
        Provider provider = providerRepository.findById(providerId)
                .orElseThrow(() -> new ResourceNotFoundException("Provider not found with ID: " + providerId));
        provider.setSchedule(schedule);
        return providerRepository.save(provider);
    }

    @Override
    public List<Provider> getAllProviders() {
        log.info("Fetching all healthcare providers");
        return providerRepository.findAll();
    }

    @Override
    public List<Provider> getProvidersByType(String type) {
        log.info("Fetching providers of type: {}", type);
        return providerRepository.findByTypeIgnoreCase(type);
    }

    @Override
    public List<Provider> getProvidersBySpecialty(String specialty) {
        log.info("Fetching providers of specialty: {}", specialty);
        return providerRepository.findBySpecialtyIgnoreCase(specialty);
    }

    @Override
    public Provider getProviderById(String id) {
        log.info("Fetching provider details for ID: {}", id);
        return providerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Provider not found with ID: " + id));
    }
}
