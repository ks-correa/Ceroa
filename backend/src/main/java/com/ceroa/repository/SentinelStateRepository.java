package com.ceroa.repository;
import com.ceroa.domain.SentinelState;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
public interface SentinelStateRepository extends JpaRepository<SentinelState,UUID> {}
