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
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class StrategyIntegrationTest {

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

    @BeforeEach
    void setupUsers() throws Exception {
        // Usuario 1: Plan CERO
        String emailCero = "cero-" + UUID.randomUUID() + "@example.com";
        sessionUserCero = registerUser(emailCero);
        userCeroId = userRepository.findByEmailIgnoreCase(emailCero).orElseThrow().getId();

        // Usuario 2: Plan PLUS
        String emailPlus = "plus-" + UUID.randomUUID() + "@example.com";
        sessionUserPlus = registerUser(emailPlus);
        User plusUser = userRepository.findByEmailIgnoreCase(emailPlus).orElseThrow();
        plusUser.setPlan(UserPlan.PLUS);
        userRepository.save(plusUser);
        userPlusId = plusUser.getId();
    }

    private Cookie registerUser(String email) throws Exception {
        return mvc.perform(post("/api/v1/auth/register").with(csrf())
                        .contentType("application/json")
                        .content(json.writeValueAsString(Map.of(
                                "fullName", "Strategy Test User",
                                "email", email,
                                "phone", "+573001112233",
                                "birthDate", "1995-05-15",
                                "password", "Password!123",
                                "confirmPassword", "Password!123",
                                "acceptTerms", true,
                                "acceptPrivacy", true
                        ))))
                .andExpect(status().isOk())
                .andReturn().getResponse().getCookie("ceroa_session");
    }

    private void createFinancialProfile(Cookie session, BigDecimal income, BigDecimal expenses, BigDecimal available, int declaredDebts, StrategyType strategy) throws Exception {
        mvc.perform(put("/api/v1/financial-profile").with(csrf()).cookie(session)
                        .contentType("application/json")
                        .content(json.writeValueAsString(Map.of(
                                "monthlyIncome", income,
                                "fixedExpenses", expenses,
                                "availableMoney", available,
                                "totalDeclaredDebts", declaredDebts,
                                "activeStrategy", strategy.value()
                        ))))
                .andExpect(status().isOk());
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
        payload.put("termRemainingMonths", 12);
        payload.put("disbursementDate", java.time.LocalDate.now().minusMonths(6).toString());
        payload.put("nextDueDate", java.time.LocalDate.now().plusDays(15).toString());
        payload.put("details", Map.of("totalInstallments", 24));

        String response = mvc.perform(post("/api/v1/debts").with(csrf()).cookie(session)
                        .contentType("application/json")
                        .content(json.writeValueAsString(payload)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        return UUID.fromString(json.readTree(response).get("id").asText());
    }

    @Test
    void manualPriorityPersistsAndCanBeReset() throws Exception {
        createFinancialProfile(sessionUserCero, new BigDecimal("4000000"), new BigDecimal("2000000"), new BigDecimal("500000"), 2, StrategyType.SNOWBALL);
        UUID small = createDebt(sessionUserCero, "Small", new BigDecimal("500000"), new BigDecimal("20"), RateType.EA, new BigDecimal("100000"));
        UUID large = createDebt(sessionUserCero, "Large", new BigDecimal("1500000"), new BigDecimal("25"), RateType.EA, new BigDecimal("100000"));
        mvc.perform(put("/api/v1/strategies/priority").with(csrf()).cookie(sessionUserCero)
                        .contentType("application/json").content(json.writeValueAsString(Map.of("debtId", large))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.priorityDebt.id").value(large.toString()))
                .andExpect(jsonPath("$.priorityDebt.recommendedPayment").value(400000));
        mvc.perform(get("/api/v1/strategies/active").cookie(sessionUserCero))
                .andExpect(status().isOk()).andExpect(jsonPath("$.priorityDebt.id").value(large.toString()));
        mvc.perform(put("/api/v1/strategies/priority").with(csrf()).cookie(sessionUserPlus)
                        .contentType("application/json").content(json.writeValueAsString(Map.of("debtId", large))))
                .andExpect(status().isUnprocessableEntity());
        mvc.perform(put("/api/v1/strategies/priority").with(csrf()).cookie(sessionUserCero)
                        .contentType("application/json").content("{\"debtId\":null}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.priorityDebt.id").value(small.toString()));
    }

    @Test
    @DisplayName("HU-039 CA-01 a CA-08: Cambiar estrategia persiste correctamente, rechaza sin deudas y no muta saldos")
    void hu039_changeStrategySuccessfullyAndEnforcesInvariance() throws Exception {
        createFinancialProfile(sessionUserCero, new BigDecimal("4000000"), new BigDecimal("2000000"), new BigDecimal("500000"), 2, StrategyType.SNOWBALL);

        // Sin deudas aún: debe fallar cambio de estrategia
        mvc.perform(put("/api/v1/strategies/active").with(csrf()).cookie(sessionUserCero)
                        .param("strategy", "AVALANCHE"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message").value(containsString("al menos una deuda registrada")));

        // Crear una deuda
        UUID debtId = createDebt(sessionUserCero, "Tarjeta Éxito", new BigDecimal("1500000"), new BigDecimal("26.0"), RateType.EA, new BigDecimal("120000"));

        // Capturar saldos antes del cambio
        Debt debtBefore = debtRepository.findById(debtId).orElseThrow();
        BigDecimal balanceBefore = debtBefore.getCurrentBalance();
        long paymentsBefore = paymentRepository.count();

        // Cambiar a Avalancha
        mvc.perform(put("/api/v1/strategies/active").with(csrf()).cookie(sessionUserCero)
                        .param("strategy", "AVALANCHE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activeStrategy").value("avalanche"))
                .andExpect(jsonPath("$.status").value("SUCCESS"));

        // Verificar persistencia en perfil financiero
        FinancialProfile profile = profileRepository.findByUserId(userCeroId).orElseThrow();
        assertThat(profile.getActiveStrategy()).isEqualTo(StrategyType.AVALANCHE);

        // CA-07 Inmutabilidad: saldos y pagos NO fueron modificados
        Debt debtAfter = debtRepository.findById(debtId).orElseThrow();
        assertThat(debtAfter.getCurrentBalance()).isEqualByComparingTo(balanceBefore);
        assertThat(paymentRepository.count()).isEqualTo(paymentsBefore);
    }

    @Test
    @DisplayName("HU-040: Usuario Cero consulta estrategia básica limitada a máx 2 deudas sin detalle Plus ni comparativa")
    void hu040_planCeroGetsBasicStrategyWithoutPlusDetails() throws Exception {
        createFinancialProfile(sessionUserCero, new BigDecimal("5000000"), new BigDecimal("2000000"), new BigDecimal("800000"), 2, StrategyType.SNOWBALL);

        createDebt(sessionUserCero, "Crédito 1", new BigDecimal("800000"), new BigDecimal("20.0"), RateType.EA, new BigDecimal("100000"));
        createDebt(sessionUserCero, "Crédito 2", new BigDecimal("1500000"), new BigDecimal("24.0"), RateType.EA, new BigDecimal("150000"));

        mvc.perform(get("/api/v1/strategies/active").cookie(sessionUserCero))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.plan").value("CERO"))
                .andExpect(jsonPath("$.activeStrategy").value("snowball"))
                .andExpect(jsonPath("$.consideredDebtsCount").value(2))
                .andExpect(jsonPath("$.orderedDebts", hasSize(2)))
                .andExpect(jsonPath("$.priorityDebt.name").value("Crédito 1"))
                .andExpect(jsonPath("$.summaryProjection.available").value(true))
                // CA-06: detalle avanzado Plus no disponible
                .andExpect(jsonPath("$.orderedDebts[0].projectedInterest").doesNotExist())
                .andExpect(jsonPath("$.orderedDebts[0].estimatedPayoffDate").doesNotExist())
                .andExpect(jsonPath("$.orderedDebts[0].extraPayment").doesNotExist())
                .andExpect(jsonPath("$.globalProjection").doesNotExist())
                .andExpect(jsonPath("$.comparison").doesNotExist());

        // Cero intentando acceder al endpoint de comparación directa debe ser denegado
        mvc.perform(get("/api/v1/strategies/comparison").cookie(sessionUserCero))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message").value(containsString("requiere el plan Ceroa Plus")));
    }

    @Test
    @DisplayName("HU-041: Usuario Plus consulta estrategia completa con todas las deudas, proyecciones detalladas y comparativa")
    void hu041_planPlusGetsFullStrategyWithProjectionsAndComparison() throws Exception {
        createFinancialProfile(sessionUserPlus, new BigDecimal("6000000"), new BigDecimal("2000000"), new BigDecimal("1000000"), 3, StrategyType.SNOWBALL);

        createDebt(sessionUserPlus, "D1 Menor", new BigDecimal("500000"), new BigDecimal("25.0"), RateType.EA, new BigDecimal("80000"));
        createDebt(sessionUserPlus, "D2 Mediana", new BigDecimal("1200000"), new BigDecimal("22.0"), RateType.EA, new BigDecimal("120000"));
        createDebt(sessionUserPlus, "D3 Mayor", new BigDecimal("2500000"), new BigDecimal("18.0"), RateType.EA, new BigDecimal("200000"));

        mvc.perform(get("/api/v1/strategies/active").cookie(sessionUserPlus))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.plan").value("PLUS"))
                .andExpect(jsonPath("$.activeStrategy").value("snowball"))
                .andExpect(jsonPath("$.consideredDebtsCount").value(3))
                .andExpect(jsonPath("$.orderedDebts", hasSize(3)))
                .andExpect(jsonPath("$.priorityDebt.name").value("D1 Menor"))
                // Detalle por deuda Plus
                .andExpect(jsonPath("$.orderedDebts[0].projectedInterest").isNumber())
                .andExpect(jsonPath("$.orderedDebts[0].estimatedPayoffDate").isString())
                .andExpect(jsonPath("$.orderedDebts[0].extraPayment").isNumber())
                // Proyección global y comparación
                .andExpect(jsonPath("$.globalProjection.available").value(true))
                .andExpect(jsonPath("$.globalProjection.payoffDate").isString())
                .andExpect(jsonPath("$.comparison.available").value(true))
                .andExpect(jsonPath("$.comparison.snowball.payoffDate").isString())
                .andExpect(jsonPath("$.comparison.avalanche.payoffDate").isString());

        // Plus llamando al endpoint directo de comparación
        mvc.perform(get("/api/v1/strategies/comparison").cookie(sessionUserPlus))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available").value(true))
                .andExpect(jsonPath("$.snowball.totalInterest").isNumber())
                .andExpect(jsonPath("$.avalanche.totalInterest").isNumber());
    }

    @Test
    @DisplayName("Seguridad: endpoints de estrategia rechazan peticiones no autenticadas")
    void rejectsUnauthenticatedRequests() throws Exception {
        mvc.perform(get("/api/v1/strategies/active"))
                .andExpect(status().isUnauthorized());

        mvc.perform(put("/api/v1/strategies/active").with(csrf())
                        .param("strategy", "SNOWBALL"))
                .andExpect(status().isUnauthorized());

        mvc.perform(get("/api/v1/strategies/comparison"))
                .andExpect(status().isUnauthorized());
    }
}
