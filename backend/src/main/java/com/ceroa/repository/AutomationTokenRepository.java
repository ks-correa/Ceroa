package com.ceroa.repository;

import com.ceroa.domain.AutomationToken;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.*;

public interface AutomationTokenRepository extends JpaRepository<AutomationToken, UUID> {
    Optional<AutomationToken> findByTokenHash(String hash);
    List<AutomationToken> findAllByUserIdOrderByCreatedAtDesc(UUID userId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from AutomationToken t where t.id = :id")
    Optional<AutomationToken> lockById(@Param("id") UUID id);
}
