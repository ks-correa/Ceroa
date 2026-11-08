package com.ceroa.config;
import com.ceroa.repository.*;import com.ceroa.service.*;
import org.springframework.context.annotation.*;import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.*;import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.filter.OncePerRequestFilter;import org.springframework.http.HttpStatus;
import jakarta.servlet.*;import jakarta.servlet.http.*;import java.io.IOException;import java.util.*;import java.time.*;
@Configuration
public class McpSecurityConfig {
 @Bean @Order(-6) SecurityFilterChain mcp(HttpSecurity http,McpAccessTokenRepository tokens,UserRepository users,SessionTokenService secrets)throws Exception{
  var filter=new OncePerRequestFilter(){protected void doFilterInternal(HttpServletRequest req,HttpServletResponse res,FilterChain chain)throws IOException,ServletException{
   String raw=req.getHeader("X-Ceroa-MCP");if(raw!=null&&raw.matches("[A-Za-z0-9_-]{43}"))tokens.findByTokenHash(secrets.hash(raw)).filter(t->t.revokedAt==null&&t.expiresAt.isAfter(OffsetDateTime.now())&&users.findById(t.ownerId).map(u->u.isActive()).orElse(false)).ifPresent(t->{var c=SecurityContextHolder.createEmptyContext();var a=new UsernamePasswordAuthenticationToken(t.ownerId.toString(),null,Arrays.stream(t.scopes.split(",")).map(s->new SimpleGrantedAuthority("MCP_"+s)).toList());a.setDetails(t.id);c.setAuthentication(a);SecurityContextHolder.setContext(c);});chain.doFilter(req,res);
  }};
  return http.securityMatcher("/api/v1/mcp-tools/**").csrf(c->c.disable()).requestCache(c->c.disable()).logout(c->c.disable()).sessionManagement(c->c.sessionCreationPolicy(SessionCreationPolicy.STATELESS)).authorizeHttpRequests(a->{for(String scope:McpAccessService.SCOPES)a.requestMatchers(org.springframework.http.HttpMethod.POST,"/api/v1/mcp-tools/"+scope).hasAuthority("MCP_"+scope);a.anyRequest().denyAll();}).exceptionHandling(e->e.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))).addFilterBefore(filter,AuthorizationFilter.class).build();
 }
}
