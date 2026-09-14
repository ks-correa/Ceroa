package com.ceroa.domain;

import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "users")
public class User {
    @Column(name = "password_changed_at")
    private OffsetDateTime passwordChangedAt;
    public OffsetDateTime getPasswordChangedAt() { return passwordChangedAt; }
    public void setPasswordChangedAt(OffsetDateTime value) { passwordChangedAt = value; }

    @Id
    private UUID id;

    @Column(name = "full_name", nullable = false, length = 160)
    private String fullName;

    @Column(nullable = false, unique = true, length = 254)
    private String email;

    @Column(length = 30)
    private String phone;

    @Column(name = "document_id", length = 50)
    private String documentId;

    @Column(name = "birth_date")
    private LocalDate birthDate;

    @Column(name = "password_hash", length = 100)
    private String passwordHash;

    @Column(name = "initial_setup_complete", nullable = false)
    private boolean initialSetupComplete;

    @Column(name = "terms_accepted_at")
    private OffsetDateTime termsAcceptedAt;

    @Column(name = "privacy_accepted_at")
    private OffsetDateTime privacyAcceptedAt;

    public boolean isInitialSetupComplete() { return initialSetupComplete; }
    public void setInitialSetupComplete(boolean value) { initialSetupComplete = value; }
    public OffsetDateTime getTermsAcceptedAt() { return termsAcceptedAt; }
    public void setTermsAcceptedAt(OffsetDateTime value) { termsAcceptedAt = value; }
    public OffsetDateTime getPrivacyAcceptedAt() { return privacyAcceptedAt; }
    public void setPrivacyAcceptedAt(OffsetDateTime value) { privacyAcceptedAt = value; }

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserPlan plan = UserPlan.CERO;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    public User() {}

    @PrePersist
    void onCreate() {
        OffsetDateTime now = OffsetDateTime.now();
        if (id == null) id = UUID.randomUUID();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getDocumentId() { return documentId; }
    public void setDocumentId(String documentId) { this.documentId = documentId; }
    public LocalDate getBirthDate() { return birthDate; }
    public void setBirthDate(LocalDate birthDate) { this.birthDate = birthDate; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public UserPlan getPlan() { return plan; }
    public void setPlan(UserPlan plan) { this.plan = plan; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}
