package com.ceroa.config;

import com.ceroa.repository.*;
import com.ceroa.service.EmailChangeService;
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
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.time.OffsetDateTime;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for EP-04: User Profile Management (HU-014, HU-015, HU-016, HU-017).
 * Uses a real GreenMail SMTP server to capture email change verification codes.
 */
@SpringBootTest
@AutoConfigureMockMvc
class ProfileIntegrationTest {

    static final GreenMail smtp = new GreenMail(new ServerSetup(0, "127.0.0.1", "smtp"));
    static {
        smtp.setUser("profile-test@example.com", "smtp-user-profile", "smtp-profile-pass");
        smtp.start();
    }

    @DynamicPropertySource
    static void mailProperties(DynamicPropertyRegistry r) {
        r.add("spring.mail.host", () -> "127.0.0.1");
        r.add("spring.mail.port", () -> smtp.getSmtp().getPort());
        r.add("spring.mail.username", () -> "smtp-user-profile");
        r.add("spring.mail.password", () -> "smtp-profile-pass");
        r.add("spring.mail.properties.mail.smtp.auth", () -> "true");
        r.add("spring.mail.properties.mail.smtp.starttls.enable", () -> "false");
        r.add("spring.mail.properties.mail.smtp.starttls.required", () -> "false");
        r.add("ceroa.recovery.mail-from", () -> "profile-test@example.com");
    }

    @AfterAll
    static void stopSmtp() { smtp.stop(); }

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired UserRepository users;
    @Autowired PasswordRecoveryRepository recoveries;
    @Autowired EmailChangeService emailChangeService;

    String source;
    String email;
    Cookie session;

    @BeforeEach
    void registerUser() throws Exception {
        source = UUID.randomUUID().toString();
        email = "profile-" + UUID.randomUUID() + "@example.com";
        session = postJson("/auth/register", Map.of(
            "fullName", "Test User",
            "email", email,
            "phone", "+573001234567",
            "birthDate", "1990-06-15",
            "password", "Password!123",
            "confirmPassword", "Password!123",
            "acceptTerms", true,
            "acceptPrivacy", true
        )).andExpect(status().isOk())
          .andReturn().getResponse().getCookie(SessionAuthenticationFilter.COOKIE_NAME);
    }

    ResultActions postJson(String path, Object body, Cookie... cookies) throws Exception {
        var req = post("/api/v1" + path).with(csrf())
            .with(r -> { r.setRemoteAddr(source); return r; })
            .contentType("application/json")
            .content(json.writeValueAsString(body));
        if (cookies.length > 0) req.cookie(cookies);
        return mvc.perform(req);
    }

    ResultActions putJson(String path, Object body, Cookie... cookies) throws Exception {
        var req = put("/api/v1" + path).with(csrf())
            .with(r -> { r.setRemoteAddr(source); return r; })
            .contentType("application/json")
            .content(json.writeValueAsString(body));
        if (cookies.length > 0) req.cookie(cookies);
        return mvc.perform(req);
    }

    // ─── HU-014: Get Profile ─────────────────────────────────────────────────

    @Test
    void getProfileReturnsAuthenticatedUserData() throws Exception {
        mvc.perform(get("/api/v1/users/me").cookie(session))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").value(email))
            .andExpect(jsonPath("$.fullName").value("Test User"))
            .andExpect(jsonPath("$.passwordHash").doesNotExist());
    }

    @Test
    void getProfileWithoutAuthReturns401() throws Exception {
        mvc.perform(get("/api/v1/users/me"))
            .andExpect(status().isUnauthorized());
    }

    // ─── HU-015: Update Profile ───────────────────────────────────────────────

    @Test
    void updateProfileWithValidDataSucceeds() throws Exception {
        putJson("/users/me", Map.of(
            "fullName", "Updated Name",
            "phone", "+5730099",
            "documentId", "CC123456",
            "birthDate", "1985-03-20"
        ), session)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.fullName").value("Updated Name"))
        .andExpect(jsonPath("$.birthDate").value("1985-03-20"))
        .andExpect(jsonPath("$.email").value(email)); // email unchanged
    }

    @Test
    void updateProfileWithBlankFullNameReturns400() throws Exception {
        putJson("/users/me", Map.of("fullName", ""), session)
            .andExpect(status().isBadRequest());
    }

    @Test
    void updateProfileWithWhitespaceOnlyFullNameReturns400() throws Exception {
        putJson("/users/me", Map.of("fullName", "   "), session)
            .andExpect(status().isBadRequest());
    }

    @Test
    void updateProfileWithInvalidPhoneReturns400() throws Exception {
        putJson("/users/me", Map.of("fullName", "Test User", "phone", "abc-invalid"), session)
            .andExpect(status().isBadRequest());
    }

    @Test
    void updateProfileWithFutureBirthDateReturns422() throws Exception {
        putJson("/users/me", Map.of("fullName", "Test User", "birthDate", "2999-01-01"), session)
            .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void updateProfileWithUnderageBirthDateReturns422() throws Exception {
        // Born 10 years ago — definitely underage
        String underageDate = java.time.LocalDate.now().minusYears(10).toString();
        putJson("/users/me", Map.of("fullName", "Test User", "birthDate", underageDate), session)
            .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void updateProfileDoesNotChangeEmail() throws Exception {
        // Even if client sends an "email" field in the JSON body, the email must not change
        // because UserUpdateRequest no longer has an email field
        String bodyWithEmail = "{\"fullName\":\"New Name\",\"email\":\"hacker@evil.com\"}";
        mvc.perform(put("/api/v1/users/me").with(csrf()).cookie(session)
            .contentType("application/json").content(bodyWithEmail))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").value(email)); // original email preserved
    }

    // ─── HU-016: Request Email Change ────────────────────────────────────────

    @Test
    void requestEmailChangeWithValidEmailReturnsRequestId() throws Exception {
        String newEmail = "new-" + UUID.randomUUID() + "@example.com";
        postJson("/users/me/email/change", Map.of("newEmail", newEmail), session)
            .andExpect(status().isAccepted())
            .andExpect(jsonPath("$.requestId").exists())
            .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void requestEmailChangeWithInvalidEmailReturns400() throws Exception {
        postJson("/users/me/email/change", Map.of("newEmail", "not-an-email"), session)
            .andExpect(status().isBadRequest());
    }

    @Test
    void requestEmailChangeWithSameEmailReturns422() throws Exception {
        postJson("/users/me/email/change", Map.of("newEmail", email), session)
            .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void oldEmailRemainsActiveAfterRequestButBeforeVerify() throws Exception {
        String newEmail = "pending-change-" + UUID.randomUUID() + "@example.com";

        // Initiate the email change
        postJson("/users/me/email/change", Map.of("newEmail", newEmail), session)
            .andExpect(status().isAccepted());

        // Old email must still work for authentication
        mvc.perform(get("/api/v1/users/me").cookie(session))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").value(email));
    }

    // ─── HU-017: Verify Email Change ─────────────────────────────────────────

    @Test
    void verifyEmailChangeWithCorrectCodeUpdatesEmail() throws Exception {
        String newEmail = "verified-" + UUID.randomUUID() + "@example.com";

        // 1. Request the email change
        var changeResponse = postJson("/users/me/email/change", Map.of("newEmail", newEmail), session)
            .andExpect(status().isAccepted()).andReturn().getResponse();
        UUID requestId = UUID.fromString(
            json.readTree(changeResponse.getContentAsString()).get("requestId").asText());

        // 2. Deliver code (simulate delivery job)
        emailChangeService.deliver(requestId);

        // 3. Extract code from captured email
        var messages = smtp.getReceivedMessages();
        assertThat(messages).hasSizeGreaterThanOrEqualTo(1);
        String content = (String) messages[messages.length - 1].getContent();
        Matcher matcher = Pattern.compile("[0-9]{8}").matcher(content);
        assertThat(matcher.find()).isTrue();
        String code = matcher.group();

        // 4. Verify the code → email must be updated
        postJson("/users/me/email/verify", Map.of("requestId", requestId, "code", code), session)
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").value(newEmail));

        // 5. Confirm persistence
        assertThat(users.findByEmailIgnoreCase(newEmail)).isPresent();
        assertThat(users.findByEmailIgnoreCase(email)).isEmpty();
    }

    @Test
    void verifyEmailChangeWithWrongCodeDoesNotUpdateEmail() throws Exception {
        String newEmail = "wrong-code-" + UUID.randomUUID() + "@example.com";

        var changeResponse = postJson("/users/me/email/change", Map.of("newEmail", newEmail), session)
            .andExpect(status().isAccepted()).andReturn().getResponse();
        UUID requestId = UUID.fromString(
            json.readTree(changeResponse.getContentAsString()).get("requestId").asText());

        emailChangeService.deliver(requestId);

        var row = recoveries.findById(requestId).orElseThrow();
        String wrongCode = row.codeHash != null ? "00000000" : "11111111";

        postJson("/users/me/email/verify", Map.of("requestId", requestId, "code", wrongCode), session)
            .andExpect(status().isUnprocessableEntity());

        // Email must remain unchanged
        assertThat(users.findByEmailIgnoreCase(email)).isPresent();
        assertThat(users.findByEmailIgnoreCase(newEmail)).isEmpty();
    }

    @Test
    void verifyEmailChangeWithExpiredRequestFails() throws Exception {
        String newEmail = "expired-" + UUID.randomUUID() + "@example.com";

        var changeResponse = postJson("/users/me/email/change", Map.of("newEmail", newEmail), session)
            .andExpect(status().isAccepted()).andReturn().getResponse();
        UUID requestId = UUID.fromString(
            json.readTree(changeResponse.getContentAsString()).get("requestId").asText());

        emailChangeService.deliver(requestId);

        // Expire the request
        var row = recoveries.findById(requestId).orElseThrow();
        row.expiresAt = OffsetDateTime.now().minusSeconds(1);
        recoveries.save(row);

        postJson("/users/me/email/verify", Map.of("requestId", requestId, "code", "00000000"), session)
            .andExpect(status().isUnprocessableEntity());

        // Email must remain unchanged
        assertThat(users.findByEmailIgnoreCase(email)).isPresent();
    }

    @Test
    void verifyEmailChangeWithAlreadyUsedCodeFails() throws Exception {
        String newEmail = "used-code-" + UUID.randomUUID() + "@example.com";

        // 1. Request
        var changeResponse = postJson("/users/me/email/change", Map.of("newEmail", newEmail), session)
            .andExpect(status().isAccepted()).andReturn().getResponse();
        UUID requestId = UUID.fromString(
            json.readTree(changeResponse.getContentAsString()).get("requestId").asText());

        // 2. Deliver
        emailChangeService.deliver(requestId);

        // 3. Extract code
        var messages = smtp.getReceivedMessages();
        String content = (String) messages[messages.length - 1].getContent();
        Matcher matcher = Pattern.compile("[0-9]{8}").matcher(content);
        assertThat(matcher.find()).isTrue();
        String code = matcher.group();

        // 4. First verify succeeds
        postJson("/users/me/email/verify", Map.of("requestId", requestId, "code", code), session)
            .andExpect(status().isOk());

        // 5. Second verify with same code fails
        postJson("/users/me/email/verify", Map.of("requestId", requestId, "code", code), session)
            .andExpect(status().isUnprocessableEntity());
    }
}
