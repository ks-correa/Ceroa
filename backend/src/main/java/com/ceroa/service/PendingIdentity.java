package com.ceroa.service;
import java.io.Serializable;
import java.time.Instant;
public record PendingIdentity(String provider, String issuer, String subject, String email, String fullName,
                              Instant expiresAt) implements Serializable {
    @Override public String toString() { return "PendingIdentity[REDACTED]"; }
}
