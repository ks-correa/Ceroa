package com.ceroa.service;

import com.ceroa.repository.PasswordRecoveryRepository;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.*;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.PlatformTransactionManager;

@Component
@EnableScheduling
@ConditionalOnProperty(name = "ceroa.recovery.delivery-enabled", havingValue = "true", matchIfMissing = true)
public class RecoveryDeliveryJob {
    private final PasswordRecoveryRepository repository;
    private final PasswordRecoveryService service;
    private final TransactionTemplate transaction;
    public RecoveryDeliveryJob(PasswordRecoveryRepository repository, PasswordRecoveryService service, PlatformTransactionManager manager) {
        this.repository = repository; this.service = service; this.transaction = new TransactionTemplate(manager);
    }
    @Scheduled(fixedDelay = 2000)
    public void deliverPending() {
        for (var recovery : repository.findTop20ByStateOrderByCreatedAtAsc("PENDING")) {
            try { service.deliver(recovery.id); }
            catch (RuntimeException error) { org.slf4j.LoggerFactory.getLogger(getClass()).warn("Recovery delivery temporarily unavailable"); }
        }
    }
    @Scheduled(fixedDelay = 3600000, initialDelay = 3600000)
    public void cleanup() {
        transaction.executeWithoutResult(status -> repository.deleteByCreatedAtBefore(java.time.OffsetDateTime.now().minusDays(1)));
    }
}
