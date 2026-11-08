package com.ceroa.repository;
import com.ceroa.domain.SupportBooking;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.util.*;
public interface SupportBookingRepository extends JpaRepository<SupportBooking,UUID>{
 @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select b from SupportBooking b where b.ownerId=:owner and b.code=:code") Optional<SupportBooking> owned(@Param("owner")UUID owner,@Param("code")String code);
}
