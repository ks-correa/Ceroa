package com.ceroa.service;

import com.ceroa.repository.PasswordRecoveryRepository;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.*;
import org.springframework.stereotype.Component;

@Component
@EnableScheduling
@ConditionalOnProperty(name = "ceroa.recovery.delivery-enabled", havingValue = "true", matchIfMissing = true)
public class EmailChangeDeliveryJob {
    private static final org.slf4j.Logger LOG = org.slf4j.LoggerFactory.getLogger(EmailChangeDeliveryJob.class);

    private final PasswordRecoveryRepository repository;
    private final EmailChangeService service;

    public EmailChangeDeliveryJob(PasswordRecoveryRepository repository, EmailChangeService service) {
        this.repository = repository;
        this.service = service;
    }

    @Scheduled(fixedDelay = 2000)
    public void deliverPending() {
        for (var recovery : repository.findTop20ByStateAndPurposeOrderByCreatedAtAsc("PENDING_EMAIL", "EMAIL_CHANGE")) {
            try { service.deliver(recovery.id); }
            catch (RuntimeException error) {
                LOG.warn("Email change delivery temporarily unavailable");
            }
        }
    }
}
