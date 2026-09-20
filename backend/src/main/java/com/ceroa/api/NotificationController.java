package com.ceroa.api;

import com.ceroa.api.dto.*;
import com.ceroa.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/notifications")
@Tag(name = "Notifications", description = "Centro de notificaciones y eventos financieros (EP-12)")
public class NotificationController {

    private final NotificationService service;

    public NotificationController(NotificationService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "Consultar centro de notificaciones y contador de no leídas (HU-049)")
    public NotificationListResponse getNotifications() {
        return service.getNotifications();
    }

    @GetMapping("/unread-count")
    @Operation(summary = "Consultar únicamente el contador de notificaciones no leídas (HU-049)")
    public UnreadCountResponse getUnreadCount() {
        return service.getUnreadCount();
    }

    @PatchMapping("/{id}/read")
    @Operation(summary = "Marcar una notificación como leída de forma idempotente (HU-050)")
    public NotificationReadResponse markAsRead(@PathVariable UUID id) {
        return service.markAsRead(id);
    }

}

