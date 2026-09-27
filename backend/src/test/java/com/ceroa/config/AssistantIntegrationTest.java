package com.ceroa.config;
import com.ceroa.domain.*;
import com.ceroa.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import java.net.InetSocketAddress;
import java.util.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc
class AssistantIntegrationTest {
    static final String KEY="test-assistant-worker-secret-at-least-32-characters";
    static final ObjectMapper JSON=new ObjectMapper();
    static HttpServer stub;
    static MockMvc callback;
    static String lastJob;
    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    String owner;
    @DynamicPropertySource static void properties(DynamicPropertyRegistry registry) throws Exception {
        stub=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
        stub.createContext("/assistant", exchange->{
            try {
                var body=JSON.readTree(exchange.getRequestBody()); lastJob=body.path("requestId").asText();
                String message=body.path("message").asText();
                if(!message.equals("forged")) callback.perform(get("/api/v1/assistant-tools/requests/"+lastJob+"/query")
                    .header("X-Ceroa-Assistant",KEY).param("intent",message.equals("write")?"write_request":message.equals("unknown")?"unknown":"debts"))
                    .andExpect(status().isOk());
                exchange.sendResponseHeaders(200,0); exchange.getResponseBody().write("{\"answer\":\"invented 999999\"}".getBytes());
            } catch(Exception error) { exchange.sendResponseHeaders(500,-1); }
            finally { exchange.close(); }
        }); stub.start();
        registry.add("ceroa.assistant.enabled",()->true);
        registry.add("ceroa.assistant.worker-key",()->KEY);
        registry.add("ceroa.assistant.webhook-url",()->"http://127.0.0.1:"+stub.getAddress().getPort()+"/assistant");
    }
    @BeforeEach void seed() {
        callback=mvc; owner=UUID.randomUUID().toString();
        var u=new User();u.setId(UUID.fromString(owner));u.setFullName("Assistant test");u.setEmail(owner+"@example.com");u.setPlan(UserPlan.CERO);u.setActive(true);users.saveAndFlush(u);
    }
    @AfterAll static void stop() { stub.stop(0); }
    void debt(String user,String name,int balance) throws Exception {
        mvc.perform(post("/api/v1/debts").with(user(user)).with(csrf()).contentType("application/json")
            .content("{\"name\":\""+name+"\",\"type\":\"family_loan\",\"originalAmount\":"+balance+",\"currentBalance\":"+balance+",\"rateType\":\"NONE\",\"monthlyPayment\":10}"))
            .andExpect(status().isCreated());
    }
    @Test void toolCredentialCannotBypassWebSessionOrCsrf() throws Exception {
        mvc.perform(post("/api/v1/assistant/messages").with(csrf()).header("X-Ceroa-Assistant",KEY).contentType("application/json").content("{\"message\":\"debts\"}"))
            .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/assistant/messages").with(user(owner)).contentType("application/json").content("{\"message\":\"debts\"}"))
            .andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/assistant-tools/requests/"+UUID.randomUUID()+"/query").cookie(new jakarta.servlet.http.Cookie("ceroa_session","browser-cookie")).param("intent","debts"))
            .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/assistant-tools/requests/"+UUID.randomUUID()+"/query").header("X-Ceroa-Assistant",KEY))
            .andExpect(status().isForbidden());
    }
    @Test void requestIsBoundToItsSessionOwnerAndExpiresAfterCompletion() throws Exception {
        debt(owner,"Own obligation",100);
        String other=UUID.randomUUID().toString(); var u=new User();u.setId(UUID.fromString(other));u.setFullName("Other");u.setEmail(other+"@example.com");u.setActive(true);u.setPlan(UserPlan.CERO);users.saveAndFlush(u);
        debt(other,"Other obligation",200);
        mvc.perform(post("/api/v1/assistant/messages").with(user(owner)).with(csrf()).contentType("application/json")
            .content("{\"message\":\"debts\",\"userId\":\""+other+"\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.answer").value(org.hamcrest.Matchers.containsString("Own obligation")))
            .andExpect(jsonPath("$.answer").value(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("Other obligation"))))
            .andExpect(jsonPath("$.answer").value(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("999999"))));
        mvc.perform(get("/api/v1/assistant-tools/requests/"+lastJob+"/query").header("X-Ceroa-Assistant",KEY).param("intent","debts"))
            .andExpect(status().isGone());
    }
    @Test void unverifiedModelReplyIsNeverReturnedAsFinancialTruth() throws Exception {
        mvc.perform(post("/api/v1/assistant/messages").with(user(owner)).with(csrf()).contentType("application/json").content("{\"message\":\"forged\"}"))
            .andExpect(status().isServiceUnavailable());
    }
    @Test void writesAndUnknownIntentsNeverExecuteMutations() throws Exception {
        mvc.perform(post("/api/v1/assistant/messages").with(user(owner)).with(csrf()).contentType("application/json").content("{\"message\":\"write\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.intent").value("write_request"));
        mvc.perform(post("/api/v1/assistant/messages").with(user(owner)).with(csrf()).contentType("application/json").content("{\"message\":\"unknown\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.intent").value("unknown"));
        mvc.perform(get("/api/v1/debts").with(user(owner))).andExpect(jsonPath("$").isEmpty());
    }
    @Test void invalidAudioIsRejectedBeforeCallingWorkflow() throws Exception {
        mvc.perform(post("/api/v1/assistant/messages").with(user(owner)).with(csrf()).contentType("application/json").content("{\"audio\":\"invalid\",\"mime\":\"audio/wav\"}"))
            .andExpect(status().isBadRequest());
    }
    @Test void disabledAccountAndArbitraryToolsAreRejected() throws Exception {
        var account=users.findById(UUID.fromString(owner)).orElseThrow();account.setActive(false);users.saveAndFlush(account);
        mvc.perform(post("/api/v1/assistant/messages").with(user(owner)).with(csrf()).contentType("application/json").content("{\"message\":\"debts\"}"))
            .andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/assistant-tools/requests/"+UUID.randomUUID()+"/query").header("X-Ceroa-Assistant",KEY).param("intent","delete_all_debts"))
            .andExpect(status().isBadRequest());
    }
    @Test void requestsAreLimitedPerAccount() throws Exception {
        for(int i=0;i<5;i++) mvc.perform(post("/api/v1/assistant/messages").with(user(owner)).with(csrf()).contentType("application/json").content("{\"message\":\"unknown\"}"))
            .andExpect(status().isOk());
        mvc.perform(post("/api/v1/assistant/messages").with(user(owner)).with(csrf()).contentType("application/json").content("{\"message\":\"unknown\"}"))
            .andExpect(status().isTooManyRequests());
    }
}
