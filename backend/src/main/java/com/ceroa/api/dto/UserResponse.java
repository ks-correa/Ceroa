package com.ceroa.api.dto;

import com.ceroa.domain.UserPlan;

import java.time.LocalDate;
import java.util.UUID;

public record UserResponse(
        UUID id,
        String fullName,
        String email,
        String phone,
        LocalDate birthDate,
        UserPlan plan,
        String billingCycle
) {}
