package com.ceroa.repository;

import com.ceroa.domain.AuthSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

public interface AuthSessionRepository extends JpaRepository<AuthSession, UUID> {
    Optional<AuthSession> findByTokenHashAndExpiresAtAfter(String tokenHash, OffsetDateTime now);
    void deleteByTokenHash(String tokenHash);
    void deleteAllByUserId(UUID userId);
}
