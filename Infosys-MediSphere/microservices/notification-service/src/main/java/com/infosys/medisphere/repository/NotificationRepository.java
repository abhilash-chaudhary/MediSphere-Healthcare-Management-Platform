package com.infosys.medisphere.repository;

import com.infosys.medisphere.entity.NotificationLog;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface NotificationRepository extends MongoRepository<NotificationLog, String> {
    List<NotificationLog> findByRecipientId(String recipientId);
}
