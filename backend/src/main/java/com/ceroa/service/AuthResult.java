package com.ceroa.service;

import com.ceroa.api.dto.UserResponse;

public record AuthResult(String token, UserResponse user) {}
