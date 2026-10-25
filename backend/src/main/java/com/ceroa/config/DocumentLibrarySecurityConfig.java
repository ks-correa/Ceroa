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
import java.util.List;

@Configuration
public class DocumentLibrarySecurityConfig {
    @Bean @Order(-3)
    SecurityFilterChain libraryTools(HttpSecurity http,@Value("${ceroa.library.enabled:false}") boolean enabled,
        @Value("${ceroa.library.worker-key:}") String key)throws Exception {
        var filter=new OncePerRequestFilter(){
            @Override protected void doFilterInternal(HttpServletRequest req,HttpServletResponse res,FilterChain chain)throws IOException,ServletException {
                String supplied=req.getHeader("X-Ceroa-Library");
                if(supplied==null&&req.getRequestURI().startsWith("/api/v1/library-supabase/"))supplied=req.getHeader("apikey");
                if(enabled&&key.length()>=32&&supplied!=null&&supplied.length()<=256&&MessageDigest.isEqual(key.getBytes(StandardCharsets.UTF_8),supplied.getBytes(StandardCharsets.UTF_8))) {
                    var context=SecurityContextHolder.createEmptyContext();
                    context.setAuthentication(new UsernamePasswordAuthenticationToken("library-worker",null,List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("LIBRARY_WORK"))));SecurityContextHolder.setContext(context);
                }
                chain.doFilter(req,res);
            }
        };
        return http.securityMatcher("/api/v1/library-tools/**","/api/v1/library-supabase/**").csrf(c->c.disable()).requestCache(c->c.disable()).logout(c->c.disable())
            .sessionManagement(c->c.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(a->a.requestMatchers(org.springframework.http.HttpMethod.GET,"/api/v1/library-supabase/rest/v1/ceroa_rag_configuration","/api/v1/library-supabase/rest/v1/","/api/v1/library-supabase/rest/v1").hasAuthority("LIBRARY_WORK").requestMatchers(org.springframework.http.HttpMethod.POST,"/api/v1/library-tools/claim","/api/v1/library-tools/jobs/*/complete","/api/v1/library-tools/jobs/*/fail").hasAuthority("LIBRARY_WORK").anyRequest().denyAll())
            .exceptionHandling(e->e.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))).addFilterBefore(filter,AuthorizationFilter.class).build();
    }
}
