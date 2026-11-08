package com.ceroa.repository;
import com.ceroa.domain.McpAccessToken;import java.util.*;import org.springframework.data.jpa.repository.JpaRepository;
public interface McpAccessTokenRepository extends JpaRepository<McpAccessToken,UUID>{Optional<McpAccessToken> findByTokenHash(String hash);Optional<McpAccessToken> findByIdAndOwnerId(UUID id,UUID ownerId);}
