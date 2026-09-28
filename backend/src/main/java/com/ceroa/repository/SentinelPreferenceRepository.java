package com.ceroa.repository;
import com.ceroa.domain.SentinelPreference;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
public interface SentinelPreferenceRepository extends JpaRepository<SentinelPreference,UUID> {}
