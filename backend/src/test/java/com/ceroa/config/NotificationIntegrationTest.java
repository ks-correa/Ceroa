package com.ceroa.config;

import com.ceroa.domain.User;
import com.ceroa.domain.UserPlan;
import com.ceroa.repository.DebtRepository;
import com.ceroa.repository.NotificationRepository;
import com.ceroa.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class NotificationIntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired UserRepository userRepository;
    @Autowired DebtRepository debtRepository;
    @Autowired NotificationRepository notificationRepository;

    private Cookie session;
    private UUID userId;

    @BeforeEach
    void setupUser() throws Exception {
        String email = "notif-test-" + UUID.randomUUID() + "@example.com";
        session = mvc.perform(post("/api/v1/auth/register").with(csrf())
                        .contentType("application/json")
                        .content(json.writeValueAsString(Map.of(
                                "fullName", "Usuario Notificaciones",
                                "email", email,
                                "phone", "+573001112233",
                                "birthDate", "1990-05-15",
                                "password", "Password!123",
                                "confirmPassword", "Password!123",
                                "acceptTerms", true,
                                "acceptPrivacy", true
                        ))))
                .andExpect(status().isOk())
                .andReturn().getResponse().getCookie("ceroa_session");

        User user = userRepository.findByEmailIgnoreCase(email).orElseThrow();
        user.setPlan(UserPlan.PLUS);
        userRepository.save(user);
        userId = user.getId();
    }

    @Test
    @DisplayName("HU-048: Próximos vencimientos se consultan con hitos temporales 7, 3 o 0 días")
    void upcomingDuesIncludeExactMilestones() throws Exception {
        LocalDate today = LocalDate.now();

        // 1. Crear deuda con vencimiento a 7 días
        String debtId = createDebt("Tarjeta Éxito", "500000", "50000", today.plusDays(7));

        mvc.perform(get("/api/v1/due-dates/upcoming").cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].debtId").value(debtId))
                .andExpect(jsonPath("$[0].debtName").value("Tarjeta Éxito"))
                .andExpect(jsonPath("$[0].daysUntilDue").value(7))
                .andExpect(jsonPath("$[0].reminderMilestone").value("SEVEN_DAYS"));

        // 2. Consultar vencimiento específico de la deuda
        mvc.perform(get("/api/v1/due-dates/upcoming/" + debtId).cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.debtId").value(debtId))
                .andExpect(jsonPath("$.reminderMilestone").value("SEVEN_DAYS"));
    }

    @Test
    @DisplayName("HU-049 & HU-050: Centro de notificaciones, contador unread y lectura idempotente")
    void notificationCenterAndIdempotentRead() throws Exception {
        LocalDate today = LocalDate.now();
        String debtId = createDebt("Crédito Bancolombia", "1000000", "120000", today.plusDays(3));

        // 1. Consultar centro de notificaciones (sincroniza automáticamente hito 3 días)
        String responseBody = mvc.perform(get("/api/v1/notifications").cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount").value(1))
                .andExpect(jsonPath("$.notifications", hasSize(1)))
                .andExpect(jsonPath("$.notifications[0].relatedDebtId").value(debtId))
                .andExpect(jsonPath("$.notifications[0].read").value(false))
                .andReturn().getResponse().getContentAsString();

        String notificationId = json.readTree(responseBody).get("notifications").get(0).get("id").asText();

        // 2. Consultar unread-count dedicado
        mvc.perform(get("/api/v1/notifications/unread-count").cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount").value(1));

        // 3. Marcar como leída (HU-050)
        mvc.perform(patch("/api/v1/notifications/" + notificationId + "/read").cookie(session).with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(notificationId))
                .andExpect(jsonPath("$.read").value(true))
                .andExpect(jsonPath("$.unreadCount").value(0));

        // 4. Idempotencia: marcar por segunda vez no debe generar error y conserva estado
        mvc.perform(patch("/api/v1/notifications/" + notificationId + "/read").cookie(session).with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.read").value(true))
                .andExpect(jsonPath("$.unreadCount").value(0));
    }

    @Test
    @DisplayName("HU-050: Usuario A no puede marcar ni acceder a notificaciones del Usuario B")
    void isolationBetweenUsers() throws Exception {
        LocalDate today = LocalDate.now();
        createDebt("Deuda Usuario A", "500000", "50000", today.plusDays(0));

        String userAResponse = mvc.perform(get("/api/v1/notifications").cookie(session))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String notifIdA = json.readTree(userAResponse).get("notifications").get(0).get("id").asText();

        // Registrar Usuario B
        String emailB = "user-b-" + UUID.randomUUID() + "@example.com";
        Cookie sessionB = mvc.perform(post("/api/v1/auth/register").with(csrf())
                        .contentType("application/json")
                        .content(json.writeValueAsString(Map.of(
                                "fullName", "Usuario B",
                                "email", emailB,
                                "phone", "+573005554433",
                                "birthDate", "1991-01-01",
                                "password", "Password!123",
                                "confirmPassword", "Password!123",
                                "acceptTerms", true,
                                "acceptPrivacy", true
                        ))))
                .andExpect(status().isOk())
                .andReturn().getResponse().getCookie("ceroa_session");

        // Usuario B intenta marcar como leída la notificación de Usuario A -> 404
        mvc.perform(patch("/api/v1/notifications/" + notifIdA + "/read").cookie(sessionB).with(csrf()))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("HU-051: Ingesta de recordatorio Telegram con deduplicación y verificación de plan PLUS")
    void externalTelegramReminderWithDeduplicationPlusPlan() throws Exception {
        LocalDate today = LocalDate.now();
        String debtId = createDebt("Crédito Vehicular", "20000000", "450000", today.plusDays(3));

        // 1. Sincronizar evento de vencimiento (genera notificación interna inicial)
        mvc.perform(get("/api/v1/notifications").cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount").value(1));

        String eventKey = "DUE_MILESTONE:" + debtId + ":" + today.plusDays(3) + ":THREE_DAYS";

        // 2. Ingestar recordatorio Telegram correspondiente al mismo evento financiero
        mvc.perform(post("/api/v1/notifications/external-reminder")
                        .cookie(session).with(csrf())
                        .contentType("application/json")
                        .content(json.writeValueAsString(Map.of(
                                "debtId", debtId,
                                "title", "Recordatorio Telegram: Crédito Vehicular",
                                "message", "Recordatorio enviado por Telegram para el vencimiento en 3 días.",
                                "eventDate", today.plusDays(3).toString(),
                                "channel", "TELEGRAM",
                                "eventKey", eventKey
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.channel").value("TELEGRAM"))
                .andExpect(jsonPath("$.planRestricted").value(false));

        // 3. Verificar deduplicación: NO debe existir duplicado en el centro de notificaciones
        mvc.perform(get("/api/v1/notifications").cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.notifications", hasSize(1)))
                .andExpect(jsonPath("$.notifications[0].channel").value("TELEGRAM"));
    }

    @Test
    @DisplayName("HU-051: Plan CERO restringe recordatorios externos (RQF-027) sin simular entrega")
    void planCeroRestrictsExternalReminders() throws Exception {
        User user = userRepository.findById(userId).orElseThrow();
        user.setPlan(UserPlan.CERO);
        userRepository.save(user);

        LocalDate eventDate = LocalDate.now().plusDays(7);

        mvc.perform(post("/api/v1/notifications/external-reminder")
                        .cookie(session).with(csrf())
                        .contentType("application/json")
                        .content(json.writeValueAsString(Map.of(
                                "title", "Recordatorio externo Telegram",
                                "message", "Intento de entrega externa",
                                "eventDate", eventDate.toString(),
                                "channel", "TELEGRAM",
                                "eventKey", "EXT_CERO:" + UUID.randomUUID()
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.channel").value("TELEGRAM"))
                .andExpect(jsonPath("$.planRestricted").value(true));
    }

    @Test
    @DisplayName("Eliminar una deuda no rompe el centro de notificaciones históricas (ON DELETE SET NULL)")
    void deletingDebtPreservesHistoricalNotificationsSafely() throws Exception {
        LocalDate today = LocalDate.now();
        String debtId = createDebt("Obligación a Eliminar", "300000", "50000", today);

        // Generar notificación para la deuda
        mvc.perform(get("/api/v1/notifications").cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.notifications", hasSize(1)));

        // Eliminar la deuda
        mvc.perform(delete("/api/v1/debts/" + debtId).cookie(session).with(csrf()))
                .andExpect(status().isNoContent());

        // Consultar centro de notificaciones nuevamente: no debe fallar, conserva snapshot del nombre y relatedDebtId es null
        mvc.perform(get("/api/v1/notifications").cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.notifications", hasSize(1)))
                .andExpect(jsonPath("$.notifications[0].relatedDebtId").doesNotExist())
                .andExpect(jsonPath("$.notifications[0].relatedDebtName").value("Obligación a Eliminar"));
    }

    private String createDebt(String name, String balance, String monthlyPayment, LocalDate nextDueDate) throws Exception {
        java.util.Map<String, Object> payload = new java.util.LinkedHashMap<>();
        payload.put("name", name);
        payload.put("entity", "Banco Ceroa");
        payload.put("type", com.ceroa.domain.DebtType.PERSONAL_LOAN.name());
        payload.put("categoryLabel", "Préstamo personal");
        payload.put("originalAmount", new java.math.BigDecimal(balance).multiply(new java.math.BigDecimal("1.2")));
        payload.put("currentBalance", new java.math.BigDecimal(balance));
        payload.put("interestRate", new java.math.BigDecimal("18.0"));
        payload.put("rateType", com.ceroa.domain.RateType.EA.name());
        payload.put("monthlyPayment", new java.math.BigDecimal(monthlyPayment));
        payload.put("termRemainingMonths", 12);
        payload.put("disbursementDate", LocalDate.now().minusMonths(2).toString());
        payload.put("nextDueDate", nextDueDate.toString());
        payload.put("details", java.util.Map.of("totalInstallments", 24));

        String resp = mvc.perform(post("/api/v1/debts").cookie(session).with(csrf())
                        .contentType("application/json")
                        .content(json.writeValueAsString(payload)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        return json.readTree(resp).get("id").asText();
    }
}
