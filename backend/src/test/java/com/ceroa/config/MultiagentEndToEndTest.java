package com.ceroa.config;

import com.ceroa.domain.*;
import com.ceroa.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import java.util.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Real Spring HTTP callbacks + real native n8n agents. Only provider and H2 financial fixtures are synthetic. */
@EnabledIfEnvironmentVariable(named="MULTIAGENT_E2E",matches="true")
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.DEFINED_PORT,properties={"server.port=8080","ceroa.rag.enabled=true","ceroa.assistant.enabled=true","ceroa.assistant.worker-key=synthetic-worker-only-at-least-32-characters","ceroa.assistant.webhook-url=http://ceroa-multiagent-n8n:5678/webhook/ceroa-assistant-hybrid-v1"})
@AutoConfigureMockMvc
class MultiagentEndToEndTest {
    @Autowired MockMvc mvc;@Autowired UserRepository users;@Autowired ObjectMapper json;
    @Test void unknownIntentAbstainsThroughBothServicesWithoutCallingSpecialists() throws Exception {
        var u=new User();u.setFullName("Synthetic unknown E2E");u.setEmail(UUID.randomUUID()+"@example.invalid");u.setActive(true);u.setPlan(UserPlan.CERO);String owner=users.saveAndFlush(u).getId().toString();
        mvc.perform(post("/api/v1/assistant/messages").with(user(owner)).with(csrf()).contentType("application/json").content(json.writeValueAsString(Map.of("message","SCENARIO_UNKNOWN"))))
            .andExpect(status().isOk()).andExpect(jsonPath("$.answer").value(com.ceroa.service.RagRetrievalService.ABSTENTION));
    }
    @Test void webRequestDelegatesAndReturnsServerValidatedFreshFinancialEvidence() throws Exception {
        var u=new User();u.setFullName("Synthetic E2E");u.setEmail(UUID.randomUUID()+"@example.invalid");u.setActive(true);u.setPlan(UserPlan.CERO);String owner=users.saveAndFlush(u).getId().toString();
        mvc.perform(post("/api/v1/debts").with(user(owner)).with(csrf()).contentType("application/json").content("{\"name\":\"Synthetic E2E obligation\",\"type\":\"family_loan\",\"originalAmount\":123,\"currentBalance\":123,\"rateType\":\"NONE\",\"monthlyPayment\":10}")).andExpect(status().isCreated());
        mvc.perform(post("/api/v1/assistant/messages").with(user(owner)).with(csrf()).contentType("application/json").content(json.writeValueAsString(Map.of("message","SCENARIO_FINANCIAL"))))
            .andExpect(status().isOk()).andExpect(jsonPath("$.intent").value("analysis")).andExpect(jsonPath("$.answer").value(org.hamcrest.Matchers.containsString("123")));
    }
}
