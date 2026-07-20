package com.infosys.medisphere.controller;

import com.infosys.medisphere.dto.ApiResponse;
import com.infosys.medisphere.service.StreamReplayService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/stream")
public class StreamReplayController {

    private final StreamReplayService replayService;

    public StreamReplayController(StreamReplayService replayService) {
        this.replayService = replayService;
    }

    @PostMapping("/replay")
    public ApiResponse<Void> replayEvents(@RequestParam String patientId) {
        replayService.replayVitalsStream(patientId);
        return ApiResponse.success(null, "Event replay started successfully for patient: " + patientId);
    }

    @PostMapping("/dlq")
    public ApiResponse<Void> triggerDlqMock(@RequestParam String rawPayload, @RequestParam String reason) {
        replayService.routeToDeadLetterQueue(rawPayload, reason);
        return ApiResponse.success(null, "Mock payload routed to DLQ successfully");
    }
}
