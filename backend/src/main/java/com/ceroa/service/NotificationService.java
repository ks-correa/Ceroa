package com.ceroa.service;

import com.ceroa.api.dto.*;
import com.ceroa.domain.Debt;
import com.ceroa.domain.Notification;
import com.ceroa.domain.ReminderMilestone;
import com.ceroa.domain.User;
import com.ceroa.domain.UserPlan;
import com.ceroa.exception.ResourceNotFoundException;
import com.ceroa.repository.DebtRepository;
import com.ceroa.repository.NotificationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final DebtRepository debtRepository;
    private final UpcomingDueService upcomingDueService;
    private final CurrentUserService currentUser;

    public NotificationService(
            NotificationRepository notificationRepository,
            DebtRepository debtRepository,
            UpcomingDueService upcomingDueService,
            CurrentUserService currentUser) {
        this.notificationRepository = notificationRepository;
        this.debtRepository = debtRepository;
        this.upcomingDueService = upcomingDueService;
        this.currentUser = currentUser;
    }

    @Transactional
    public NotificationListResponse getNotifications() {
        User user = currentUser.entity();
        syncMilestoneNotifications(user);

        List<Notification> notifications = notificationRepository.findAllByUserIdOrderByCreatedAtDesc(user.getId());
        long unreadCount = notificationRepository.countByUserIdAndReadFalse(user.getId());

        List<NotificationResponse> dtos = notifications.stream()
                .map(this::toResponse)
                .toList();

        return new NotificationListResponse(dtos, unreadCount);
    }

    @Transactional(readOnly = true)
    public UnreadCountResponse getUnreadCount() {
        long count = notificationRepository.countByUserIdAndReadFalse(currentUser.id());
        return new UnreadCountResponse(count);
    }

    @Transactional
    public NotificationReadResponse markAsRead(UUID id) {
        UUID userId = currentUser.id();
        Notification notification = notificationRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Notificación no encontrada o no autorizada"));

        notification.markAsRead();
        notificationRepository.save(notification);

        long unreadCount = notificationRepository.countByUserIdAndReadFalse(userId);
        return new NotificationReadResponse(
                notification.getId(),
                notification.isRead(),
                notification.getReadAt(),
                unreadCount
        );
    }

    @Transactional
    public NotificationResponse registerExternalReminder(ExternalReminderRequest request) {
        User user = currentUser.entity();
        boolean isPlanRestricted = user.getPlan() == UserPlan.CERO;

        String channel = (request.channel() != null && !request.channel().isBlank())
                ? request.channel().toUpperCase()
                : "TELEGRAM";

        String eventKey = request.eventKey();
        if (eventKey == null || eventKey.isBlank()) {
            eventKey = "EXT_REMINDER:" + (request.debtId() != null ? request.debtId() : "GEN") + ":" + request.eventDate();
        }

        // Deduplicación por eventKey para evitar duplicados del mismo evento financiero
        Notification notification = notificationRepository.findByUserIdAndEventKey(user.getId(), eventKey).orElse(null);

        if (notification != null) {
            // Actualizar notificación existente con el canal externo
            notification.setChannel(channel);
            notification.setPlanRestricted(isPlanRestricted);
            if (request.title() != null && !request.title().isBlank()) {
                notification.setTitle(request.title());
            }
            if (request.message() != null && !request.message().isBlank()) {
                notification.setMessage(request.message());
            }
            return toResponse(notificationRepository.save(notification));
        }

        Debt relatedDebt = null;
        String relatedDebtName = null;
        if (request.debtId() != null) {
            relatedDebt = debtRepository.findByIdAndUserId(request.debtId(), user.getId()).orElse(null);
            if (relatedDebt != null) {
                relatedDebtName = relatedDebt.getName();
            }
        }

        Notification newNotification = new Notification();
        newNotification.setUser(user);
        newNotification.setType("DUE_DATE_REMINDER");
        newNotification.setTitle(request.title() != null ? request.title() : "Recordatorio de vencimiento");
        newNotification.setMessage(request.message() != null ? request.message() : "Tienes un vencimiento programado.");
        newNotification.setEventDate(request.eventDate() != null ? request.eventDate() : LocalDate.now());
        newNotification.setRelatedDebt(relatedDebt);
        newNotification.setRelatedDebtName(relatedDebtName);
        newNotification.setChannel(channel);
        newNotification.setEventKey(eventKey);
        newNotification.setPlanRestricted(isPlanRestricted);
        newNotification.setRead(false);

        return toResponse(notificationRepository.save(newNotification));
    }

    @Transactional
    public void syncMilestoneNotifications(User user) {
        LocalDate today = LocalDate.now();
        List<UpcomingDueResponse> upcomingDues = upcomingDueService.getUpcomingDues(user.getId(), today);

        for (UpcomingDueResponse due : upcomingDues) {
            if (due.reminderMilestone() == null || due.reminderMilestone() == ReminderMilestone.NONE) {
                continue;
            }

            String eventKey = "DUE_MILESTONE:" + due.debtId() + ":" + due.dueDate() + ":" + due.reminderMilestone().name();
            if (notificationRepository.findByUserIdAndEventKey(user.getId(), eventKey).isPresent()) {
                continue;
            }

            Debt debt = debtRepository.findByIdAndUserId(due.debtId(), user.getId()).orElse(null);
            if (debt == null) continue;

            String milestoneText = switch (due.reminderMilestone()) {
                case SEVEN_DAYS -> "vence en 7 días";
                case THREE_DAYS -> "vence en 3 días";
                case DUE_TODAY -> "vence hoy";
                case NONE -> "";
            };

            String formattedAmount = formatCurrency(due.amount());
            String title = "Vencimiento próximo: " + due.debtName();
            String message = "Tu obligación con " + due.debtName() + " (" + due.entity() + ") "
                    + milestoneText + " (" + due.dueDate() + "). Monto exigible: " + formattedAmount + ".";

            Notification notification = new Notification();
            notification.setUser(user);
            notification.setType("DUE_DATE_REMINDER");
            notification.setTitle(title);
            notification.setMessage(message);
            notification.setEventDate(due.dueDate());
            notification.setRelatedDebt(debt);
            notification.setRelatedDebtName(due.debtName());
            notification.setChannel("IN_APP");
            notification.setEventKey(eventKey);
            notification.setPlanRestricted(false);
            notification.setRead(false);

            notificationRepository.save(notification);
        }
    }

    public NotificationResponse toResponse(Notification n) {
        return new NotificationResponse(
                n.getId(),
                n.getType(),
                n.getTitle(),
                n.getMessage(),
                n.getEventDate(),
                n.getRelatedDebt() != null ? n.getRelatedDebt().getId() : null,
                n.getRelatedDebtName(),
                n.isRead(),
                n.getReadAt(),
                n.getChannel(),
                n.getEventKey(),
                n.isPlanRestricted(),
                n.getCreatedAt()
        );
    }

    private String formatCurrency(BigDecimal amount) {
        if (amount == null) return "$0";
        NumberFormat nf = NumberFormat.getCurrencyInstance(Locale.forLanguageTag("es-CO"));
        nf.setMaximumFractionDigits(0);
        return nf.format(amount);
    }
}

