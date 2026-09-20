package com.ceroa.repository;

import com.ceroa.domain.PlusSubscription;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface PlusSubscriptionRepository extends JpaRepository<PlusSubscription, UUID> {
    Optional<PlusSubscription> findFirstByUserIdOrderByCreatedAtDesc(UUID userId);
    Optional<PlusSubscription> findByProviderId(String providerId);
    Optional<PlusSubscription> findFirstByUserIdAndStatusIn(UUID userId, java.util.Collection<String> statuses);
    boolean existsByUserIdAndStatus(UUID userId, String status);
}
