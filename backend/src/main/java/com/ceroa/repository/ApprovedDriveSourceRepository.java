package com.ceroa.repository;
import com.ceroa.domain.ApprovedDriveSource;
import org.springframework.data.jpa.repository.*;
import jakarta.persistence.LockModeType;
import java.util.*;
public interface ApprovedDriveSourceRepository extends JpaRepository<ApprovedDriveSource,UUID>{
    @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select s from ApprovedDriveSource s where s.id=:id") Optional<ApprovedDriveSource> locked(UUID id);
}
