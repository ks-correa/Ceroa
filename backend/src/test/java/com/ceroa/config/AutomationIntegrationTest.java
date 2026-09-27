package com.ceroa.config;

import com.ceroa.domain.*;
import com.ceroa.repository.*;
import com.ceroa.service.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import java.time.OffsetDateTime;
import java.util.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AutomationIntegrationTest {
    static final String OWNER = "30000000-0000-0000-0000-000000000001";
    static final String OTHER = "30000000-0000-0000-0000-000000000002";
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired UserRepository users;
    @Autowired AutomationTokenRepository tokens;
    @Autowired AutomationRequestRepository operations;
    @Autowired PaymentRepository payments;
    @Autowired SessionTokenService secrets;

    @BeforeEach void seed() {
        for (String id : List.of(OWNER, OTHER)) {
            User user = new User(); user.setId(UUID.fromString(id)); user.setFullName("Automation test");
            user.setEmail(id+"@example.com"); user.setPlan(UserPlan.CERO); user.setActive(true); users.save(user);
        }
    }
    String issue(boolean writes) throws Exception {
        var response = mvc.perform(post("/api/v1/integrations/tokens").with(user(OWNER)).with(csrf())
            .contentType("application/json").content("{\"name\":\"n8n\",\"allowWrites\":"+writes+",\"days\":30}"))
            .andExpect(status().isCreated()).andExpect(header().string("Cache-Control", "no-store"))
            .andReturn().getResponse();
        return json.readTree(response.getContentAsString()).get("token").asText();
    }
    Map<String,Object> debt() {
        return Map.of("name","Automation verification", "type","family_loan", "originalAmount",1000,
            "currentBalance",1000,"rateType","NONE", "monthlyPayment",100);
    }
    String createDebt(String token) throws Exception {
        var response = mvc.perform(post("/api/v1/automation/debts").header("Authorization", "Bearer "+token)
            .header("Idempotency-Key", UUID.randomUUID()).contentType("application/json").content(json.writeValueAsString(debt())))
            .andExpect(status().isCreated()).andReturn().getResponse();
        return json.readTree(response.getContentAsString()).get("id").asText();
    }
    @Test void readOnlyCredentialCannotWriteOrEnterBrowserApi() throws Exception {
        String token = issue(false);
        mvc.perform(get("/api/v1/automation/debts").header("Authorization","Bearer "+token)).andExpect(status().isOk());
        mvc.perform(post("/api/v1/automation/debts").header("Authorization","Bearer "+token)
            .header("Idempotency-Key",UUID.randomUUID()).contentType("application/json").content(json.writeValueAsString(debt())))
            .andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/debts").header("Authorization","Bearer "+token)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/automation/debts").cookie(new jakarta.servlet.http.Cookie("ceroa_session",token)))
            .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/automation/debts").header("Authorization","Bearer incorrect"))
            .andExpect(status().isUnauthorized());
    }
    @Test void assistantCanVerifyCredentialOwnerAndReadActiveStrategyWithoutWritePermission() throws Exception {
        String token = issue(false);
        mvc.perform(get("/api/v1/automation/identity").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk()).andExpect(jsonPath("$.userId").value(OWNER))
            .andExpect(jsonPath("$.allowWrites").value(false));
        mvc.perform(get("/api/v1/automation/strategies/active").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk()).andExpect(jsonPath("$.activeStrategy").value("snowball"));
        mvc.perform(get("/api/v1/automation/identity")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/automation/strategies/active")).andExpect(status().isUnauthorized());
    }
    @Test void credentialIsHashedScopedAndRevocable() throws Exception {
        String token = issue(true);
        var stored = tokens.findByTokenHash(secrets.hash(token)).orElseThrow();
        assertThat(stored.tokenHash).isNotEqualTo(token);
        mvc.perform(get("/api/v1/integrations/tokens").with(user(OWNER)))
            .andExpect(status().isOk()).andExpect(jsonPath("$[0].tokenHash").doesNotExist())
            .andExpect(jsonPath("$[0].token").doesNotExist());
        mvc.perform(delete("/api/v1/integrations/tokens/"+stored.id).with(user(OTHER)).with(csrf()))
            .andExpect(status().isNotFound());
        mvc.perform(delete("/api/v1/integrations/tokens/"+stored.id).with(user(OWNER)).with(csrf()))
            .andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/automation/debts").header("Authorization","Bearer "+token))
            .andExpect(status().isUnauthorized());
    }
    @Test void expiredCredentialAndDisabledAccountAreRejected() throws Exception {
        String token = issue(false);
        var stored = tokens.findByTokenHash(secrets.hash(token)).orElseThrow();
        stored.expiresAt = OffsetDateTime.now().minusSeconds(1); tokens.flush();
        mvc.perform(get("/api/v1/automation/debts").header("Authorization","Bearer "+token))
            .andExpect(status().isUnauthorized());
        stored.expiresAt = OffsetDateTime.now().plusDays(1); stored.user.setActive(false); tokens.flush();
        mvc.perform(get("/api/v1/automation/debts").header("Authorization","Bearer "+token))
            .andExpect(status().isUnauthorized());
    }
    @Test void browserCredentialIssuanceStillRequiresCsrfAndValidLifetime() throws Exception {
        mvc.perform(post("/api/v1/integrations/tokens").with(user(OWNER))
            .contentType("application/json").content("{\"name\":\"n8n\",\"days\":30}"))
            .andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/integrations/tokens").with(user(OWNER)).with(csrf())
            .contentType("application/json").content("{\"name\":\"n8n\",\"days\":91}"))
            .andExpect(status().isBadRequest());
    }
    @Test void paymentRetryIsAtomicAndCannotDuplicateBalanceImpact() throws Exception {
        String token = issue(true); String debtId = createDebt(token); UUID key = UUID.randomUUID();
        var payload = new HashMap<String,Object>(Map.of("debtId",debtId,"type","extra_principal", "amount",100,
            "date",java.time.LocalDate.now().toString()));
        String body = json.writeValueAsString(payload);
        var first = mvc.perform(post("/api/v1/automation/payments").header("Authorization","Bearer "+token)
            .header("Idempotency-Key",key).contentType("application/json").content(body))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        var second = mvc.perform(post("/api/v1/automation/payments").header("Authorization","Bearer "+token)
            .header("Idempotency-Key",key).contentType("application/json").content(body))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        assertThat(json.readTree(first)).isEqualTo(json.readTree(second));
        assertThat(payments.countByDebtId(UUID.fromString(debtId))).isEqualTo(1);
        mvc.perform(get("/api/v1/automation/debts/"+debtId).header("Authorization","Bearer "+token))
            .andExpect(status().isOk()).andExpect(jsonPath("$.currentBalance").value(900));
        payload.put("amount",200);
        mvc.perform(post("/api/v1/automation/payments").header("Authorization","Bearer "+token)
            .header("Idempotency-Key",key).contentType("application/json").content(json.writeValueAsString(payload)))
            .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("IDEMPOTENCY_CONFLICT"));
    }
    @Test void failedMutationDoesNotReserveKeyAndMissingHeaderIsBadRequest() throws Exception {
        String token = issue(true); UUID key = UUID.randomUUID();
        mvc.perform(post("/api/v1/automation/debts").header("Authorization","Bearer "+token)
            .contentType("application/json").content(json.writeValueAsString(debt())))
            .andExpect(status().isBadRequest());
        var payload = Map.of("debtId",UUID.randomUUID(),"type","extra_principal","amount",100,
            "date",java.time.LocalDate.now().toString());
        mvc.perform(post("/api/v1/automation/payments").header("Authorization","Bearer "+token)
            .header("Idempotency-Key",key).contentType("application/json").content(json.writeValueAsString(payload)))
            .andExpect(status().isNotFound());
        assertThat(operations.findByTokenIdAndRequestKey(tokens.findByTokenHash(secrets.hash(token)).orElseThrow().id,key)).isEmpty();
    }
    @Test void automationCannotReadAnotherUsersDebt() throws Exception {
        String token = issue(true); String debtId = createDebt(token);
        var foreign = new AutomationToken(); foreign.id=UUID.randomUUID(); foreign.user=users.findById(UUID.fromString(OTHER)).orElseThrow();
        foreign.name="other"; foreign.tokenHash=secrets.hash("other-secret"); foreign.createdAt=OffsetDateTime.now();
        foreign.expiresAt=OffsetDateTime.now().plusDays(1); tokens.saveAndFlush(foreign);
        mvc.perform(get("/api/v1/automation/debts/"+debtId).header("Authorization","Bearer other-secret"))
            .andExpect(status().isNotFound());
    }
}
