package com.infosys.medisphere.controller;

import com.infosys.medisphere.dto.ApiResponse;
import com.infosys.medisphere.dto.PredictionRequest;
import com.infosys.medisphere.dto.PredictionResponse;
import com.infosys.medisphere.service.PredictionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST controller for AI Risk Prediction endpoints.
 */
@RestController
@RequestMapping("/api/prediction")
@Tag(name = "AI Risk Prediction", description = "Endpoints for CVD and Diabetes risk prediction")
public class PredictionController {

    private final PredictionService predictionService;

    public PredictionController(PredictionService predictionService) {
        this.predictionService = predictionService;
    }

    @PostMapping("/cvd")
    @Operation(summary = "Predict Cardiovascular Disease risk")
    public ApiResponse<PredictionResponse> predictCVD(@RequestBody PredictionRequest request) {
        PredictionResponse response = predictionService.predictCVD(request);
        return ApiResponse.success(response, "CVD risk prediction completed successfully");
    }

    @PostMapping("/diabetes")
    @Operation(summary = "Predict Diabetes complication risk")
    public ApiResponse<PredictionResponse> predictDiabetes(@RequestBody PredictionRequest request) {
        PredictionResponse response = predictionService.predictDiabetes(request);
        return ApiResponse.success(response, "Diabetes risk prediction completed successfully");
    }

    @GetMapping("/history/{patientId}")
    @Operation(summary = "Get prediction history for a patient")
    public ApiResponse<List<PredictionResponse>> getHistory(@PathVariable String patientId) {
        List<PredictionResponse> history = predictionService.getHistory(patientId);
        return ApiResponse.success(history, "Prediction history retrieved successfully");
    }

    @GetMapping("/latest/{patientId}")
    @Operation(summary = "Get latest prediction for a patient")
    public ApiResponse<PredictionResponse> getLatest(@PathVariable String patientId) {
        PredictionResponse latest = predictionService.getLatest(patientId);
        if (latest == null) {
            return ApiResponse.error("No predictions found for patient: " + patientId);
        }
        return ApiResponse.success(latest, "Latest prediction retrieved successfully");
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a prediction by ID")
    public ApiResponse<Void> deletePrediction(@PathVariable String id) {
        predictionService.deletePrediction(id);
        return ApiResponse.success(null, "Prediction deleted successfully");
    }

    // ============================================================
    // Validation & Dashboard Metric Endpoints (simulated values)
    // ============================================================

    @GetMapping("/accuracy")
    @Operation(summary = "Get model prediction accuracy metrics")
    public ApiResponse<Map<String, Object>> getAccuracy() {
        Map<String, Object> metrics = Map.of(
                "overallAccuracy", 91.4,
                "cvdAccuracy", 89.7,
                "diabetesAccuracy", 93.1,
                "f1Score", 0.88,
                "auc", 0.92,
                "modelVersion", "1.0",
                "evaluationDate", "2026-07-10"
        );
        return ApiResponse.success(metrics, "Accuracy metrics retrieved");
    }

    @GetMapping("/calibration")
    @Operation(summary = "Get prediction calibration metrics")
    public ApiResponse<Map<String, Object>> getCalibration() {
        Map<String, Object> calibration = Map.of(
                "brierScore", 0.12,
                "expectedCalibrationError", 0.08,
                "calibrationSlope", 1.02,
                "calibrationIntercept", -0.03,
                "hosmerLemeshowP", 0.45,
                "status", "WELL_CALIBRATED"
        );
        return ApiResponse.success(calibration, "Calibration metrics retrieved");
    }

    @GetMapping("/bias-audit")
    @Operation(summary = "Get prediction bias audit results")
    public ApiResponse<Map<String, Object>> getBiasAudit() {
        Map<String, Object> audit = Map.of(
                "demographicParity", 0.95,
                "equalizedOdds", 0.93,
                "disparateImpact", 0.97,
                "genderBias", "LOW",
                "ageBias", "NEGLIGIBLE",
                "overallFairness", "PASS",
                "auditDate", "2026-07-15"
        );
        return ApiResponse.success(audit, "Bias audit results retrieved");
    }
}
