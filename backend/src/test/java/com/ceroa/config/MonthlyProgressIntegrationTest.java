package com.ceroa.config;

import com.ceroa.domain.UserPlan;
import com.ceroa.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.Map;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class MonthlyProgressIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @Autowired UserRepository users;

    @Test void capturesMutationsAndEnforcesOwnerAndPlanOnRead() throws Exception {
        String email = "monthly-" + UUID.randomUUID() + "@example.com";
        Cookie owner = register(email);
        Cookie other = register("other-" + UUID.randomUUID() + "@example.com");
        var user = users.findByEmailIgnoreCase(email).orElseThrow();
        YearMonth month = YearMonth.now(ZoneId.of("America/Bogota"));
        String endpoint = "/api/v1/monthly-progress?year=" + month.getYear() + "&month=" + month.getMonthValue();

        String debtJson = mvc.perform(post("/api/v1/debts").with(csrf()).cookie(owner)
                .contentType("application/json").content(json.writeValueAsString(Map.ofEntries(
                        Map.entry("name", "Prueba mensual"), Map.entry("entity", "Banco"),
                        Map.entry("type", "PERSONAL_LOAN"), Map.entry("originalAmount", 100000),
                        Map.entry("currentBalance", 100000), Map.entry("interestRate", 10),
                        Map.entry("rateType", "EA"), Map.entry("monthlyPayment", 10000),
                        Map.entry("termRemainingMonths", 12),
                        Map.entry("disbursementDate", java.time.LocalDate.now().minusMonths(3).toString()),
                        Map.entry("nextDueDate", java.time.LocalDate.now().plusDays(20).toString())))))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String debtId = json.readTree(debtJson).get("id").asText();
        mvc.perform(post("/api/v1/payments").with(csrf()).cookie(owner)
                .contentType("application/json").content(json.writeValueAsString(Map.of(
                        "debtId", debtId, "type", "extra_principal", "amount", 20000,
                        "date", java.time.LocalDate.now(ZoneId.of("America/Bogota")).toString()))))
                .andExpect(status().isCreated());

        mvc.perform(get(endpoint).cookie(owner)).andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("INSUFFICIENT_DATA"));
        mvc.perform(get(endpoint).cookie(other)).andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("EMPTY"));

        // Test-only prior observation to exercise a fully observed period.
        jdbc.update("INSERT INTO monthly_balance_history(id,user_id,recorded_at,balance) VALUES (?,?,?,?)",
                UUID.randomUUID(), user.getId(), Timestamp.from(month.atDay(1).atStartOfDay(ZoneId.of("America/Bogota")).minusSeconds(1).toInstant()), BigDecimal.ZERO);
        Integer before = jdbc.queryForObject("SELECT count(*) FROM monthly_balance_history WHERE user_id=?", Integer.class, user.getId());
        mvc.perform(get(endpoint).cookie(owner)).andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.detailLevel").value("BASIC"))
                .andExpect(jsonPath("$.openingDebt").value(0))
                .andExpect(jsonPath("$.closingDebt").value(80000))
                .andExpect(jsonPath("$.totalPaid").value(20000))
                .andExpect(jsonPath("$.registeredPaymentsCount").doesNotExist());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM monthly_balance_history WHERE user_id=?", Integer.class, user.getId())).isEqualTo(before);

        user.setPlan(UserPlan.PLUS);
        users.save(user);
        mvc.perform(get(endpoint).cookie(owner)).andExpect(status().isOk())
                .andExpect(jsonPath("$.detailLevel").value("FULL"))
                .andExpect(jsonPath("$.registeredPaymentsCount").value(1));
    }

    private Cookie register(String email) throws Exception {
        return mvc.perform(post("/api/v1/auth/register").with(csrf()).contentType("application/json")
                        .content(json.writeValueAsString(Map.of(
                                "fullName", "Usuario Mensual", "email", email, "phone", "+573001234567",
                                "birthDate", "1994-05-12", "password", "Password!123",
                                "confirmPassword", "Password!123", "acceptTerms", true, "acceptPrivacy", true))))
                .andExpect(status().isOk()).andReturn().getResponse().getCookie(SessionAuthenticationFilter.COOKIE_NAME);
    }
}
