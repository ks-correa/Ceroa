package com.ceroa.repository;

import com.ceroa.domain.Debt;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DebtRepository extends JpaRepository<Debt, UUID> {
    List<Debt> findAllByUserIdOrderByCreatedAtDesc(UUID userId);
    Optional<Debt> findByIdAndUserId(UUID id, UUID userId);
    long countByUserId(UUID userId);
}
