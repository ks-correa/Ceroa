package com.ceroa.service;
import com.ceroa.domain.SentinelState;
import com.ceroa.repository.SentinelStateRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.context.ApplicationEventPublisher;
import java.time.OffsetDateTime;
import java.util.UUID;
/** Called inside a confirmed financial mutation transaction. A rollback rolls back this outbox too. */
@Service
public class SentinelVersionService {
    private final SentinelStateRepository states;
    private final ApplicationEventPublisher events;
    public SentinelVersionService(SentinelStateRepository states,ApplicationEventPublisher events){this.states=states;this.events=events;}
    public record FinancialChanged(UUID userId) {}
    @Transactional
    public void mark(UUID userId){
        var row=states.findById(userId).orElseGet(()->{var state=new SentinelState();state.userId=userId;return state;});
        row.financialVersion++;row.dirty=true;row.updatedAt=OffsetDateTime.now();states.save(row);
        events.publishEvent(new FinancialChanged(userId));
    }
}
