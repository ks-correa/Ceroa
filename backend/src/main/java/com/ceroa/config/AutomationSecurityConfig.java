package com.ceroa.config;

import com.ceroa.repository.AutomationTokenRepository;
import com.ceroa.service.SessionTokenService;
import org.springframework.context.annotation.*;
import org.springframework.core.annotation.Order;
import org.springframework.http.*;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.*;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;

@Configuration
public class AutomationSecurityConfig {
    @Bean @Order(1)
    SecurityFilterChain automationChain(HttpSecurity http, AutomationTokenRepository tokens,
                                        SessionTokenService secrets) throws Exception {
        return http.securityMatcher("/api/v1/automation/**")
            // This chain never accepts browser cookies; CSRF remains enabled on the browser chain.
            .csrf(csrf -> csrf.disable())
            .requestCache(cache -> cache.disable()).logout(logout -> logout.disable())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(a -> a
                .requestMatchers(HttpMethod.GET, "/api/v1/automation/**").hasAuthority("AUTOMATION_READ")
                .requestMatchers(HttpMethod.POST, "/api/v1/automation/**").hasAuthority("AUTOMATION_WRITE")
                .requestMatchers(HttpMethod.PUT, "/api/v1/automation/**").hasAuthority("AUTOMATION_WRITE")
                .requestMatchers(HttpMethod.DELETE, "/api/v1/automation/**").hasAuthority("AUTOMATION_WRITE")
                .anyRequest().denyAll())
            .exceptionHandling(e -> e.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
            .addFilterBefore(new AutomationAuthenticationFilter(tokens, secrets), AuthorizationFilter.class)
            .build();
    }
}
