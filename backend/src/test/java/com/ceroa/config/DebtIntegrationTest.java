package com.ceroa.config;

import com.ceroa.domain.DebtType;
import com.ceroa.domain.RateType;
import com.ceroa.domain.UserPlan;
import com.ceroa.repository.DebtRepository;
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
import org.springframework.test.web.servlet.ResultActions;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class DebtIntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired UserRepository userRepository;
    @Autowired DebtRepository debtRepository;

    private Cookie session;
    private UUID userId;

    @BeforeEach
    void registerUser() throws Exception {
        String email = "debt-test-" + UUID.randomUUID() + "@example.com";
        session = mvc.perform(post("/api/v1/auth/register").with(csrf())
                        .contentType("application/json")
                        .content(json.writeValueAsString(Map.of(
                                "fullName", "Test Debt User",
                                "email", email,
                                "phone", "+573009998877",
                                "birthDate", "1992-03-10",
                                "password", "Password!123",
                                "confirmPassword", "Password!123",
                                "acceptTerms", true,
                                "acceptPrivacy", true
                        ))))
                .andExpect(status().isOk())
                .andReturn().getResponse().getCookie(SessionAuthenticationFilter.COOKIE_NAME);

        userId = userRepository.findByEmailIgnoreCase(email).orElseThrow().getId();
    }

    private ResultActions postDebt(Map<String, Object> body) throws Exception {
        return mvc.perform(post("/api/v1/debts").with(csrf())
                .cookie(session)
                .contentType("application/json")
                .content(json.writeValueAsString(body)));
    }

    @Test
    @DisplayName("HU-024: Tarjeta de crédito persiste y calcula estado")
    void testCreditCardEndToEnd() throws Exception {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("name", "Mi Tarjeta Oro");
        payload.put("entity", "Banco Bogotá");
        payload.put("type", DebtType.CREDIT_CARD.name());
        payload.put("originalAmount", 8000000);
        payload.put("currentBalance", 1500000);
        payload.put("interestRate", 27.5);
        payload.put("rateType", RateType.EA.name());
        payload.put("minimumPayment", 120000);
        payload.put("nextDueDate", LocalDate.now().plusDays(15).toString());
        payload.put("details", Map.of(
                "creditLimit", 8000000,
                "availableCredit", 6500000,
                "statementDay", 15,
                "paymentDueDate", LocalDate.now().plusDays(15).toString()
        ));

        postDebt(payload)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Mi Tarjeta Oro"))
                .andExpect(jsonPath("$.type").value("credit_card"))
                .andExpect(jsonPath("$.status").value("al_dia"));
    }

    @Test
    @DisplayName("HU-025: Préstamo personal persiste y calcula estado")
    void testPersonalLoanEndToEnd() throws Exception {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("name", "Préstamo Vacaciones");
        payload.put("entity", "Bancolombia");
        payload.put("type", DebtType.PERSONAL_LOAN.name());
        payload.put("originalAmount", 5000000);
        payload.put("currentBalance", 4000000);
        payload.put("interestRate", 18.0);
        payload.put("rateType", RateType.EA.name());
        payload.put("monthlyPayment", 250000);
        payload.put("termRemainingMonths", 18);
        payload.put("disbursementDate", LocalDate.now().minusMonths(6).toString());
        payload.put("nextDueDate", LocalDate.now().plusDays(20).toString());
        payload.put("details", Map.of("totalInstallments", 24));

        postDebt(payload)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Préstamo Vacaciones"))
                .andExpect(jsonPath("$.type").value("personal_loan"))
                .andExpect(jsonPath("$.status").value("al_dia"));
    }

    @Test
    @DisplayName("HU-026: Crédito hipotecario Pesos y UVR")
    void testMortgageEndToEnd() throws Exception {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("name", "Apartamento 301");
        payload.put("entity", "Davivienda");
        payload.put("type", DebtType.MORTGAGE.name());
        payload.put("originalAmount", 150000000);
        payload.put("currentBalance", 145000000);
        payload.put("interestRate", 13.5);
        payload.put("rateType", RateType.EA.name());
        payload.put("monthlyPayment", 1600000);
        payload.put("termRemainingMonths", 180);
        payload.put("nextDueDate", LocalDate.now().plusDays(10).toString());
        payload.put("details", Map.of("modality", "PESOS", "insuranceAmount", 75000));

        postDebt(payload)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value("mortgage"));
    }

    @Test
    @DisplayName("HU-027: Crédito vehículo con residual opcional")
    void testAutoLoanEndToEnd() throws Exception {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("name", "Mazda 3");
        payload.put("entity", "Finandina");
        payload.put("type", DebtType.AUTO_LOAN.name());
        payload.put("originalAmount", 50000000);
        payload.put("currentBalance", 40000000);
        payload.put("interestRate", 16.0);
        payload.put("rateType", RateType.EA.name());
        payload.put("monthlyPayment", 950000);
        payload.put("termRemainingMonths", 36);
        payload.put("nextDueDate", LocalDate.now().plusDays(12).toString());
        payload.put("details", Map.of("residualValue", 10000000));

        postDebt(payload)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value("auto_loan"));
    }

    @Test
    @DisplayName("HU-028: Crédito educativo en estudio sin pago periódico exigible")
    void testStudentLoanEndToEnd() throws Exception {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("name", "Icetex Maestría");
        payload.put("entity", "Icetex");
        payload.put("type", DebtType.STUDENT_LOAN.name());
        payload.put("originalAmount", 25000000);
        payload.put("currentBalance", 25000000);
        payload.put("interestRate", 10.0);
        payload.put("rateType", RateType.IPC_MARGIN.name());
        payload.put("details", Map.of("stage", "ESTUDIO", "hasPaymentObligation", false));

        postDebt(payload)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value("student_loan"));
    }

    @Test
    @DisplayName("HU-029 & HU-030: Crédito comercial con costo fijo y digital con tarifa")
    void testCommercialAndInstallmentEndToEnd() throws Exception {
        Map<String, Object> retail = new LinkedHashMap<>();
        retail.put("name", "Nevera Éxito");
        retail.put("entity", "Éxito");
        retail.put("type", DebtType.RETAIL_CREDIT.name());
        retail.put("originalAmount", 2500000);
        retail.put("currentBalance", 2000000);
        retail.put("rateType", RateType.NONE.name());
        retail.put("monthlyPayment", 250000);
        retail.put("termRemainingMonths", 8);
        retail.put("nextDueDate", LocalDate.now().plusDays(5).toString());
        retail.put("details", Map.of("costType", "FEE", "financialCost", 50000, "totalInstallments", 10));

        postDebt(retail).andExpect(status().isCreated());
    }

    @Test
    @DisplayName("HU-031: Factura vencida calcula estado en_mora")
    void testOverdueBillEndToEnd() throws Exception {
        Map<String, Object> bill = new LinkedHashMap<>();
        bill.put("name", "Factura Teléfono");
        bill.put("entity", "Claro");
        bill.put("type", DebtType.OVERDUE_BILL.name());
        bill.put("originalAmount", 95000);
        bill.put("currentBalance", 95000);
        bill.put("rateType", RateType.NONE.name());
        bill.put("details", Map.of("originalDueDate", LocalDate.now().minusDays(20).toString()));

        postDebt(bill)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("en_mora"));
    }

    @Test
    @DisplayName("HU-032 & HU-033: Deuda familiar y otra obligación con valor inicial opcional")
    void testFamilyAndOtherEndToEnd() throws Exception {
        Map<String, Object> family = new LinkedHashMap<>();
        family.put("name", "Préstamo Papá");
        family.put("entity", "Papá");
        family.put("type", DebtType.FAMILY_LOAN.name());
        family.put("currentBalance", 1000000);
        family.put("rateType", RateType.NONE.name());

        postDebt(family)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.originalAmount").doesNotExist())
                .andExpect(jsonPath("$.details.hasSufficientProjectionData").value(false));

        Map<String, Object> other = new LinkedHashMap<>();
        other.put("name", "Cuota extraordinaria edificio");
        other.put("type", DebtType.OTHER.name());
        other.put("currentBalance", 300000);
        other.put("rateType", RateType.NONE.name());

        postDebt(other)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value("other"));
    }

    @Test
    @DisplayName("Plan Cero: Límite estricto de 2 deudas")
    void testPlanCeroDebtLimit() throws Exception {
        var user = userRepository.findById(userId).orElseThrow();
        user.setPlan(UserPlan.CERO);
        userRepository.save(user);

        // Deuda 1
        Map<String, Object> d1 = new LinkedHashMap<>();
        d1.put("name", "Deuda 1");
        d1.put("entity", "Banco 1");
        d1.put("type", DebtType.CREDIT_CARD.name());
        d1.put("originalAmount", 1000000);
        d1.put("currentBalance", 500000);
        d1.put("rateType", RateType.EA.name());
        d1.put("interestRate", 20.0);
        d1.put("minimumPayment", 50000);
        d1.put("nextDueDate", LocalDate.now().plusDays(10).toString());
        d1.put("details", Map.of("statementDay", 5, "paymentDueDate", LocalDate.now().plusDays(10).toString()));
        postDebt(d1).andExpect(status().isCreated());

        // Deuda 2
        Map<String, Object> d2 = new LinkedHashMap<>();
        d2.put("name", "Deuda 2");
        d2.put("entity", "Banco 2");
        d2.put("type", DebtType.CREDIT_CARD.name());
        d2.put("originalAmount", 2000000);
        d2.put("currentBalance", 1000000);
        d2.put("rateType", RateType.EA.name());
        d2.put("interestRate", 22.0);
        d2.put("minimumPayment", 80000);
        d2.put("nextDueDate", LocalDate.now().plusDays(12).toString());
        d2.put("details", Map.of("statementDay", 8, "paymentDueDate", LocalDate.now().plusDays(12).toString()));
        postDebt(d2).andExpect(status().isCreated());

        // Deuda 3 debe ser rechazada con código PLAN_CERO_DEBT_LIMIT
        Map<String, Object> d3 = new LinkedHashMap<>();
        d3.put("name", "Deuda 3");
        d3.put("entity", "Banco 3");
        d3.put("type", DebtType.CREDIT_CARD.name());
        d3.put("originalAmount", 3000000);
        d3.put("currentBalance", 1500000);
        d3.put("rateType", RateType.EA.name());
        d3.put("interestRate", 25.0);
        d3.put("minimumPayment", 100000);
        d3.put("nextDueDate", LocalDate.now().plusDays(15).toString());
        d3.put("details", Map.of("statementDay", 10, "paymentDueDate", LocalDate.now().plusDays(15).toString()));

        postDebt(d3)
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("PLAN_CERO_DEBT_LIMIT"))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("máximo 2 deudas")));

        assertThat(debtRepository.countByUserId(userId)).isEqualTo(2);
    }
}

