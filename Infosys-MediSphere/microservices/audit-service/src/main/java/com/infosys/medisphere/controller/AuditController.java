package com.infosys.medisphere.controller;

import com.infosys.medisphere.dto.ApiResponse;
import com.infosys.medisphere.dto.AuditEventDTO;
import com.infosys.medisphere.service.AuditService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/audit")
public class AuditController {

    private final AuditService auditService;

    public AuditController(AuditService auditService) {
        this.auditService = auditService;
    }

    @GetMapping("/logs")
    public ApiResponse<List<AuditEventDTO>> getLogs(@RequestParam(required = false) String username) {
        List<AuditEventDTO> list;
        if (username != null && !username.isBlank()) {
            list = auditService.getAuditLogsByUsername(username);
        } else {
            list = auditService.getAllLogs();
        }
        return ApiResponse.success(list, "Audit logs retrieved successfully");
    }
}
