package com.ceroa.repository;
import com.ceroa.domain.DriveSyncFile;
import org.springframework.data.jpa.repository.*;
import jakarta.persistence.LockModeType;
import java.util.*;
public interface DriveSyncFileRepository extends JpaRepository<DriveSyncFile,UUID>{
    Optional<DriveSyncFile> findBySourceIdAndFileId(UUID source,String file);
    @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select f from DriveSyncFile f where f.id=:id") Optional<DriveSyncFile> locked(UUID id);
}
