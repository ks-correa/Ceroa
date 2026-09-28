package com.ceroa.repository;
import com.ceroa.domain.SentinelApproval;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.util.*;
public interface SentinelApprovalRepository extends JpaRepository<SentinelApproval,UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select a from SentinelApproval a where a.id=:id")
    Optional<SentinelApproval> lock(@Param("id") UUID id);
    long countByUserIdAndStatus(UUID userId,String status);
    List<SentinelApproval> findAllByUserIdAndStatus(UUID userId,String status);
}
