package com.ceroa.config;
import com.ceroa.domain.*;import com.ceroa.repository.*;import com.ceroa.service.*;
import org.junit.jupiter.api.*;import org.springframework.beans.factory.annotation.Autowired;import org.springframework.boot.test.context.SpringBootTest;import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;import org.springframework.test.web.servlet.MockMvc;
import java.util.*;import java.time.*;import org.springframework.security.core.context.SecurityContextHolder;import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import static org.junit.jupiter.api.Assertions.*;import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
@SpringBootTest @AutoConfigureMockMvc
class McpIntegrationTest {
 @Autowired McpAccessService access;@Autowired McpAccessTokenRepository tokens;@Autowired UserRepository users;@Autowired MockMvc mvc;@Autowired PlusSubscriptionRepository subscriptions;
 User owner;
 @BeforeEach void setup(){owner=new User();owner.setFullName("MCP fixture");owner.setEmail(UUID.randomUUID()+"@example.invalid");owner=users.saveAndFlush(owner);as(owner.getId());}
 void as(UUID id){var c=SecurityContextHolder.createEmptyContext();c.setAuthentication(new UsernamePasswordAuthenticationToken(id.toString(),null,List.of()));SecurityContextHolder.setContext(c);}
 @AfterEach void clear(){SecurityContextHolder.clearContext();}
 @Test void unknownScopeCannotIssueAndOnlyHashIsStored(){assertThrows(RuntimeException.class,()->access.issue(Set.of("admin")));var t=access.issue(Set.of("finance.upcoming"));assertNotEquals(t.token(),tokens.findById(t.id()).orElseThrow().tokenHash);}
 @Test void tokenCannotExpandScopeOrUseAdminTools()throws Exception{var t=access.issue(Set.of("subscription.read"));SecurityContextHolder.clearContext();mvc.perform(post("/api/v1/mcp-tools/subscription.read").header("X-Ceroa-MCP",t.token()).contentType("application/json").content("{\"offset\":0,\"ownerId\":\""+UUID.randomUUID()+"\"}")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("NONE"));mvc.perform(post("/api/v1/mcp-tools/finance.debts").header("X-Ceroa-MCP",t.token()).contentType("application/json").content("{}")).andExpect(status().isForbidden());mvc.perform(post("/api/v1/mcp-tools/rawSQL").header("X-Ceroa-MCP",t.token()).contentType("application/json").content("{}")).andExpect(status().isForbidden());}
 @Test void revokedExpiredAndInactiveOwnerTokensFail()throws Exception{var t=access.issue(Set.of("subscription.read"));access.revoke(t.id());SecurityContextHolder.clearContext();mvc.perform(post("/api/v1/mcp-tools/subscription.read").header("X-Ceroa-MCP",t.token()).contentType("application/json").content("{}")).andExpect(status().isUnauthorized());as(owner.getId());var expired=access.issue(Set.of("subscription.read"));var row=tokens.findById(expired.id()).orElseThrow();row.expiresAt=OffsetDateTime.now().minusSeconds(1);tokens.saveAndFlush(row);SecurityContextHolder.clearContext();mvc.perform(post("/api/v1/mcp-tools/subscription.read").header("X-Ceroa-MCP",expired.token()).contentType("application/json").content("{}")).andExpect(status().isUnauthorized());}
 @Test void otherOwnerCannotRevoke(){var t=access.issue(Set.of("finance.summary"));as(UUID.randomUUID());assertThrows(RuntimeException.class,()->access.revoke(t.id()));}
 @Test void identityComesOnlyFromTokenAndInactiveOwnersAreRejected()throws Exception{
  var s=new PlusSubscription();s.user=owner;s.periodicity="MONTHLY";s.amount=new java.math.BigDecimal("19900");s.currency="COP";s.status="ACTIVE";subscriptions.saveAndFlush(s);
  var other=new User();other.setFullName("Other MCP owner");other.setEmail(UUID.randomUUID()+"@example.invalid");other=users.saveAndFlush(other);var t=access.issue(Set.of("subscription.read"));SecurityContextHolder.clearContext();
  mvc.perform(post("/api/v1/mcp-tools/subscription.read").header("X-Ceroa-MCP",t.token()).contentType("application/json").content("{\"offset\":0,\"ownerId\":\""+other.getId()+"\"}")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("ACTIVE"));
  owner.setActive(false);users.saveAndFlush(owner);mvc.perform(post("/api/v1/mcp-tools/subscription.read").header("X-Ceroa-MCP",t.token()).contentType("application/json").content("{}")).andExpect(status().isUnauthorized());
 }
}
