package com.ceroa.repository;
import com.ceroa.domain.ReminderPreference;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
public interface ReminderPreferenceRepository extends JpaRepository<ReminderPreference,UUID> {}
