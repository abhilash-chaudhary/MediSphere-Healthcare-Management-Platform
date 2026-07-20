package com.infosys.medisphere.controller;

import com.infosys.medisphere.dto.ApiResponse;
import com.infosys.medisphere.dto.VitalDTO;
import com.infosys.medisphere.entity.WearableDevice;
import com.infosys.medisphere.service.WearableService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/wearable")
public class WearableController {

    private final WearableService wearableService;

    public WearableController(WearableService wearableService) {
        this.wearableService = wearableService;
    }

    @PostMapping("/register")
    public ApiResponse<WearableDevice> registerDevice(@RequestBody WearableDevice device) {
        WearableDevice registered = wearableService.registerDevice(device);
        return ApiResponse.success(registered, "Wearable device registered successfully");
    }

    @PostMapping("/sync")
    public ApiResponse<Void> syncLiveVitals(@RequestParam String deviceId, @RequestBody VitalDTO vitalDTO) {
        wearableService.syncVitals(deviceId, vitalDTO);
        return ApiResponse.success(null, "Wearable vitals streamed successfully");
    }

    @GetMapping("/patient/{patientId}")
    public ApiResponse<List<WearableDevice>> getPatientDevices(@PathVariable String patientId) {
        List<WearableDevice> devices = wearableService.getDevicesByPatientId(patientId);
        return ApiResponse.success(devices, "Linked wearable devices list retrieved");
    }
}
