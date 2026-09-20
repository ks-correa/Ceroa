package com.ceroa.repository;

import com.ceroa.domain.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    List<Notification> findAllByUserIdOrderByCreatedAtDesc(UUID userId);

    long countByUserIdAndReadFalse(UUID userId);

    Optional<Notification> findByIdAndUserId(UUID id, UUID userId);

    Optional<Notification> findByUserIdAndEventKey(UUID userId, String eventKey);

    List<Notification> findAllByRelatedDebtId(UUID debtId);

    @Modifying
    @Query("UPDATE Notification n SET n.relatedDebt = null WHERE n.relatedDebt.id = :debtId")
    void detachDebtReference(@Param("debtId") UUID debtId);
}

