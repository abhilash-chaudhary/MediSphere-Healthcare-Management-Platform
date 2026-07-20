package com.infosys.medisphere.service;

public interface StreamReplayService {
    void replayVitalsStream(String patientId);
    void routeToDeadLetterQueue(String rawMessage, String reason);
}
