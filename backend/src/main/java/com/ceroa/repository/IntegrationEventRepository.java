package com.ceroa.repository;
import com.ceroa.domain.IntegrationEvent;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.domain.Pageable;
import java.util.*;
import java.time.OffsetDateTime;

public interface IntegrationEventRepository extends JpaRepository<IntegrationEvent,UUID> {
    Optional<IntegrationEvent> findByDedupeKey(String key);
    @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select e from IntegrationEvent e where e.id=:id")
    Optional<IntegrationEvent> locked(UUID id);
    @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select e from IntegrationEvent e where e.channel=:channel and e.status='PENDING' and e.nextAttemptAt<=:now and e.attempts<5 order by e.createdAt")
    List<IntegrationEvent> ready(String channel,OffsetDateTime now,Pageable page);
    @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select e from IntegrationEvent e where e.channel=:channel and e.status in ('LEASED','DISPATCHING') and e.leaseUntil<:now order by e.createdAt")
    List<IntegrationEvent> expired(String channel,OffsetDateTime now,Pageable page);
}
