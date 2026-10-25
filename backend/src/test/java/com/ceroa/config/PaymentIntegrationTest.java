package com.ceroa.config;

import com.ceroa.domain.Debt;
import com.ceroa.domain.DebtStatus;
import com.ceroa.domain.DebtType;
import com.ceroa.domain.PaymentType;
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
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class PaymentIntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired UserRepository userRepository;
    @Autowired DebtRepository debtRepository;
    @Autowired PaymentRepository paymentRepository;

    private Cookie sessionA;
    private UUID userIdA;

    private Cookie sessionB;
    private UUID userIdB;

    @BeforeEach
    void registerUsers() throws Exception {
        sessionA = registerUser("userA-" + UUID.randomUUID() + "@example.com", "Usuario A");
        userIdA = userRepository.findByEmailIgnoreCase(userEmail(sessionA)).orElseThrow().getId();

        sessionB = registerUser("userB-" + UUID.randomUUID() + "@example.com", "Usuario B");
        userIdB = userRepository.findByEmailIgnoreCase(userEmail(sessionB)).orElseThrow().getId();
    }

    private String lastRegisteredEmail;

    private Cookie registerUser(String email, String name) throws Exception {
        lastRegisteredEmail = email;
        MvcResult res = mvc.perform(post("/api/v1/auth/register").with(csrf())
                        .contentType("application/json")
                        .content(json.writeValueAsString(Map.of(
                                "fullName", name,
                                "email", email,
                                "phone", "+573001234567",
                                "birthDate", "1994-05-12",
                                "password", "Password!123",
                                "confirmPassword", "Password!123",
                                "acceptTerms", true,
                                "acceptPrivacy", true
                        ))))
                .andExpect(status().isOk())
                .andReturn();
        return res.getResponse().getCookie(SessionAuthenticationFilter.COOKIE_NAME);
    }

    private String userEmail(Cookie session) {
        return lastRegisteredEmail;
    }

    private UUID createDebtForUser(Cookie session, String name, BigDecimal balance, BigDecimal original) throws Exception {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("name", name);
        payload.put("entity", "Banco Prueba");
        payload.put("type", DebtType.PERSONAL_LOAN.name());
        payload.put("originalAmount", original);
        payload.put("currentBalance", balance);
        payload.put("interestRate", 15.0);
        payload.put("rateType", RateType.EA.name());
        payload.put("monthlyPayment", 100000);
        payload.put("termRemainingMonths", 12);
        payload.put("disbursementDate", LocalDate.now().minusMonths(3).toString());
        payload.put("nextDueDate", LocalDate.now().plusDays(20).toString());
        payload.put("details", Map.of("totalInstallments", 12));

        String content = mvc.perform(post("/api/v1/debts").with(csrf())
                        .cookie(session)
                        .contentType("application/json")
                        .content(json.writeValueAsString(payload)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        Map<?, ?> map = json.readValue(content, Map.class);
        return UUID.fromString(map.get("id").toString());
    }

    // =========================================================================
    // HU-042: REGISTRAR UN PAGO
    // =========================================================================

    @Test
    @DisplayName("HU-042: Registrar pago reduce saldo, actualiza deuda y genera movimiento en historial")
    void testCreatePaymentEndToEnd() throws Exception {
        UUID debtId = createDebtForUser(sessionA, "Préstamo Personal A", BigDecimal.valueOf(1000000), BigDecimal.valueOf(1000000));

        Map<String, Object> paymentPayload = new LinkedHashMap<>();
        paymentPayload.put("debtId", debtId);
        paymentPayload.put("type", "extra_principal");
        paymentPayload.put("amount", 300000);
        paymentPayload.put("date", LocalDate.now().toString());
        paymentPayload.put("notes", "Abono a capital quincena");

        mvc.perform(post("/api/v1/payments").with(csrf())
                        .cookie(sessionA)
                        .contentType("application/json")
                        .content(json.writeValueAsString(paymentPayload)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.debtId").value(debtId.toString()))
                .andExpect(jsonPath("$.amount").value(300000))
                .andExpect(jsonPath("$.debtCurrentBalance").value(700000))
                .andExpect(jsonPath("$.type").value("extra_principal"))
                .andExpect(jsonPath("$.typeLabel").value("Abono adicional"));

        // Verificar en BD
        Debt updatedDebt = debtRepository.findById(debtId).orElseThrow();
        assertThat(updatedDebt.getCurrentBalance()).isEqualByComparingTo("700000");
        assertThat(updatedDebt.getStatus()).isEqualTo(DebtStatus.CURRENT);

        // Consultar historial
        mvc.perform(get("/api/v1/payments?debtId=" + debtId)
                        .cookie(sessionA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].notes").value("Abono a capital quincena"));
    }

    @Test
    void lateInstallmentClearsOverdueAndDeletingItRestoresTheDueDate() throws Exception {
        UUID debtId = createDebtForUser(sessionA, "Cuota vencida", new BigDecimal("1000000"), new BigDecimal("1000000"));
        LocalDate pastDue = LocalDate.now().minusDays(5);
        Debt debt = debtRepository.findById(debtId).orElseThrow();
        debt.setNextDueDate(pastDue);
        debt.setPaymentScheduleAnchor(null);
        debt.setStatus(DebtStatus.OVERDUE);
        debtRepository.save(debt);

        var payload = Map.of("debtId", debtId, "type", "monthly_fee", "amount", 100000,
                "date", LocalDate.now().toString());
        String result = mvc.perform(post("/api/v1/payments").with(csrf()).cookie(sessionA)
                        .contentType("application/json").content(json.writeValueAsString(payload)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.debtStatus").value("al_dia"))
                .andReturn().getResponse().getContentAsString();
        Debt paidCycle = debtRepository.findById(debtId).orElseThrow();
        assertThat(paidCycle.getNextDueDate()).isAfter(LocalDate.now());
        assertThat(paidCycle.getStatus()).isEqualTo(DebtStatus.CURRENT);
        mvc.perform(get("/api/v1/debts/" + debtId).cookie(sessionA))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("al_dia"));

        UUID paymentId = UUID.fromString(json.readTree(result).get("id").asText());
        mvc.perform(delete("/api/v1/payments/" + paymentId).with(csrf()).cookie(sessionA))
                .andExpect(status().isOk()).andExpect(jsonPath("$.debtStatus").value("en_mora"));
        Debt restored = debtRepository.findById(debtId).orElseThrow();
        assertThat(restored.getNextDueDate()).isEqualTo(pastDue);
        assertThat(restored.getCurrentBalance()).isEqualByComparingTo("1000000");
    }

    @Test
    @DisplayName("HU-042: Pago total cancela la deuda y la marca como PAGADA")
    void testFullPaymentSetsDebtToPaid() throws Exception {
        UUID debtId = createDebtForUser(sessionA, "Préstamo Pequeño", BigDecimal.valueOf(250000), BigDecimal.valueOf(500000));

        Map<String, Object> paymentPayload = new LinkedHashMap<>();
        paymentPayload.put("debtId", debtId);
        paymentPayload.put("type", "full");
        paymentPayload.put("amount", 250000);
        paymentPayload.put("date", LocalDate.now().toString());
        paymentPayload.put("notes", "Liquidación total");

        mvc.perform(post("/api/v1/payments").with(csrf())
                        .cookie(sessionA)
                        .contentType("application/json")
                        .content(json.writeValueAsString(paymentPayload)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.debtCurrentBalance").value(0))
                .andExpect(jsonPath("$.debtStatus").value("pagada"));

        Debt updatedDebt = debtRepository.findById(debtId).orElseThrow();
        assertThat(updatedDebt.getCurrentBalance()).isEqualByComparingTo("0");
        assertThat(updatedDebt.getStatus()).isEqualTo(DebtStatus.PAID);
    }

    @Test
    @DisplayName("HU-042: Rechaza pago con fecha futura y montos inválidos")
    void testCreatePaymentValidations() throws Exception {
        UUID debtId = createDebtForUser(sessionA, "Deuda Validaciones", BigDecimal.valueOf(500000), BigDecimal.valueOf(500000));

        // 1. Fecha futura rechazada
        Map<String, Object> futureDate = new LinkedHashMap<>();
        futureDate.put("debtId", debtId);
        futureDate.put("type", "monthly_fee");
        futureDate.put("amount", 50000);
        futureDate.put("date", LocalDate.now().plusDays(5).toString());

        mvc.perform(post("/api/v1/payments").with(csrf())
                        .cookie(sessionA)
                        .contentType("application/json")
                        .content(json.writeValueAsString(futureDate)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        // 2. Monto cero rechazado
        Map<String, Object> zeroAmount = new LinkedHashMap<>();
        zeroAmount.put("debtId", debtId);
        zeroAmount.put("type", "monthly_fee");
        zeroAmount.put("amount", 0);
        zeroAmount.put("date", LocalDate.now().toString());

        mvc.perform(post("/api/v1/payments").with(csrf())
                        .cookie(sessionA)
                        .contentType("application/json")
                        .content(json.writeValueAsString(zeroAmount)))
                .andExpect(status().isBadRequest());

        // 3. Monto mayor al saldo rechazado
        Map<String, Object> excessiveAmount = new LinkedHashMap<>();
        excessiveAmount.put("debtId", debtId);
        excessiveAmount.put("type", "monthly_fee");
        excessiveAmount.put("amount", 600000);
        excessiveAmount.put("date", LocalDate.now().toString());

        mvc.perform(post("/api/v1/payments").with(csrf())
                        .cookie(sessionA)
                        .contentType("application/json")
                        .content(json.writeValueAsString(excessiveAmount)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("PAYMENT_EXCEEDS_BALANCE"));
    }

    // =========================================================================
    // HU-043: EDITAR UN PAGO
    // =========================================================================

    @Test
    @DisplayName("HU-043: Editar un pago revierte efecto previo y ajusta el saldo transaccionalmente")
    void testUpdatePaymentEndToEnd() throws Exception {
        UUID debtId = createDebtForUser(sessionA, "Deuda a Editar", BigDecimal.valueOf(1000000), BigDecimal.valueOf(1000000));

        // 1. Crear pago de 200,000 -> saldo = 800,000
        Map<String, Object> createPayload = new LinkedHashMap<>();
        createPayload.put("debtId", debtId);
        createPayload.put("type", "monthly_fee");
        createPayload.put("amount", 200000);
        createPayload.put("date", LocalDate.now().toString());

        String paymentRes = mvc.perform(post("/api/v1/payments").with(csrf())
                        .cookie(sessionA)
                        .contentType("application/json")
                        .content(json.writeValueAsString(createPayload)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        UUID paymentId = UUID.fromString(json.readValue(paymentRes, Map.class).get("id").toString());

        // 2. Editar de 200,000 a 450,000 -> saldo debe ser 550,000
        Map<String, Object> updatePayload = new LinkedHashMap<>();
        updatePayload.put("debtId", debtId);
        updatePayload.put("type", "extra_principal");
        updatePayload.put("amount", 450000);
        updatePayload.put("date", LocalDate.now().toString());
        updatePayload.put("notes", "Nota corregida");

        mvc.perform(put("/api/v1/payments/" + paymentId).with(csrf())
                        .cookie(sessionA)
                        .contentType("application/json")
                        .content(json.writeValueAsString(updatePayload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.amount").value(450000))
                .andExpect(jsonPath("$.debtCurrentBalance").value(550000))
                .andExpect(jsonPath("$.notes").value("Nota corregida"));

        Debt updatedDebt = debtRepository.findById(debtId).orElseThrow();
        assertThat(updatedDebt.getCurrentBalance()).isEqualByComparingTo("550000");
    }

    // =========================================================================
    // HU-044: ELIMINAR UN PAGO
    // =========================================================================

    @Test
    @DisplayName("HU-044: Eliminar un pago revierte el saldo de la deuda y lo remueve del historial")
    void testDeletePaymentEndToEnd() throws Exception {
        UUID debtId = createDebtForUser(sessionA, "Deuda a Eliminar Pago", BigDecimal.valueOf(800000), BigDecimal.valueOf(800000));

        // 1. Crear pago de 300,000 -> saldo = 500,000
        Map<String, Object> createPayload = new LinkedHashMap<>();
        createPayload.put("debtId", debtId);
        createPayload.put("type", "monthly_fee");
        createPayload.put("amount", 300000);
        createPayload.put("date", LocalDate.now().toString());

        String paymentRes = mvc.perform(post("/api/v1/payments").with(csrf())
                        .cookie(sessionA)
                        .contentType("application/json")
                        .content(json.writeValueAsString(createPayload)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        UUID paymentId = UUID.fromString(json.readValue(paymentRes, Map.class).get("id").toString());
        assertThat(debtRepository.findById(debtId).orElseThrow().getCurrentBalance()).isEqualByComparingTo("500000");

        // 2. Eliminar pago
        mvc.perform(delete("/api/v1/payments/" + paymentId).with(csrf())
                        .cookie(sessionA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paymentId").value(paymentId.toString()))
                .andExpect(jsonPath("$.debtCurrentBalance").value(800000));

        // 3. Saldo en BD restaurado exactamente a 800,000
        Debt revertedDebt = debtRepository.findById(debtId).orElseThrow();
        assertThat(revertedDebt.getCurrentBalance()).isEqualByComparingTo("800000");

        // 4. Pago ya no existe en historial
        mvc.perform(get("/api/v1/payments?debtId=" + debtId)
                        .cookie(sessionA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    // =========================================================================
    // AUTORIZACIÓN ENTRE USUARIOS
    // =========================================================================

    @Test
    @DisplayName("Autorización: Usuario A no puede crear, ver, editar ni eliminar pagos del Usuario B")
    void testCrossUserAuthorization() throws Exception {
        UUID debtIdB = createDebtForUser(sessionB, "Deuda Privada B", BigDecimal.valueOf(500000), BigDecimal.valueOf(500000));

        // Usuario B crea un pago legítimo
        Map<String, Object> bPayment = new LinkedHashMap<>();
        bPayment.put("debtId", debtIdB);
        bPayment.put("type", "monthly_fee");
        bPayment.put("amount", 100000);
        bPayment.put("date", LocalDate.now().toString());

        String bRes = mvc.perform(post("/api/v1/payments").with(csrf())
                        .cookie(sessionB)
                        .contentType("application/json")
                        .content(json.writeValueAsString(bPayment)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        UUID paymentIdB = UUID.fromString(json.readValue(bRes, Map.class).get("id").toString());

        // 1. Usuario A intenta consultar pagos de deuda de B -> 404 Not Found
        mvc.perform(get("/api/v1/payments?debtId=" + debtIdB)
                        .cookie(sessionA))
                .andExpect(status().isNotFound());

        // 2. Usuario A intenta consultar directamente el pago de B -> 404 Not Found
        mvc.perform(get("/api/v1/payments/" + paymentIdB)
                        .cookie(sessionA))
                .andExpect(status().isNotFound());

        // 3. Usuario A intenta crear un pago sobre la deuda de B -> 404 Not Found
        Map<String, Object> aMaliciousCreate = new LinkedHashMap<>();
        aMaliciousCreate.put("debtId", debtIdB);
        aMaliciousCreate.put("type", "monthly_fee");
        aMaliciousCreate.put("amount", 50000);
        aMaliciousCreate.put("date", LocalDate.now().toString());

        mvc.perform(post("/api/v1/payments").with(csrf())
                        .cookie(sessionA)
                        .contentType("application/json")
                        .content(json.writeValueAsString(aMaliciousCreate)))
                .andExpect(status().isNotFound());

        // 4. Usuario A intenta editar el pago de B -> 404 Not Found
        Map<String, Object> aMaliciousUpdate = new LinkedHashMap<>();
        aMaliciousUpdate.put("debtId", debtIdB);
        aMaliciousUpdate.put("type", "monthly_fee");
        aMaliciousUpdate.put("amount", 200000);
        aMaliciousUpdate.put("date", LocalDate.now().toString());

        mvc.perform(put("/api/v1/payments/" + paymentIdB).with(csrf())
                        .cookie(sessionA)
                        .contentType("application/json")
                        .content(json.writeValueAsString(aMaliciousUpdate)))
                .andExpect(status().isNotFound());

        // 5. Usuario A intenta eliminar el pago de B -> 404 Not Found
        mvc.perform(delete("/api/v1/payments/" + paymentIdB).with(csrf())
                        .cookie(sessionA))
                .andExpect(status().isNotFound());

        // El saldo de la deuda de B permanece inalterado (400,000)
        assertThat(debtRepository.findById(debtIdB).orElseThrow().getCurrentBalance()).isEqualByComparingTo("400000");
    }
}
