package com.ceroa.config;

import com.ceroa.api.RecoveryController;
import com.ceroa.repository.*;
import com.ceroa.service.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.icegreen.greenmail.util.*;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.time.OffsetDateTime;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class RecoveryIntegrationTest {
    static final GreenMail smtp = new GreenMail(new ServerSetup(0, "127.0.0.1", "smtp"));
    static { smtp.setUser("recovery@example.com", "smtp-user", "smtp-test-password"); smtp.start(); }
    @DynamicPropertySource static void mailProperties(DynamicPropertyRegistry r) {
        r.add("spring.mail.host", () -> "127.0.0.1"); r.add("spring.mail.port", () -> smtp.getSmtp().getPort());
        r.add("spring.mail.username", () -> "smtp-user"); r.add("spring.mail.password", () -> "smtp-test-password");
        r.add("spring.mail.properties.mail.smtp.auth", () -> "true");
        r.add("spring.mail.properties.mail.smtp.starttls.enable", () -> "false");
        r.add("spring.mail.properties.mail.smtp.starttls.required", () -> "false");
        r.add("ceroa.recovery.mail-from", () -> "recovery@example.com");
    }
    @AfterAll static void stopSmtp() { smtp.stop(); }
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired PasswordRecoveryService service;
    @Autowired PasswordRecoveryRepository recoveries;
    @Autowired UserRepository users;
    @Autowired PasswordEncoder encoder;
    String source;
    String email;
    Cookie session;
    @BeforeEach void register() throws Exception {
        source = UUID.randomUUID().toString(); email = "recovery-" + UUID.randomUUID() + "@example.com";
        session = postJson("/auth/register", Map.of("fullName", "Ana García", "email", email, "phone", "+573001234567",
            "birthDate", "1990-01-01", "password", "Original!123", "confirmPassword", "Original!123", "acceptTerms", true, "acceptPrivacy", true))
            .andExpect(status().isOk()).andReturn().getResponse().getCookie(SessionAuthenticationFilter.COOKIE_NAME);
    }
    ResultActions postJson(String path, Object body, Cookie... cookies) throws Exception {
        var request = post("/api/v1" + path).with(csrf()).with(r -> { r.setRemoteAddr(source); return r; })
            .contentType("application/json").content(json.writeValueAsString(body));
        if (cookies.length > 0) request.cookie(cookies);
        return mvc.perform(request);
    }
    UUID request(String address) throws Exception {
        var response = postJson("/auth/recovery/request", Map.of("email", address)).andExpect(status().isAccepted())
            .andExpect(jsonPath("$.code").doesNotExist()).andExpect(jsonPath("$.token").doesNotExist()).andReturn().getResponse();
        return UUID.fromString(json.readTree(response.getContentAsString()).get("requestId").asText());
    }
    String deliver(UUID id) throws Exception {
        service.deliver(id);
        var messages = smtp.getReceivedMessages();
        String content = (String) messages[messages.length - 1].getContent();
        var matcher = java.util.regex.Pattern.compile("[0-9]{8}").matcher(content);
        assertThat(matcher.find()).isTrue(); return matcher.group();
    }
    Cookie verify(UUID id, String code) throws Exception {
        var response = postJson("/auth/recovery/verify", Map.of("requestId", id, "code", code))
            .andExpect(status().isNoContent()).andReturn().getResponse();
        assertThat(response.getContentAsString()).isEmpty();
        assertThat(response.getHeader("Set-Cookie")).contains("HttpOnly", "SameSite=Strict");
        return response.getCookie(RecoveryController.COOKIE);
    }
    Map<String, Object> reset(UUID id, String password, String confirmation) {
        return Map.of("requestId", id, "password", password, "confirmPassword", confirmation);
    }
    @Test void completeSmtpRecoveryRevokesSessionsAndPreventsEveryReuse() throws Exception {
        UUID id = request(email); String code = deliver(id);
        var row = recoveries.findById(id).orElseThrow();
        assertThat(row.codeHash).isNotEqualTo(code); assertThat(encoder.matches(code, row.codeHash)).isTrue();
        Cookie grant = verify(id, code);
        postJson("/auth/recovery/verify", Map.of("requestId", id, "code", code)).andExpect(status().isUnprocessableEntity());
        var result = postJson("/auth/recovery/reset", reset(id, "Replacement!123", "Replacement!123"), grant)
            .andExpect(status().isNoContent()).andReturn().getResponse();
        assertThat(result.getHeader("Set-Cookie")).contains("Max-Age=0");
        assertThat(encoder.matches("Replacement!123", users.findByEmailIgnoreCase(email).orElseThrow().getPasswordHash())).isTrue();
        postJson("/auth/recovery/reset", reset(id, "Another!123", "Another!123"), grant).andExpect(status().isUnprocessableEntity());
        mvc.perform(get("/api/v1/debts").cookie(session)).andExpect(status().isUnauthorized());
        postJson("/auth/login", Map.of("email", email, "password", "Original!123")).andExpect(status().isUnauthorized());
        postJson("/auth/login", Map.of("email", email, "password", "Replacement!123")).andExpect(status().isOk());
    }
    @ParameterizedTest @ValueSource(strings={"", "bad", "a @example.com"})
    void rejectsInvalidEmails(String value) throws Exception {
        postJson("/auth/recovery/request", Map.of("email", value)).andExpect(status().isBadRequest());
    }
    @Test void identicalPublicResponseAndLimitsForExistingAndUnknownEmails() throws Exception {
        String missing = UUID.randomUUID() + "@example.com";
        for (int i = 0; i < 3; i++) {
            var known = postJson("/auth/recovery/request", Map.of("email", email)).andExpect(status().isAccepted()).andReturn();
            var unknown = postJson("/auth/recovery/request", Map.of("email", missing)).andExpect(status().isAccepted()).andReturn();
            assertThat(json.readTree(known.getResponse().getContentAsString()).get("message"))
                .isEqualTo(json.readTree(unknown.getResponse().getContentAsString()).get("message"));
        }
        for (String address : List.of(email, missing)) postJson("/auth/recovery/request", Map.of("email", address)).andExpect(status().isTooManyRequests());
    }
    @Test void wrongCodeAttemptsCommitAndCannotBeBypassed() throws Exception {
        UUID id = request(email); String code = deliver(id);
        postJson("/auth/recovery/verify", Map.of("requestId", id, "code", "")).andExpect(status().isBadRequest());
        String wrong = code.equals("00000000") ? "11111111" : "00000000";
        for (int i = 0; i < 5; i++) postJson("/auth/recovery/verify", Map.of("requestId", id, "code", wrong)).andExpect(status().isUnprocessableEntity());
        assertThat(recoveries.findById(id).orElseThrow().attempts).isEqualTo(5);
        postJson("/auth/recovery/verify", Map.of("requestId", id, "code", code)).andExpect(jsonPath("$.code").value("RECOVERY_ATTEMPTS"));
    }
    @Test void expiredCodeAndGrantAreRejected() throws Exception {
        UUID id = request(email); String code = deliver(id);
        var row = recoveries.findById(id).orElseThrow(); row.expiresAt = OffsetDateTime.now().minusSeconds(1); recoveries.save(row);
        postJson("/auth/recovery/verify", Map.of("requestId", id, "code", code)).andExpect(jsonPath("$.code").value("RECOVERY_EXPIRED"));
        UUID next = request(email); Cookie grant = verify(next, deliver(next));
        row = recoveries.findById(next).orElseThrow(); row.grantExpiresAt = OffsetDateTime.now().minusSeconds(1); recoveries.save(row);
        postJson("/auth/recovery/reset", reset(next, "Replacement!", "Replacement!"), grant).andExpect(jsonPath("$.code").value("RECOVERY_EXPIRED"));
    }
    @ParameterizedTest @ValueSource(strings={"", "Aa!1234", "lowercase!", "NoSpecial123", "A!éééééééééééééééééééééééééééééééééééé"})
    void invalidPasswordsCannotChangeHash(String password) throws Exception {
        UUID id = request(email); Cookie grant = verify(id, deliver(id));
        postJson("/auth/recovery/reset", reset(id, password, password), grant).andExpect(status().isBadRequest());
        assertThat(encoder.matches("Original!123", users.findByEmailIgnoreCase(email).orElseThrow().getPasswordHash())).isTrue();
    }
    @Test void rejectsMismatchMissingForgedAndUnverifiedAuthorization() throws Exception {
        UUID id = request(email); String code = deliver(id);
        postJson("/auth/recovery/reset", reset(id, "Replacement!", "Replacement!")).andExpect(status().isUnprocessableEntity());
        Cookie grant = verify(id, code);
        postJson("/auth/recovery/reset", reset(id, "Replacement!", "Different!"), grant).andExpect(status().isBadRequest());
        postJson("/auth/recovery/reset", reset(id, "Replacement!", "Replacement!"), new Cookie(RecoveryController.COOKIE, "forged")).andExpect(status().isUnprocessableEntity());
    }
    @Test void resettingOneChallengeInvalidatesOtherVerifiedChallenges() throws Exception {
        UUID first = request(email); Cookie firstGrant = verify(first, deliver(first));
        UUID second = request(email); Cookie secondGrant = verify(second, deliver(second));
        postJson("/auth/recovery/reset", reset(first, "Replacement!", "Replacement!"), firstGrant).andExpect(status().isNoContent());
        postJson("/auth/recovery/reset", reset(second, "Another!123", "Another!123"), secondGrant).andExpect(status().isUnprocessableEntity());
    }
    @Test void logoutRevokesServerSessionAndIsIdempotent() throws Exception {
        mvc.perform(get("/api/v1/auth/me").cookie(session)).andExpect(status().isOk());
        postJson("/auth/logout", Map.of(), session).andExpect(status().isNoContent()).andExpect(header().string("Set-Cookie", org.hamcrest.Matchers.containsString("Max-Age=0")));
        mvc.perform(get("/api/v1/auth/me").cookie(session)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/debts").cookie(session)).andExpect(status().isUnauthorized());
        postJson("/auth/logout", Map.of(), session).andExpect(status().isNoContent());
        mvc.perform(post("/api/v1/auth/recovery/request").contentType("application/json").content(json.writeValueAsString(Map.of("email", email)))).andExpect(status().isForbidden());
    }
    @Test void concurrentResetConsumesAuthorizationExactlyOnce() throws Exception {
        UUID id = request(email); Cookie grant = verify(id, deliver(id));
        var start = new java.util.concurrent.CountDownLatch(1);
        try (var pool = java.util.concurrent.Executors.newFixedThreadPool(2)) {
            java.util.concurrent.Callable<Boolean> reset = () -> {
                start.await();
                try { service.reset(id, grant.getValue(), "Concurrent!123"); return true; }
                catch (com.ceroa.exception.BusinessRuleException expected) { return false; }
            };
            var first = pool.submit(reset); var second = pool.submit(reset); start.countDown();
            assertThat(List.of(first.get(), second.get())).containsExactlyInAnyOrder(true, false);
        }
    }
}
