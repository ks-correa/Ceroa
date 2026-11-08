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

@Configuration
public class WorkspaceSecurityConfig {
    @Bean @Order(-5)
    SecurityFilterChain workspace(HttpSecurity http,@Value("${ceroa.workspace.worker-key:}")String key)throws Exception {
        var filter=new OncePerRequestFilter(){@Override protected void doFilterInternal(HttpServletRequest req,HttpServletResponse res,FilterChain chain)throws IOException,ServletException{
            String received=req.getHeader("X-Ceroa-Workspace");
            if(key.length()>=32&&received!=null&&received.length()<=256&&MessageDigest.isEqual(key.getBytes(StandardCharsets.UTF_8),received.getBytes(StandardCharsets.UTF_8))){var c=SecurityContextHolder.createEmptyContext();c.setAuthentication(new UsernamePasswordAuthenticationToken("workspace-worker",null,List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("WORKSPACE_WORKER"))));SecurityContextHolder.setContext(c);}chain.doFilter(req,res);
        }};
        return http.securityMatcher("/api/v1/workspace-tools/**").csrf(c->c.disable()).requestCache(c->c.disable()).logout(c->c.disable()).sessionManagement(c->c.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(a->a.requestMatchers(org.springframework.http.HttpMethod.POST,"/api/v1/workspace-tools/drive/reconcile","/api/v1/workspace-tools/drive/validate","/api/v1/workspace-tools/drive/*/ingest","/api/v1/workspace-tools/events/claim","/api/v1/workspace-tools/events/*/dispatch","/api/v1/workspace-tools/events/*/outcome").hasAuthority("WORKSPACE_WORKER").anyRequest().denyAll())
            .exceptionHandling(e->e.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))).addFilterBefore(filter,AuthorizationFilter.class).build();
    }
}
