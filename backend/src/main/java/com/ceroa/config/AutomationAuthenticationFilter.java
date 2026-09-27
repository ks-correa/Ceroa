package com.ceroa.config;

import com.ceroa.repository.AutomationTokenRepository;
import com.ceroa.service.SessionTokenService;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.*;

public class AutomationAuthenticationFilter extends OncePerRequestFilter {
    private final AutomationTokenRepository tokens;
    private final SessionTokenService secrets;
    public AutomationAuthenticationFilter(AutomationTokenRepository tokens, SessionTokenService secrets) {
        this.tokens = tokens; this.secrets = secrets;
    }
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String authorization = request.getHeader("Authorization");
        if (authorization != null && authorization.startsWith("Bearer ") && authorization.length() <= 128) {
            tokens.findByTokenHash(secrets.hash(authorization.substring(7))).filter(t -> t.usable()).ifPresent(token -> {
                var authorities = new ArrayList<SimpleGrantedAuthority>();
                authorities.add(new SimpleGrantedAuthority("AUTOMATION_READ"));
                if (token.allowWrites) authorities.add(new SimpleGrantedAuthority("AUTOMATION_WRITE"));
                var authentication = new UsernamePasswordAuthenticationToken(token.user.getId().toString(), null, authorities);
                authentication.setDetails(token.id);
                var context = SecurityContextHolder.createEmptyContext();
                context.setAuthentication(authentication);
                SecurityContextHolder.setContext(context);
            });
        }
        chain.doFilter(request, response);
    }
}
