package com.infosys.medisphere.service;

import com.infosys.medisphere.dto.ModelRequest;
import com.infosys.medisphere.dto.ModelResponse;
import com.infosys.medisphere.entity.ModelVersion;
import com.infosys.medisphere.exception.ResourceNotFoundException;
import com.infosys.medisphere.repository.ModelRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service for managing AI model versions, accuracy tracking, and lifecycle.
 */
@Slf4j
@Service
public class ModelManagementService {

    private final ModelRepository modelRepository;

    public ModelManagementService(ModelRepository modelRepository) {
        this.modelRepository = modelRepository;
    }

    /**
     * Register a new model version.
     */
    public ModelResponse createModel(ModelRequest request) {
        ModelVersion model = ModelVersion.builder()
                .version(request.getVersion())
                .accuracy(request.getAccuracy())
                .createdDate(LocalDate.now())
                .status(request.getStatus() != null ? request.getStatus() : "INACTIVE")
                .build();

        ModelVersion saved = modelRepository.save(model);
        log.info("Model version {} registered with accuracy {}%", saved.getVersion(), saved.getAccuracy());
        return mapToResponse(saved);
    }

    /**
     * Get all model versions.
     */
    public List<ModelResponse> getAllModels() {
        return modelRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get the latest active model version.
     */
    public ModelResponse getLatestModel() {
        return modelRepository.findFirstByStatusOrderByCreatedDateDesc("ACTIVE")
                .map(this::mapToResponse)
                .orElse(null);
    }

    /**
     * Update a model version (e.g., change status to ACTIVE/INACTIVE).
     */
    public ModelResponse updateModel(String version, ModelRequest request) {
        ModelVersion model = modelRepository.findByVersion(version)
                .orElseThrow(() -> new ResourceNotFoundException("Model version not found: " + version));

        if (request.getAccuracy() != null) {
            model.setAccuracy(request.getAccuracy());
        }
        if (request.getStatus() != null) {
            model.setStatus(request.getStatus());
        }

        ModelVersion saved = modelRepository.save(model);
        log.info("Model version {} updated: status={}, accuracy={}", version, saved.getStatus(), saved.getAccuracy());
        return mapToResponse(saved);
    }

    /**
     * Delete a model version.
     */
    public void deleteModel(String version) {
        ModelVersion model = modelRepository.findByVersion(version)
                .orElseThrow(() -> new ResourceNotFoundException("Model version not found: " + version));
        modelRepository.delete(model);
        log.info("Model version {} deleted", version);
    }

    private ModelResponse mapToResponse(ModelVersion model) {
        return ModelResponse.builder()
                .id(model.getId())
                .version(model.getVersion())
                .accuracy(model.getAccuracy())
                .createdDate(model.getCreatedDate())
                .status(model.getStatus())
                .build();
    }
}
