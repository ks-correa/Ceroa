package com.ceroa.repository;
import com.ceroa.domain.SentinelAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.time.OffsetDateTime;
import jakarta.persistence.LockModeType;
public interface SentinelAlertRepository extends JpaRepository<SentinelAlert,UUID> {
    Optional<SentinelAlert> findByUserIdAndEpisodeId(UUID userId,UUID episodeId);
    List<SentinelAlert> findAllByUserIdOrderByCreatedAtDesc(UUID userId,Pageable page);
    @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select a from SentinelAlert a where a.id=:id")
    Optional<SentinelAlert> lock(@Param("id") UUID id);
    @Query("select a from SentinelAlert a where a.deliveryStatus in ('PENDING','RETRY','RESERVED','DISPATCHING') and a.nextAttempt<=:now order by a.createdAt,a.id")
    List<SentinelAlert> ready(@Param("now") OffsetDateTime now,Pageable page);
    @Modifying @Query("update SentinelAlert a set a.deliveryStatus='INVALIDATED',a.deliveryError='EXPIRED' where a.deliveryStatus in ('PENDING','RETRY','RESERVED') and a.deliveryExpiresAt<=:now")
    void expirePending(@Param("now") OffsetDateTime now);
    @Modifying @Query("update SentinelAlert a set a.deliveryStatus='AMBIGUOUS',a.deliveryError='UNKNOWN_DELIVERY' where a.deliveryStatus='DISPATCHING' and a.leaseExpiresAt<=:now")
    void expireDispatch(@Param("now") OffsetDateTime now);
}
