package com.ceroa.repository;

import com.ceroa.domain.PasswordRecovery;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import java.time.OffsetDateTime;
import java.util.*;

public interface PasswordRecoveryRepository extends JpaRepository<PasswordRecovery, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from PasswordRecovery r where r.id = :id")
    Optional<PasswordRecovery> lockById(UUID id);
    long countByEmailAndCreatedAtAfter(String email, OffsetDateTime since);
    long countBySourceHashAndCreatedAtAfter(String hash, OffsetDateTime since);
    List<PasswordRecovery> findTop20ByStateOrderByCreatedAtAsc(String state);
    void deleteByCreatedAtBefore(OffsetDateTime before);
}
