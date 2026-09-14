package com.ceroa.config;

import com.ceroa.repository.*;
import com.ceroa.service.*;
import com.ceroa.api.dto.ExternalRegistrationRequest;
import com.ceroa.exception.BusinessRuleException;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.*;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

// Test-only credentials enable the protocol filters without contacting either provider.
@SpringBootTest(properties = {"GOOGLE_CLIENT_ID=test-google", "GOOGLE_CLIENT_SECRET=test-secret",
    "MICROSOFT_CLIENT_ID=test-microsoft", "MICROSOFT_CLIENT_SECRET=test-secret",
    "MICROSOFT_TENANT_ID=11111111-1111-1111-1111-111111111111"})
@AutoConfigureMockMvc
@Transactional
class OAuthFlowTest {
    @Autowired MockMvc mvc;
    @Autowired OAuthHandlers handlers;
    @Autowired ExternalAuthService external;
    @Autowired UserRepository users;
    @Autowired AuthSessionRepository sessions;
    @ParameterizedTest @ValueSource(strings = {"google", "microsoft"})
    void startsRealAuthorizationAndRejectsUncorrelatedCallback(String provider) throws Exception {
        mvc.perform(post("/api/v1/auth/external/" + provider + "/start").with(csrf()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.url").value("/oauth2/authorization/" + provider));
        var response = mvc.perform(get("/oauth2/authorization/" + provider)).andExpect(status().is3xxRedirection()).andReturn().getResponse();
        assertThat(response.getRedirectedUrl()).contains("response_type=code", "state=", "nonce=");
        long count = sessions.count();
        mvc.perform(get("/login/oauth2/code/" + provider).param("code", "untrusted").param("state", "forged"))
            .andExpect(status().is3xxRedirection()).andExpect(redirectedUrl("http://localhost:3000/?auth=error"));
        assertThat(sessions.count()).isEqualTo(count);
        mvc.perform(get("/api/v1/auth/me")).andExpect(status().isUnauthorized());
    }
    @ParameterizedTest @ValueSource(strings = {"google", "microsoft"})
    void validatedIdentityWaitsForRegistrationThenReturnsExistingAccount(String provider) throws Exception {
        String subject = UUID.randomUUID().toString(); String email = subject + "@example.com";
        var claims = new HashMap<String, Object>(Map.of("sub", subject, "iss", "https://issuer.example", "email", email, "email_verified", true, "name", "Ana García"));
        var principal = new DefaultOidcUser(List.of(), new OidcIdToken("test-token-never-persisted", Instant.now(), Instant.now().plusSeconds(300), claims));
        var authentication = new OAuth2AuthenticationToken(principal, List.of(), provider);
        var request = new MockHttpServletRequest(); var response = new MockHttpServletResponse();
        long before = sessions.count();
        handlers.success(request, response, authentication);
        assertThat(response.getRedirectedUrl()).endsWith("?auth=complete");
        assertThat(sessions.count()).isEqualTo(before);
        var pending = (PendingIdentity) request.getSession().getAttribute(OAuthHandlers.PENDING);
        assertThat(pending.email()).isEqualTo(email);
        var result = external.complete(pending, new ExternalRegistrationRequest("Ana García", email, "+573001234567", LocalDate.of(1990, 1, 1), true, true));
        var user = users.findById(result.user().id()).orElseThrow();
        user.setInitialSetupComplete(true); users.saveAndFlush(user);
        long accounts = users.count();
        request = new MockHttpServletRequest(); response = new MockHttpServletResponse();
        handlers.success(request, response, authentication);
        assertThat(response.getRedirectedUrl()).endsWith("?auth=success");
        assertThat(response.getHeader("Set-Cookie")).contains("HttpOnly");
        assertThat(request.getSession(false)).isNull();
        assertThat(users.count()).isEqualTo(accounts);
        assertThat(external.login(pending).orElseThrow().user().initialSetupComplete()).isTrue();
        var other = new PendingIdentity(provider, pending.issuer(), "another-subject", email, "Other", Instant.now().plusSeconds(600));
        assertThatThrownBy(() -> external.complete(other, new ExternalRegistrationRequest("Other", email, "+573001234567", LocalDate.of(1990, 1, 1), true, true)))
            .isInstanceOf(BusinessRuleException.class);
    }
    @ParameterizedTest @ValueSource(strings = {"google", "microsoft"})
    void cancellationInvalidatesTransientState(String provider) throws Exception {
        var session = new MockHttpSession();
        mvc.perform(get("/oauth2/authorization/" + provider).session(session)).andExpect(status().is3xxRedirection());
        long count = sessions.count();
        mvc.perform(get("/login/oauth2/code/" + provider).session(session).param("error", "access_denied").param("state", "cancelled"))
            .andExpect(redirectedUrl("http://localhost:3000/?auth=error"));
        assertThat(session.isInvalid()).isTrue(); assertThat(sessions.count()).isEqualTo(count);
    }
}
