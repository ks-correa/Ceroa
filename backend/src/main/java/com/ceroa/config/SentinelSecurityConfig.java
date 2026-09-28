package com.ceroa.config;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.core.annotation.Order;
import org.springframework.http.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.*;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;

@Configuration
public class SentinelSecurityConfig {
    @Bean @Order(-3)
    SecurityFilterChain sentinelWorker(HttpSecurity http,@Value("${ceroa.sentinel.worker-key:}") String key,
        @Value("${ceroa.sentinel.enabled:false}") boolean enabled) throws Exception {
        var filter=new OncePerRequestFilter(){
            @Override protected void doFilterInternal(HttpServletRequest req,HttpServletResponse res,FilterChain chain) throws IOException,ServletException {
                String received=req.getHeader("X-Ceroa-Sentinel");
                if(enabled&&key.length()>=32&&received!=null&&received.length()<=256&&MessageDigest.isEqual(key.getBytes(StandardCharsets.UTF_8),received.getBytes(StandardCharsets.UTF_8))){
                    var context=SecurityContextHolder.createEmptyContext();
                    context.setAuthentication(new UsernamePasswordAuthenticationToken("sentinel-worker",null,List.of(new SimpleGrantedAuthority("SENTINEL_DELIVERY"))));
                    SecurityContextHolder.setContext(context);
                }
                chain.doFilter(req,res);
            }
        };
        return http.securityMatcher("/api/v1/sentinel-worker/**").csrf(c->c.disable()).requestCache(c->c.disable()).logout(c->c.disable())
            .sessionManagement(s->s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(a->a.requestMatchers(HttpMethod.GET,"/api/v1/sentinel-worker/candidates").hasAuthority("SENTINEL_DELIVERY")
                .requestMatchers(HttpMethod.POST,"/api/v1/sentinel-worker/scan","/api/v1/sentinel-worker/deliveries/*/reserve","/api/v1/sentinel-worker/deliveries/*/dispatch","/api/v1/sentinel-worker/deliveries/*/outcome").hasAuthority("SENTINEL_DELIVERY")
                .anyRequest().denyAll())
            .exceptionHandling(e->e.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
            .addFilterBefore(filter,AuthorizationFilter.class).build();
    }
}
