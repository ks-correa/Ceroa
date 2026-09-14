package com.ceroa.config;

import com.ceroa.domain.DebtType;
import com.ceroa.domain.RateType;
import com.ceroa.repository.DebtRepository;
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

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class DashboardIntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired UserRepository userRepository;
    @Autowired DebtRepository debtRepository;
    @Autowired PaymentRepository paymentRepository;

    private Cookie session;

    @BeforeEach
    void registerUser() throws Exception {
        String email = "dash-test-" + UUID.randomUUID() + "@example.com";
        session = mvc.perform(post("/api/v1/auth/register").with(csrf())
                        .contentType("application/json")
                        .content(json.writeValueAsString(Map.of(
                                "fullName", "Dashboard Test User",
                                "email", email,
                                "phone", "+573001112233",
                                "birthDate", "1994-05-15",
                                "password", "Password!123",
                                "confirmPassword", "Password!123",
                                "acceptTerms", true,
                                "acceptPrivacy", true
                        ))))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getCookie(SessionAuthenticationFilter.COOKIE_NAME);

        userRepository.findByEmailIgnoreCase(email).ifPresent(user -> {
            user.setPlan(com.ceroa.domain.UserPlan.PLUS);
            userRepository.save(user);
        });
    }

    @Test
    @DisplayName("Seguridad: Rechaza consultas no autenticadas con 401")
    void rejectsUnauthenticatedRequests() throws Exception {
        mvc.perform(get("/api/v1/dashboard/summary"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("HU-037 & HU-038: Resumen financiero consolidado, aislamiento y cobertura parcial de extremo a extremo")
    void dashboardSummaryEndToEnd() throws Exception {
        // 1. Estado inicial sin deudas -> EMPTY
        mvc.perform(get("/api/v1/dashboard/summary").cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("EMPTY"))
                .andExpect(jsonPath("$.registeredDebtCount").value(0))
                .andExpect(jsonPath("$.activeDebtCount").value(0))
                .andExpect(jsonPath("$.totalRegisteredDebt").value(0));

        // 2. Configurar perfil financiero con 3 deudas declaradas y disponible 500.000 COP
        mvc.perform(put("/api/v1/financial-profile").with(csrf()).cookie(session)
                .contentType("application/json")
                .content(json.writeValueAsString(Map.of(
                        "monthlyIncome", 3000000,
                        "fixedExpenses", 1500000,
                        "availableMoney", 500000,
                        "totalDeclaredDebts", 3,
                        "activeStrategy", "SNOWBALL"
                ))))
                .andExpect(status().isOk());

        // 3. Registrar primera deuda (Tarjeta de Crédito)
        Map<String, Object> cardPayload = new LinkedHashMap<>();
        cardPayload.put("name", "Tarjeta Mastercard");
        cardPayload.put("entity", "Bancolombia");
        cardPayload.put("type", DebtType.CREDIT_CARD.name());
        cardPayload.put("categoryLabel", "Tarjeta de crédito");
        cardPayload.put("originalAmount", 4000000);
        cardPayload.put("currentBalance", 1200000);
        cardPayload.put("interestRate", 25.0);
        cardPayload.put("rateType", RateType.EA.name());
        cardPayload.put("minimumPayment", 90000);
        cardPayload.put("monthlyPayment", 0);
        cardPayload.put("dueDateDay", 20);
        cardPayload.put("nextDueDate", LocalDate.now().plusDays(5).toString());
        cardPayload.put("details", Map.of(
                "creditLimit", 4000000,
                "statementDay", 15,
                "paymentDueDate", LocalDate.now().plusDays(5).toString()
        ));

        mvc.perform(post("/api/v1/debts").with(csrf()).cookie(session)
                        .contentType("application/json")
                        .content(json.writeValueAsString(cardPayload)))
                .andExpect(status().isCreated());

        // 4. Consultar Dashboard: Cobertura parcial activada (3 declaradas > 1 registrada)
        mvc.perform(get("/api/v1/dashboard/summary").cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.totalDeclaredDebts").value(3))
                .andExpect(jsonPath("$.registeredDebtCount").value(1))
                .andExpect(jsonPath("$.partialCoverage").value(true)) // HU-038 CA-01
                .andExpect(jsonPath("$.activeDebtCount").value(1))
                .andExpect(jsonPath("$.totalRegisteredDebt").value(1200000)) // HU-037 CA-01
                .andExpect(jsonPath("$.requiredPaymentsCurrentPeriod").value(90000))
                .andExpect(jsonPath("$.hasRequiredPaymentsData").value(true))
                .andExpect(jsonPath("$.availableForDebt").value(500000)) // HU-037 CA-02
                .andExpect(jsonPath("$.activeStrategy").value("snowball"))
                .andExpect(jsonPath("$.nextDue.debtName").value("Tarjeta Mastercard")) // HU-037 CA-03
                .andExpect(jsonPath("$.nextDue.amount").value(90000));

        // 5. Registrar segunda y tercera deuda para completar cobertura
        Map<String, Object> loanPayload = new LinkedHashMap<>();
        loanPayload.put("name", "Préstamo Libre");
        loanPayload.put("entity", "Davivienda");
        loanPayload.put("type", DebtType.PERSONAL_LOAN.name());
        loanPayload.put("categoryLabel", "Préstamo personal");
        loanPayload.put("originalAmount", 3000000);
        loanPayload.put("currentBalance", 1800000);
        loanPayload.put("interestRate", 18.0);
        loanPayload.put("rateType", RateType.EA.name());
        loanPayload.put("monthlyPayment", 110000);
        loanPayload.put("termRemainingMonths", 24);
        loanPayload.put("disbursementDate", LocalDate.now().minusMonths(6).toString());
        loanPayload.put("nextDueDate", LocalDate.now().plusDays(12).toString());

        mvc.perform(post("/api/v1/debts").with(csrf()).cookie(session)
                        .contentType("application/json")
                        .content(json.writeValueAsString(loanPayload)))
                .andExpect(status().isCreated());

        Map<String, Object> retailPayload = new LinkedHashMap<>();
        retailPayload.put("name", "Crédito Ropa");
        retailPayload.put("entity", "Falabella");
        retailPayload.put("type", DebtType.RETAIL_CREDIT.name());
        retailPayload.put("categoryLabel", "Crédito comercial");
        retailPayload.put("originalAmount", 800000);
        retailPayload.put("currentBalance", 400000);
        retailPayload.put("interestRate", 22.0);
        retailPayload.put("rateType", RateType.EA.name());
        retailPayload.put("monthlyPayment", 50000);
        retailPayload.put("termRemainingMonths", 8);
        retailPayload.put("nextDueDate", LocalDate.now().plusDays(18).toString());
        retailPayload.put("details", Map.of("totalInstallments", 12));

        mvc.perform(post("/api/v1/debts").with(csrf()).cookie(session)
                        .contentType("application/json")
                        .content(json.writeValueAsString(retailPayload)))
                .andExpect(status().isCreated());

        // 6. Consultar Dashboard: Cobertura parcial desactivada (3 declaradas == 3 registradas)
        mvc.perform(get("/api/v1/dashboard/summary").cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalDeclaredDebts").value(3))
                .andExpect(jsonPath("$.registeredDebtCount").value(3))
                .andExpect(jsonPath("$.partialCoverage").value(false)) // HU-038 CA-04
                .andExpect(jsonPath("$.activeDebtCount").value(3))
                .andExpect(jsonPath("$.totalRegisteredDebt").value(3400000)) // 1.2M + 1.8M + 0.4M = 3.4M
                .andExpect(jsonPath("$.requiredPaymentsCurrentPeriod").value(250000)) // 90k + 110k + 50k = 250k
                .andExpect(jsonPath("$.upcomingDues", hasSize(3)));

        // 7. Verificar alias GET /api/v1/dashboard
        mvc.perform(get("/api/v1/dashboard").cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalRegisteredDebt").value(3400000));
    }
}
