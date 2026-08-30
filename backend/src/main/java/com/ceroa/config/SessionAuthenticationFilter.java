package com.ceroa.config;

import com.ceroa.domain.AuthSession;
import com.ceroa.repository.AuthSessionRepository;
import com.ceroa.service.SessionTokenService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

@Component
public class SessionAuthenticationFilter extends OncePerRequestFilter {
    public static final String COOKIE_NAME = "ceroa_session";

    private final AuthSessionRepository sessionRepository;
    private final SessionTokenService tokenService;

    public SessionAuthenticationFilter(AuthSessionRepository sessionRepository, SessionTokenService tokenService) {
        this.sessionRepository = sessionRepository;
        this.tokenService = tokenService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        rawToken(request).flatMap(this::findSession).ifPresent(this::authenticate);
        filterChain.doFilter(request, response);
    }

    private Optional<String> rawToken(HttpServletRequest request) {
        if (request.getCookies() == null) return Optional.empty();
        return Arrays.stream(request.getCookies())
                .filter(cookie -> COOKIE_NAME.equals(cookie.getName()))
                .map(Cookie::getValue)
                .filter(value -> !value.isBlank())
                .findFirst();
    }

    private Optional<AuthSession> findSession(String rawToken) {
        return sessionRepository.findByTokenHashAndExpiresAtAfter(tokenService.hash(rawToken), OffsetDateTime.now())
                .filter(session -> session.getUser().isActive());
    }

    private void authenticate(AuthSession session) {
        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                session.getUser().getId().toString(), null, List.of(new SimpleGrantedAuthority("ROLE_USER")));
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
    }
}
