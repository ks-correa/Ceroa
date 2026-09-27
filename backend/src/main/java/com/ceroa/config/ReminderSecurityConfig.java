package com.ceroa.config;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.core.annotation.Order;
import org.springframework.http.*;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.*;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.util.List;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
@Configuration
public class ReminderSecurityConfig {
    @Bean @Order(-3)
    SecurityFilterChain reminderWorker(HttpSecurity http,@Value("${ceroa.reminders.worker-key:}") String key,
        @Value("${ceroa.reminders.enabled:false}") boolean enabled) throws Exception {
        var filter=new OncePerRequestFilter(){
            @Override protected void doFilterInternal(HttpServletRequest req,HttpServletResponse res,FilterChain chain) throws IOException,ServletException {
                String received=req.getHeader("X-Ceroa-Reminders");
                if(enabled&&key.length()>=32&&received!=null&&received.length()<=256&&MessageDigest.isEqual(key.getBytes(StandardCharsets.UTF_8),received.getBytes(StandardCharsets.UTF_8))){
                    var context=SecurityContextHolder.createEmptyContext();context.setAuthentication(new UsernamePasswordAuthenticationToken("reminder-worker",null,List.of(new SimpleGrantedAuthority("REMINDER_DELIVERY"))));SecurityContextHolder.setContext(context);
                }chain.doFilter(req,res);
            }
        };
        return http.securityMatcher("/api/v1/reminder-worker/**").csrf(c->c.disable()).requestCache(c->c.disable()).logout(c->c.disable())
            .sessionManagement(s->s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(a->a.requestMatchers(HttpMethod.GET,"/api/v1/reminder-worker/candidates").hasAuthority("REMINDER_DELIVERY")
                .requestMatchers(HttpMethod.POST,"/api/v1/reminder-worker/scan","/api/v1/reminder-worker/deliveries/*/reserve","/api/v1/reminder-worker/deliveries/*/dispatch","/api/v1/reminder-worker/deliveries/*/outcome").hasAuthority("REMINDER_DELIVERY").anyRequest().denyAll())
            .exceptionHandling(e->e.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
            .addFilterBefore(filter,AuthorizationFilter.class).build();
    }
}
