package com.infosys.medisphere.scheduler;

import com.infosys.medisphere.entity.Consent;
import com.infosys.medisphere.repository.ConsentRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Component
public class ConsentCleanupScheduler {

    private final ConsentRepository consentRepository;

    public ConsentCleanupScheduler(ConsentRepository consentRepository) {
        this.consentRepository = consentRepository;
    }

    // Runs once every hour to flag expired consents
    @Scheduled(cron = "0 0 * * * *")
    public void cleanupExpiredConsents() {
        log.info("Starting scheduled cleanup task for expired consents...");
        
        try {
            List<Consent> expiredList = consentRepository.findByStatusAndExpiresAtBefore(
                    "GRANTED", LocalDateTime.now());
            
            if (expiredList.isEmpty()) {
                log.info("Scheduled task finished: No expired consents found.");
                return;
            }

            for (Consent consent : expiredList) {
                consent.setStatus("EXPIRED");
            }
            
            consentRepository.saveAll(expiredList);
            log.info("Scheduled task finished: Marked {} consents as EXPIRED.", expiredList.size());
        } catch (Exception e) {
            log.error("Error occurred while cleaning up expired consents: {}", e.getMessage());
        }
    }
}
