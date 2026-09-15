package com.ceroa.config;

import com.ceroa.domain.*;
import com.ceroa.repository.DebtRepository;
import com.ceroa.repository.FinancialProfileRepository;
import com.ceroa.repository.PaymentRepository;
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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class SimulationIntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired UserRepository userRepository;
    @Autowired DebtRepository debtRepository;
    @Autowired FinancialProfileRepository profileRepository;
    @Autowired PaymentRepository paymentRepository;

    private Cookie sessionUserCero;
    private UUID userCeroId;

    private Cookie sessionUserPlus;
    private UUID userPlusId;

    private UUID plusDebtId;

    @BeforeEach
    void setup() throws Exception {
        // 1. Usuario Plan CERO
        String emailCero = "cero-sim-" + UUID.randomUUID() + "@example.com";
        sessionUserCero = registerUser(emailCero);
        userCeroId = userRepository.findByEmailIgnoreCase(emailCero).orElseThrow().getId();

        // 2. Usuario Plan PLUS
        String emailPlus = "plus-sim-" + UUID.randomUUID() + "@example.com";
        sessionUserPlus = registerUser(emailPlus);
        User plusUser = userRepository.findByEmailIgnoreCase(emailPlus).orElseThrow();
        plusUser.setPlan(UserPlan.PLUS);
        userRepository.save(plusUser);
        userPlusId = plusUser.getId();

        // Crear perfil financiero con estrategia activa SNOWBALL
        FinancialProfile profile = new FinancialProfile();
        profile.setUser(plusUser);
        profile.setMonthlyIncome(new BigDecimal("5000000"));
        profile.setEssentialExpenses(new BigDecimal("2000000"));
        profile.setAvailableForDebts(new BigDecimal("1000000"));
        profile.setTotalDeclaredDebts(1);
        profile.setActiveStrategy(StrategyType.SNOWBALL);
        profileRepository.save(profile);

        // Crear deuda para el usuario Plus
        plusDebtId = createDebt(
                sessionUserPlus,
                "Crédito Libre Destino",
                new BigDecimal("5000000"),
                new BigDecimal("24.0"),
                RateType.EA,
                new BigDecimal("350000")
        );
    }

    private Cookie registerUser(String email) throws Exception {
        return mvc.perform(post("/api/v1/auth/register").with(csrf())
                        .contentType("application/json")
                        .content(json.writeValueAsString(Map.of(
                                "fullName", "Simulation User",
                                "email", email,
                                "phone", "+573009988776",
                                "birthDate", "1992-03-10",
                                "password", "Password!123",
                                "confirmPassword", "Password!123",
                                "acceptTerms", true,
                                "acceptPrivacy", true
                        ))))
                .andExpect(status().isOk())
                .andReturn().getResponse().getCookie("ceroa_session");
    }

    private UUID createDebt(Cookie session, String name, BigDecimal balance, BigDecimal rate, RateType rateType, BigDecimal monthlyPayment) throws Exception {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("name", name);
        payload.put("entity", "Bancolombia");
        payload.put("type", "PERSONAL_LOAN");
        payload.put("originalAmount", balance);
        payload.put("currentBalance", balance);
        payload.put("interestRate", rate);
        payload.put("rateType", rateType.name());
        payload.put("monthlyPayment", monthlyPayment);
        payload.put("termRemainingMonths", 24);
        payload.put("disbursementDate", LocalDate.now().minusMonths(6).toString());
        payload.put("nextDueDate", LocalDate.now().plusDays(15).toString());
        payload.put("details", Map.of("totalInstallments", 36));

        String response = mvc.perform(post("/api/v1/debts").with(csrf()).cookie(session)
                        .contentType("application/json")
                        .content(json.writeValueAsString(payload)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        return UUID.fromString(json.readTree(response).get("id").asText());
    }

    @Test
    @DisplayName("Seguridad: Petición no autenticada es rechazada con 401")
    void rejectsUnauthenticatedSimulation() throws Exception {
        Map<String, Object> payload = Map.of(
                "debtId", plusDebtId,
                "strategy", "SNOWBALL",
                "events", List.of()
        );

        mvc.perform(post("/api/v1/simulations").with(csrf())
                        .contentType("application/json")
                        .content(json.writeValueAsString(payload)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("HU-045 CA-01: Usuario con Plan Cero es rechazado con error controlado (PLAN_RESTRICTED)")
    void rejectsPlanCeroUser() throws Exception {
        Map<String, Object> payload = Map.of(
                "debtId", plusDebtId,
                "strategy", "SNOWBALL",
                "events", List.of(Map.of("period", 1, "extraPayment", 100000))
        );

        mvc.perform(post("/api/v1/simulations").with(csrf()).cookie(sessionUserCero)
                        .contentType("application/json")
                        .content(json.writeValueAsString(payload)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("PLAN_RESTRICTED"))
                .andExpect(jsonPath("$.message").value(containsString("exclusiva de Ceroa Plus")));
    }

    @Test
    @DisplayName("HU-045 CA-01 & CA-02: Usuario no puede simular deuda de otro usuario (404)")
    void rejectsSimulationOfOtherUsersDebt() throws Exception {
        // Crear segundo usuario Plus
        String otherEmail = "other-plus-" + UUID.randomUUID() + "@example.com";
        Cookie otherSession = registerUser(otherEmail);
        User otherUser = userRepository.findByEmailIgnoreCase(otherEmail).orElseThrow();
        otherUser.setPlan(UserPlan.PLUS);
        userRepository.save(otherUser);

        Map<String, Object> payload = Map.of(
                "debtId", plusDebtId, // Deuda de plusUser
                "strategy", "SNOWBALL",
                "events", List.of()
        );

        // otherUser intenta simular la deuda de plusUser
        mvc.perform(post("/api/v1/simulations").with(csrf()).cookie(otherSession)
                        .contentType("application/json")
                        .content(json.writeValueAsString(payload)))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("HU-046: Simulación exitosa compara Baseline vs Simulado y desglosa periodos")
    void successfulSimulationComparisonAndPeriods() throws Exception {
        Map<String, Object> payload = Map.of(
                "debtId", plusDebtId,
                "strategy", "AVALANCHE",
                "events", List.of(
                        Map.of("period", 1, "extraPayment", 1000000),
                        Map.of("period", 3, "modifiedMonthlyPayment", 400000)
                )
        );

        mvc.perform(post("/api/v1/simulations").with(csrf()).cookie(sessionUserPlus)
                        .contentType("application/json")
                        .content(json.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.simulatedStrategy").value("avalanche"))
                .andExpect(jsonPath("$.debt.id").value(plusDebtId.toString()))
                .andExpect(jsonPath("$.debt.name").value("Crédito Libre Destino"))
                // Baseline y Simulated diferenciados
                .andExpect(jsonPath("$.baseline.estimatedMonths").isNumber())
                .andExpect(jsonPath("$.baseline.totalInterest").isNumber())
                .andExpect(jsonPath("$.baseline.estimatedPayoffDate").isString())
                .andExpect(jsonPath("$.simulated.estimatedMonths").isNumber())
                .andExpect(jsonPath("$.simulated.totalInterest").isNumber())
                .andExpect(jsonPath("$.simulated.estimatedPayoffDate").isString())
                // Diferencias estimadas
                .andExpect(jsonPath("$.differences.monthsReduced").isNumber())
                .andExpect(jsonPath("$.differences.monthsReduced", greaterThan(0)))
                .andExpect(jsonPath("$.differences.estimatedInterestSavings", greaterThan(0)))
                // Periodos
                .andExpect(jsonPath("$.periods", hasSize(greaterThan(0))))
                .andExpect(jsonPath("$.periods[0].period").value(1))
                .andExpect(jsonPath("$.periods[0].extraPayment").value(1000000.0))
                .andExpect(jsonPath("$.periods[0].openingBalance").isNumber())
                .andExpect(jsonPath("$.periods[0].normalPayment").isNumber())
                .andExpect(jsonPath("$.periods[0].interest").isNumber())
                .andExpect(jsonPath("$.periods[0].principal").isNumber())
                .andExpect(jsonPath("$.periods[0].closingBalance").isNumber())
                // Supuestos
                .andExpect(jsonPath("$.assumptions", hasSize(greaterThan(0))));
    }

    @Test
    @DisplayName("HU-047 & INMUTABILIDAD: Ejecución de simulación no modifica datos reales (deudas, saldos, pagos, estrategia activa)")
    void strictlyEnforcesImmutabilityAcrossOperations() throws Exception {
        // Snapshot inicial
        Debt debtBefore = debtRepository.findById(plusDebtId).orElseThrow();
        BigDecimal balanceBefore = debtBefore.getCurrentBalance();
        var updatedAtBefore = debtBefore.getUpdatedAt();
        long paymentsCountBefore = paymentRepository.count();
        FinancialProfile profileBefore = profileRepository.findByUserId(userPlusId).orElseThrow();
        StrategyType activeStrategyBefore = profileBefore.getActiveStrategy();

        // Ejecutar simulación con estrategia AVALANCHE (diferente a la activa SNOWBALL) y con eventos de pagos
        Map<String, Object> payload1 = Map.of(
                "debtId", plusDebtId,
                "strategy", "AVALANCHE",
                "events", List.of(
                        Map.of("period", 1, "extraPayment", 2000000),
                        Map.of("period", 2, "modifiedMonthlyPayment", 500000)
                )
        );

        mvc.perform(post("/api/v1/simulations").with(csrf()).cookie(sessionUserPlus)
                        .contentType("application/json")
                        .content(json.writeValueAsString(payload1)))
                .andExpect(status().isOk());

        // Modificar escenario con otros montos (HU-047)
        Map<String, Object> payload2 = Map.of(
                "debtId", plusDebtId,
                "strategy", "AVALANCHE",
                "events", List.of(
                        Map.of("period", 1, "extraPayment", 500000)
                )
        );

        mvc.perform(post("/api/v1/simulations").with(csrf()).cookie(sessionUserPlus)
                        .contentType("application/json")
                        .content(json.writeValueAsString(payload2)))
                .andExpect(status().isOk());

        // Snapshot posterior: comprobar inmutabilidad estricta
        Debt debtAfter = debtRepository.findById(plusDebtId).orElseThrow();
        FinancialProfile profileAfter = profileRepository.findByUserId(userPlusId).orElseThrow();

        // 1. Saldo de la deuda intacto
        assertThat(debtAfter.getCurrentBalance()).isEqualByComparingTo(balanceBefore);
        // 2. Fecha de actualización de la entidad deuda no mutada
        assertThat(debtAfter.getUpdatedAt()).isEqualTo(updatedAtBefore);
        // 3. Ningún pago persistido en la tabla payments
        assertThat(paymentRepository.count()).isEqualTo(paymentsCountBefore);
        // 4. Estrategia activa del perfil financiero NO modificada
        assertThat(profileAfter.getActiveStrategy()).isEqualTo(activeStrategyBefore);
    }
}
