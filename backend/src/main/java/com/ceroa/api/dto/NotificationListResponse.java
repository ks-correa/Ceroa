package com.ceroa.api.dto;

import java.util.List;

public record NotificationListResponse(
        List<NotificationResponse> notifications,
        long unreadCount
) {}

