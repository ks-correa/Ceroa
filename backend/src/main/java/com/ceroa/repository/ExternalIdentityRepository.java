package com.ceroa.repository;
import com.ceroa.domain.ExternalIdentity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;
public interface ExternalIdentityRepository extends JpaRepository<ExternalIdentity, UUID> {
    Optional<ExternalIdentity> findByProviderAndIssuerAndSubject(String provider, String issuer, String subject);
}
