package com.infosys.medisphere.controller;

import com.infosys.medisphere.dto.ApiResponse;
import com.infosys.medisphere.entity.NotificationLog;
import com.infosys.medisphere.service.NotificationService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping("/patient/{patientId}")
    public ApiResponse<List<NotificationLog>> getNotifications(@PathVariable String patientId) {
        List<NotificationLog> list = notificationService.getNotifications(patientId);
        return ApiResponse.success(list, "Notifications list retrieved");
    }

    @PostMapping("/read")
    public ApiResponse<Void> markAsRead(@RequestBody Map<String, String> payload) {
        String patientId = payload.get("patientId");
        if (patientId != null && !patientId.isBlank()) {
            notificationService.markAsRead(patientId);
        }
        return ApiResponse.success(null, "Notifications marked as read");
    }
}
