package com.ceroa.repository;

import com.ceroa.domain.AutomationRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface AutomationRequestRepository extends JpaRepository<AutomationRequest, UUID> {
    Optional<AutomationRequest> findByTokenIdAndRequestKey(UUID tokenId, UUID requestKey);
}
