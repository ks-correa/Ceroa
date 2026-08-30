package com.ceroa.repository;

import com.ceroa.domain.FinancialProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface FinancialProfileRepository extends JpaRepository<FinancialProfile, UUID> {
    Optional<FinancialProfile> findByUserId(UUID userId);
}
