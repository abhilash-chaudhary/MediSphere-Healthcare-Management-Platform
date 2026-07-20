package com.infosys.medisphere.controller;

import com.infosys.medisphere.dto.ApiResponse;
import com.infosys.medisphere.dto.ModelRequest;
import com.infosys.medisphere.dto.ModelResponse;
import com.infosys.medisphere.service.ModelManagementService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST controller for AI Model Version Management.
 */
@RestController
@RequestMapping("/api/model")
@Tag(name = "AI Model Management", description = "Manage AI model versions and accuracy tracking")
public class ModelController {

    private final ModelManagementService modelService;

    public ModelController(ModelManagementService modelService) {
        this.modelService = modelService;
    }

    @PostMapping
    @Operation(summary = "Register a new model version")
    public ApiResponse<ModelResponse> createModel(@RequestBody ModelRequest request) {
        ModelResponse response = modelService.createModel(request);
        return ApiResponse.success(response, "Model version registered successfully");
    }

    @GetMapping
    @Operation(summary = "Get all model versions")
    public ApiResponse<List<ModelResponse>> getAllModels() {
        List<ModelResponse> models = modelService.getAllModels();
        return ApiResponse.success(models, "All model versions retrieved");
    }

    @GetMapping("/latest")
    @Operation(summary = "Get the latest active model version")
    public ApiResponse<ModelResponse> getLatestModel() {
        ModelResponse latest = modelService.getLatestModel();
        if (latest == null) {
            return ApiResponse.error("No active model version found");
        }
        return ApiResponse.success(latest, "Latest active model retrieved");
    }

    @PutMapping("/{version}")
    @Operation(summary = "Update a model version")
    public ApiResponse<ModelResponse> updateModel(@PathVariable String version, @RequestBody ModelRequest request) {
        ModelResponse response = modelService.updateModel(version, request);
        return ApiResponse.success(response, "Model version updated successfully");
    }

    @DeleteMapping("/{version}")
    @Operation(summary = "Delete a model version")
    public ApiResponse<Void> deleteModel(@PathVariable String version) {
        modelService.deleteModel(version);
        return ApiResponse.success(null, "Model version deleted successfully");
    }

    @GetMapping("/status")
    @Operation(summary = "Get overall model management status")
    public ApiResponse<Map<String, Object>> getModelStatus() {
        List<ModelResponse> models = modelService.getAllModels();
        ModelResponse latest = modelService.getLatestModel();

        Map<String, Object> status = Map.of(
                "totalModels", models.size(),
                "activeModel", latest != null ? latest.getVersion() : "NONE",
                "activeModelAccuracy", latest != null ? latest.getAccuracy() : 0.0,
                "pipelineStatus", "HEALTHY",
                "lastTrainingDate", "2026-07-12",
                "nextScheduledTraining", "2026-08-01",
                "infrastructure", "Java Rule-Based Engine v1.0"
        );
        return ApiResponse.success(status, "Model management status retrieved");
    }
}
