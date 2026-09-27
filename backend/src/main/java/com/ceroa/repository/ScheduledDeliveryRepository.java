package com.ceroa.repository;
import com.ceroa.domain.ScheduledDelivery;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Pageable;
import jakarta.persistence.LockModeType;
import java.time.OffsetDateTime;
import java.util.*;
public interface ScheduledDeliveryRepository extends JpaRepository<ScheduledDelivery,UUID> {
    boolean existsByUserIdAndEventKey(UUID userId,String eventKey);
    @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select d from ScheduledDelivery d where d.id=:id")
    Optional<ScheduledDelivery> lock(@Param("id") UUID id);
    @Query("select d from ScheduledDelivery d where d.status in ('PENDING','RETRY','RESERVED','DISPATCHING') and d.nextAttempt<=:now order by d.createdAt,d.id")
    List<ScheduledDelivery> ready(@Param("now") OffsetDateTime now,Pageable page);
    List<ScheduledDelivery> findAllByUserIdOrderByCreatedAtDesc(UUID userId,Pageable page);
    @Modifying @Query("update ScheduledDelivery d set d.status='INVALIDATED', d.lastError='FINANCIAL_CHANGE' where d.debtId=:id and d.status in ('PENDING','RETRY','RESERVED')")
    void invalidateDebt(@Param("id") UUID id);
    @Modifying @Query("update ScheduledDelivery d set d.status='INVALIDATED', d.lastError='CONSENT_REVOKED' where d.userId=:id and d.status in ('PENDING','RETRY','RESERVED')")
    void invalidateUser(@Param("id") UUID id);
    @Modifying @Query("update ScheduledDelivery d set d.status='INVALIDATED', d.lastError='EXPIRED' where d.status in ('PENDING','RETRY','RESERVED') and d.expiresAt<=:now")
    void expirePending(@Param("now") OffsetDateTime now);
    @Modifying @Query("update ScheduledDelivery d set d.status='AMBIGUOUS', d.lastError='UNKNOWN_TELEGRAM_RESULT' where d.status='DISPATCHING' and d.leaseExpiresAt<=:now")
    void expireDispatch(@Param("now") OffsetDateTime now);
}
