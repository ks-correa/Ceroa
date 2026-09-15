package com.ceroa.repository;

import com.ceroa.domain.Payment;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {
    @EntityGraph(attributePaths = {"debt"})
    List<Payment> findAllByDebtUserIdOrderByDateDescCreatedAtDesc(UUID userId);

    @EntityGraph(attributePaths = {"debt"})
    List<Payment> findAllByDebtIdAndDebtUserIdOrderByDateDescCreatedAtDesc(UUID debtId, UUID userId);

    @EntityGraph(attributePaths = {"debt"})
    Optional<Payment> findByIdAndDebtUserId(UUID id, UUID userId);

    long countByDebtId(UUID debtId);

    @Modifying
    @Query("DELETE FROM Payment p WHERE p.debt.id = :debtId")
    void deleteAllByDebtId(@Param("debtId") UUID debtId);

    @Query("""
            select payment.debt.id as debtId, count(payment.id) as paymentCount
            from Payment payment
            where payment.debt.id in :debtIds
            group by payment.debt.id
            """)
    List<DebtPaymentCount> countByDebtIds(@Param("debtIds") List<UUID> debtIds);

    interface DebtPaymentCount {
        UUID getDebtId();
        long getPaymentCount();
    }
}
