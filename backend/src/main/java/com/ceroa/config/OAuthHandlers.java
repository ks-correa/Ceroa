package com.ceroa.config;

import com.ceroa.service.*;
import jakarta.servlet.http.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import java.io.IOException;
import java.time.Instant;

@Component
public class OAuthHandlers {
    public static final String PENDING = "ceroa.pendingIdentity";
    private final ExternalAuthService external;
    private final AuthCookieService cookies;
    private final String frontend;
    public OAuthHandlers(ExternalAuthService external, AuthCookieService cookies,
                         @Value("${ceroa.frontend-url}") String frontend) {
        this.external = external; this.cookies = cookies; this.frontend = frontend;
    }
    public void success(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException {
        try {
            var oauth = (OAuth2AuthenticationToken) authentication;
            var user = (OidcUser) oauth.getPrincipal();
            String email = user.getEmail();
            if ("google".equals(oauth.getAuthorizedClientRegistrationId()) && !Boolean.TRUE.equals(user.getEmailVerified())) email = null;
            if (email != null && (email.length() > 254 || !email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"))) email = null;
            var pending = new PendingIdentity(oauth.getAuthorizedClientRegistrationId(), user.getIssuer().toString(),
                user.getSubject(), email, user.getFullName(), Instant.now().plusSeconds(600));
            var result = external.login(pending);
            clear(request);
            if (result.isPresent()) {
                response.addHeader("Set-Cookie", cookies.issue(result.get().token()));
                response.sendRedirect(frontend + "/?auth=success");
            } else {
                response.addHeader("Set-Cookie", cookies.issue(""));
                request.getSession(true).setMaxInactiveInterval(600);
                request.getSession().setAttribute(PENDING, pending);
                response.sendRedirect(frontend + "/?auth=complete");
            }
        } catch (RuntimeException exception) { failure(request, response); }
        finally { SecurityContextHolder.clearContext(); }
    }
    public void failure(HttpServletRequest request, HttpServletResponse response) throws IOException {
        clear(request);
        SecurityContextHolder.clearContext();
        response.addHeader("Set-Cookie", cookies.issue(""));
        response.sendRedirect(frontend + "/?auth=error");
    }
    public static void clear(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) session.invalidate();
    }
}
