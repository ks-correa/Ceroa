package com.ceroa.config;

import com.ceroa.domain.User;
import com.ceroa.repository.*;
import com.ceroa.service.PendingIdentity;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AuthIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired UserRepository users;
    @Autowired AuthSessionRepository sessions;
    @Autowired ExternalIdentityRepository identities;
    @Autowired PasswordEncoder encoder;

    Map<String, Object> registration() {
        return new HashMap<>(Map.of("fullName", "Ana García", "email", UUID.randomUUID() + "@example.com",
            "phone", "+573001234567", "birthDate", "1995-01-20", "password", "Password!",
            "confirmPassword", "Password!", "acceptTerms", true, "acceptPrivacy", true));
    }
    @Test void registersPersistsHashesAndRestoresSession() throws Exception {
        var body = registration();
        var response = mvc.perform(post("/api/v1/auth/register").with(csrf()).contentType("application/json").content(json.writeValueAsString(body)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.initialSetupComplete").value(false))
            .andExpect(jsonPath("$.passwordHash").doesNotExist()).andExpect(jsonPath("$.token").doesNotExist()).andReturn().getResponse();
        User user = users.findByEmailIgnoreCase((String) body.get("email")).orElseThrow();
        assertThat(encoder.matches("Password!", user.getPasswordHash())).isTrue();
        assertThat(user.getPhone()).isEqualTo(body.get("phone"));
        assertThat(user.getBirthDate()).hasToString("1995-01-20");
        assertThat(user.getTermsAcceptedAt()).isNotNull(); assertThat(user.getPrivacyAcceptedAt()).isNotNull();
        assertThat(response.getHeader("Set-Cookie")).contains("HttpOnly", "SameSite=Lax");
        Cookie cookie = response.getCookie(SessionAuthenticationFilter.COOKIE_NAME);
        mvc.perform(get("/api/v1/auth/me").cookie(cookie)).andExpect(status().isOk()).andExpect(jsonPath("$.email").value(body.get("email")));
        mvc.perform(get("/api/v1/auth/me").cookie(new Cookie(SessionAuthenticationFilter.COOKIE_NAME, "forged"))).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/auth/register").with(csrf()).contentType("application/json").content(json.writeValueAsString(body))).andExpect(status().isUnprocessableEntity());
    }
    @ParameterizedTest
    @CsvSource(value = {"fullName|   ", "email|bad", "email|ana @example.com", "phone|abc123", "phone|123", "birthDate|2020-01-01", "birthDate|2999-01-01", "birthDate|2000-02-30", "password|weak", "password|Password ", "confirmPassword|Different!", "acceptTerms|false", "acceptPrivacy|false"}, delimiter = '|', ignoreLeadingAndTrailingWhitespace = false)
    void rejectsInvalidFields(String field, String value) throws Exception {
        var body = registration(); body.put(field, field.startsWith("accept") ? Boolean.valueOf(value) : value);
        long before = users.count();
        mvc.perform(post("/api/v1/auth/register").with(csrf()).contentType("application/json").content(json.writeValueAsString(body))).andExpect(status().isBadRequest());
        assertThat(users.count()).isEqualTo(before);
    }
    @ParameterizedTest @org.junit.jupiter.params.provider.ValueSource(strings = {"fullName", "email", "phone", "birthDate", "password", "confirmPassword", "acceptTerms", "acceptPrivacy"})
    void requiresEveryField(String field) throws Exception {
        var body = registration(); body.remove(field);
        mvc.perform(post("/api/v1/auth/register").with(csrf()).contentType("application/json").content(json.writeValueAsString(body))).andExpect(status().isBadRequest());
    }
    @Test void loginReturnsSetupStatusAndGenericErrors() throws Exception {
        var body = registration();
        mvc.perform(post("/api/v1/auth/register").with(csrf()).contentType("application/json").content(json.writeValueAsString(body))).andExpect(status().isOk());
        String credentials = json.writeValueAsString(Map.of("email", body.get("email"), "password", "Password!"));
        mvc.perform(post("/api/v1/auth/login").with(csrf()).contentType("application/json").content(credentials)).andExpect(status().isOk()).andExpect(jsonPath("$.initialSetupComplete").value(false));
        User user = users.findByEmailIgnoreCase((String) body.get("email")).orElseThrow(); user.setInitialSetupComplete(true); users.saveAndFlush(user);
        mvc.perform(post("/api/v1/auth/login").with(csrf()).contentType("application/json").content(credentials)).andExpect(status().isOk()).andExpect(jsonPath("$.initialSetupComplete").value(true));
        for (String email : List.of(user.getEmail(), "missing@example.com"))
            mvc.perform(post("/api/v1/auth/login").with(csrf()).contentType("application/json").content(json.writeValueAsString(Map.of("email", email, "password", "Wrong!"))))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.message").value("Correo o contraseña incorrectos."));
        mvc.perform(post("/api/v1/auth/login").with(csrf()).contentType("application/json").content("{\"email\":\"bad\",\"password\":\"Password!\"}")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/debts")).andExpect(status().isUnauthorized());
    }
    @ParameterizedTest @org.junit.jupiter.params.provider.ValueSource(strings = {"google", "microsoft"})
    void completesExternalRegistrationWithoutPasswordAndNeverAuthenticatesPending(String provider) throws Exception {
        var body = registration(); body.remove("password"); body.remove("confirmPassword");
        var pending = new PendingIdentity(provider, "https://issuer.example", UUID.randomUUID().toString(), (String) body.get("email"), "Ana", Instant.now().plusSeconds(600));
        var session = new MockHttpSession(); session.setAttribute(OAuthHandlers.PENDING, pending);
        mvc.perform(get("/api/v1/auth/external/pending").session(session)).andExpect(status().isOk());
        mvc.perform(get("/api/v1/debts").session(session)).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/auth/external/complete").session(session).with(csrf()).contentType("application/json").content(json.writeValueAsString(body)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.initialSetupComplete").value(false));
        assertThat(session.isInvalid()).isTrue();
        User user = users.findByEmailIgnoreCase(pending.email()).orElseThrow();
        assertThat(user.getPasswordHash()).isNull();
        assertThat(identities.findByProviderAndIssuerAndSubject(provider, pending.issuer(), pending.subject())).isPresent();
    }
    @Test void rejectsMissingExpiredOrCancelledExternalRegistration() throws Exception {
        mvc.perform(get("/api/v1/auth/external/pending")).andExpect(status().isUnauthorized());
        var session = new MockHttpSession();
        session.setAttribute(OAuthHandlers.PENDING, new PendingIdentity("google", "issuer", "subject", "a@example.com", "Ana", Instant.now().minusSeconds(1)));
        mvc.perform(get("/api/v1/auth/external/pending").session(session)).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/auth/external/cancel").with(csrf()).session(session)).andExpect(status().isNoContent());
        assertThat(session.isInvalid()).isTrue();
        mvc.perform(post("/api/v1/auth/external/complete").with(csrf()).contentType("application/json").content(json.writeValueAsString(registration()))).andExpect(status().isUnauthorized());
    }
    @Test void rejectsExternalUnderageAndMissingConsent() throws Exception {
        for (String field : List.of("birthDate", "acceptTerms", "acceptPrivacy")) {
            var session = new MockHttpSession();
            session.setAttribute(OAuthHandlers.PENDING, new PendingIdentity("microsoft", "issuer", "subject", null, null, Instant.now().plusSeconds(600)));
            var body = registration(); body.remove("password"); body.remove("confirmPassword");
            body.put(field, field.equals("birthDate") ? "2020-01-01" : false);
            mvc.perform(post("/api/v1/auth/external/complete").with(csrf()).session(session).contentType("application/json").content(json.writeValueAsString(body))).andExpect(status().isBadRequest());
        }
    }
}
