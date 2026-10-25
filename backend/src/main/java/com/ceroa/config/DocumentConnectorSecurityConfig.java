package com.ceroa.config;

import org.springframework.context.annotation.*;
import org.springframework.core.annotation.Order;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.*;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.http.HttpStatus;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;

/** Configured connector tokens resolve to a fixed owner; payloads cannot choose an account. */
@Configuration
public class DocumentConnectorSecurityConfig {
    @Bean @Order(-4)
    SecurityFilterChain documentConnectors(HttpSecurity http,javax.sql.DataSource ds,@Value("${ceroa.library.enabled:false}")boolean enabled)throws Exception {
        var db=new org.springframework.jdbc.core.JdbcTemplate(ds);
        var filter=new OncePerRequestFilter(){
            @Override protected void doFilterInternal(HttpServletRequest req,HttpServletResponse res,FilterChain chain)throws IOException,ServletException {
                String token=req.getHeader("X-Ceroa-Connector");
                if(enabled&&token!=null&&token.length()>=32&&token.length()<=256) {
                    try {
                        String hash=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));
                        var owners=db.queryForList("SELECT c.owner_id FROM document_source_connectors c JOIN users u ON u.id=c.owner_id WHERE c.token_hash=? AND c.active=true AND c.expires_at>now() AND u.active=true",UUID.class,hash);
                        if(owners.size()==1){var context=SecurityContextHolder.createEmptyContext();context.setAuthentication(new UsernamePasswordAuthenticationToken(owners.getFirst().toString(),null,List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("DOCUMENT_CONNECTOR"))));SecurityContextHolder.setContext(context);}
                    }catch(Exception e){res.setStatus(401);return;}
                }
                chain.doFilter(req,res);
            }
        };
        return http.securityMatcher("/api/v1/document-connectors/**").csrf(c->c.disable()).requestCache(c->c.disable()).logout(c->c.disable()).sessionManagement(c->c.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(a->a.requestMatchers(org.springframework.http.HttpMethod.POST,"/api/v1/document-connectors/upload").hasAuthority("DOCUMENT_CONNECTOR").anyRequest().denyAll())
            .exceptionHandling(e->e.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))).addFilterBefore(filter,AuthorizationFilter.class).build();
    }
}
