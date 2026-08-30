package com.ceroa.repository;

import com.ceroa.domain.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {
    List<Payment> findAllByDebtUserIdOrderByDateDescCreatedAtDesc(UUID userId);
    List<Payment> findAllByDebtIdAndDebtUserIdOrderByDateDescCreatedAtDesc(UUID debtId, UUID userId);
    Optional<Payment> findByIdAndDebtUserId(UUID id, UUID userId);
    long countByDebtId(UUID debtId);
}
