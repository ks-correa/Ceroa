package com.ceroa.service;

import com.ceroa.api.dto.UserResponse;

public record AuthResult(String token, UserResponse user) {
    @Override public String toString() { return "AuthResult[REDACTED]"; }
}
