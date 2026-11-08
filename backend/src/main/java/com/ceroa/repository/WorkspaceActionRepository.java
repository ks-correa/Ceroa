package com.ceroa.repository;
import com.ceroa.domain.WorkspaceAction;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import java.util.*;
public interface WorkspaceActionRepository extends JpaRepository<WorkspaceAction,UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select a from WorkspaceAction a where a.ownerId=:owner and a.confirmationCode=:code")
    Optional<WorkspaceAction> byCode(UUID owner,String code);
    long countByOwnerIdAndStatusAndExpiresAtAfter(UUID owner,String status,java.time.OffsetDateTime now);
}
