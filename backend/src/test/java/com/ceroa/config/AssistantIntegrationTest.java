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
    static String lastEvidence;
    static String lastConversation;
    static String lastInputs;
    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    String owner;
    @DynamicPropertySource static void properties(DynamicPropertyRegistry registry) throws Exception {
        stub=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
        stub.createContext("/assistant", exchange->{
            try {
                var body=JSON.readTree(exchange.getRequestBody()); lastJob=body.path("requestId").asText();
                String message=body.path("message").asText();
                lastConversation=body.path("conversation").toString();
                if(message.startsWith("analysis")) {
                    String base="/api/v1/assistant-tools/requests/"+lastJob;
                    var preparation=callback.perform(post(base+"/prepare").header("X-Ceroa-Assistant",KEY)
                        .contentType("application/json").content(JSON.writeValueAsString(Map.of("transcript",message))))
                        .andExpect(status().isOk()).andReturn();
                    lastInputs=preparation.getResponse().getContentAsString();
                    callback.perform(post(base+"/prepare").header("X-Ceroa-Assistant",KEY)
                        .contentType("application/json").content("{\"transcript\":\"different question\"}"))
                        .andExpect(status().isBadRequest());
                    var read=callback.perform(get(base+"/data").header("X-Ceroa-Assistant",KEY)
                        .param("dataset","debts").param("year","2026").param("month","9"))
                        .andExpect(status().isOk()).andReturn();
                    lastEvidence=read.getResponse().getContentAsString();
                    var facts=JSON.readTree(lastEvidence).path("facts");
                    String name=null,balance=null;
                    for(var entry : (Iterable<Map.Entry<String,com.fasterxml.jackson.databind.JsonNode>>) facts::fields) {
                        if(entry.getValue().path("source").asText().endsWith("/items/0/name")) name=entry.getKey();
                        if(entry.getValue().path("source").asText().endsWith("/items/0/balance")) balance=entry.getKey();
                    }
                    String answer="No hay deudas para analizar.";
                    if(balance!=null) {
                        var calc=callback.perform(get(base+"/calculate").header("X-Ceroa-Assistant",KEY)
                            .param("operation","add").param("refs",balance+","+balance))
                            .andExpect(status().isOk()).andReturn();
                        String calculated=JSON.readTree(calc.getResponse().getContentAsString()).path("facts").fieldNames().next();
                        answer="Tu deuda {{"+name+"}} tiene saldo {{"+balance+"}}; el doble calculado es {{"+calculated+"}}.";
                    }
                    if(message.equals("analysis-invalid")) answer="Tu saldo es 999999.";
                    if(message.equals("analysis-forged-ref")) answer="Tu saldo es {{f999999}}.";
                    var complete=callback.perform(post(base+"/complete").header("X-Ceroa-Assistant",KEY).contentType("application/json")
                        .content(JSON.writeValueAsString(Map.of("answer",answer,"transcript",message))));
                    complete.andExpect(message.equals("analysis-invalid") || message.equals("analysis-forged-ref") ? status().isBadRequest() : status().isOk());
                    if(message.equals("analysis")) callback.perform(get(base+"/data").header("X-Ceroa-Assistant",KEY)
                        .param("dataset","debts").param("year","2026").param("month","9"))
                        .andExpect(status().isGone());
                    exchange.sendResponseHeaders(200,0); exchange.getResponseBody().write("{}".getBytes()); return;
                }
                if(!message.equals("forged")) callback.perform(get("/api/v1/assistant-tools/requests/"+lastJob+"/query")
                    .header("X-Ceroa-Assistant",KEY).param("intent",message.equals("interest")?"highest_interest":message.equals("write")?"write_request":message.equals("unknown")?"unknown":"debts"))
                    .andExpect(status().isOk());
                exchange.sendResponseHeaders(200,0); exchange.getResponseBody().write("{\"answer\":\"invented 999999\"}".getBytes());
            } catch(Exception error) { exchange.sendResponseHeaders(500,-1); }
            finally { exchange.close(); }
        }); stub.start();
        registry.add("ceroa.assistant.enabled",()->true);
        registry.add("ceroa.telegram.bot-username",()->"Ceroa_bot");
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
    @Test void telegramAnalysisUsesLinkedAccountAndDeliveryIsRevokedAfterUnlink() throws Exception {
        debt(owner,"Telegram owner debt",321);
        var invitation=mvc.perform(post("/api/v1/integrations/telegram").with(user(owner)).with(csrf()).contentType("application/json").content("{\"consent\":true}"))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String code=JSON.readTree(invitation).path("url").asText().split("start=")[1];
        long sender=Math.abs(UUID.randomUUID().getMostSignificantBits())%100000000+1000;
        String base="/api/v1/assistant-tools/telegram/";
        mvc.perform(post(base+"updates").header("X-Ceroa-Assistant",KEY).contentType("application/json")
            .content(JSON.writeValueAsString(Map.of("updateId",System.nanoTime(),"senderId",sender,"chatId",sender,"privateChat",true,"text","/start "+code))))
            .andExpect(status().isOk());
        mvc.perform(post(base+"updates").header("X-Ceroa-Assistant",KEY).contentType("application/json")
            .content(JSON.writeValueAsString(Map.of("updateId",System.nanoTime(),"senderId",sender,"chatId",sender,"privateChat",true,"text","¿Qué deudas tengo?"))))
            .andExpect(status().isOk()).andExpect(jsonPath("$.answer").value(org.hamcrest.Matchers.containsString("Telegram owner debt")));
        var response=mvc.perform(post(base+"updates").header("X-Ceroa-Assistant",KEY).contentType("application/json")
            .content(JSON.writeValueAsString(Map.of("updateId",System.nanoTime(),"senderId",sender,"chatId",sender,"privateChat",true,"text","analysis","userId",UUID.randomUUID()))))
            .andExpect(status().isOk()).andExpect(jsonPath("$.answer").value(org.hamcrest.Matchers.containsString("Telegram owner debt")))
            .andReturn().getResponse().getContentAsString();
        String token=JSON.readTree(response).path("deliveryToken").asText();
        org.junit.jupiter.api.Assertions.assertEquals(43,token.length());
        mvc.perform(delete("/api/v1/integrations/telegram").with(user(owner)).with(csrf())).andExpect(status().isOk());
        mvc.perform(post(base+"delivery").header("X-Ceroa-Assistant",KEY).contentType("application/json").content(JSON.writeValueAsString(Map.of("token",token))))
            .andExpect(status().isOk()).andExpect(jsonPath("$.send").value(false));
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
    @Test void analysisUsesOnlySessionEvidenceAndBackendArithmetic() throws Exception {
        debt(owner,"My private debt",123);
        String other=UUID.randomUUID().toString(); var u=new User();u.setId(UUID.fromString(other));u.setFullName("Other");u.setEmail(other+"@example.com");u.setActive(true);u.setPlan(UserPlan.CERO);users.saveAndFlush(u);
        debt(other,"Someone elses debt",9000);
        mvc.perform(post("/api/v1/assistant/messages").with(user(owner)).with(csrf()).contentType("application/json").content("{\"message\":\"analysis\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.intent").value("analysis"))
            .andExpect(jsonPath("$.answer").value(org.hamcrest.Matchers.containsString("My private debt")))
            .andExpect(jsonPath("$.answer").value(org.hamcrest.Matchers.containsString("246")));
        Assertions.assertFalse(lastEvidence.contains("Someone elses debt"));
        Assertions.assertFalse(lastEvidence.contains(owner));
        Assertions.assertFalse(lastEvidence.contains("accountNumber"));
        mvc.perform(post("/api/v1/assistant/messages").with(user(owner)).with(csrf()).contentType("application/json").content("{\"message\":\"analysis\"}"))
            .andExpect(status().isOk());
        Assertions.assertTrue(lastConversation.contains("My private debt"));
        mvc.perform(post("/api/v1/assistant/messages").with(user(other)).with(csrf()).contentType("application/json").content("{\"message\":\"analysis\"}"))
            .andExpect(status().isOk());
        Assertions.assertFalse(lastConversation.contains("My private debt"));
    }
    @Test void analysisRejectsInventedAmountsAndFabricatedEvidence() throws Exception {
        debt(owner,"Test debt",123);
        for(String message:List.of("analysis-invalid","analysis-forged-ref")) {
            mvc.perform(post("/api/v1/assistant/messages").with(user(owner)).with(csrf()).contentType("application/json")
                .content(JSON.writeValueAsString(Map.of("message",message))))
                .andExpect(status().isServiceUnavailable());
        }
    }
    @Test void hypotheticalAmountsRemainClearlyMarkedUserInputs() throws Exception {
        mvc.perform(post("/api/v1/assistant/messages").with(user(owner)).with(csrf()).contentType("application/json")
            .content("{\"message\":\"analysis con abono de 500.000, tasa 2,5 y cambio de -100.000\"}"))
            .andExpect(status().isOk());
        Assertions.assertTrue(lastInputs.contains("500000"));
        Assertions.assertTrue(lastInputs.contains("2.5"));
        Assertions.assertTrue(lastInputs.contains("-100000"));
        Assertions.assertTrue(lastInputs.contains("isUserAssumption"));
        Assertions.assertFalse(lastInputs.contains("userId"));
    }
    @Test void completionCredentialIsNotAWebSessionAndCannotWriteFinances() throws Exception {
        mvc.perform(post("/api/v1/assistant-tools/requests/"+UUID.randomUUID()+"/complete")
            .contentType("application/json").content("{\"answer\":\"test\",\"transcript\":\"test\"}"))
            .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/debts").header("X-Ceroa-Assistant",KEY).with(csrf()).contentType("application/json").content("{}"))
            .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/assistant-tools/requests/"+UUID.randomUUID()+"/data").header("X-Ceroa-Assistant",KEY)
            .param("dataset","sql").param("year","2026").param("month","9"))
            .andExpect(status().isBadRequest());
    }
    @Test void highestInterestComparesEquivalentRatesInsteadOfBalances() throws Exception {
        for (String body : List.of(
            "{\"name\":\"Monthly card\",\"type\":\"family_loan\",\"originalAmount\":100,\"currentBalance\":100,\"rateType\":\"MV\",\"interestRate\":2,\"monthlyPayment\":10}",
            "{\"name\":\"Large annual loan\",\"type\":\"family_loan\",\"originalAmount\":9000,\"currentBalance\":9000,\"rateType\":\"EA\",\"interestRate\":24,\"monthlyPayment\":100}")) {
            mvc.perform(post("/api/v1/debts").with(user(owner)).with(csrf()).contentType("application/json").content(body))
                .andExpect(status().isCreated());
        }
        mvc.perform(post("/api/v1/assistant/messages").with(user(owner)).with(csrf()).contentType("application/json").content("{\"message\":\"interest\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.intent").value("highest_interest"))
            .andExpect(jsonPath("$.answer").value(org.hamcrest.Matchers.containsString("Monthly card")))
            .andExpect(jsonPath("$.answer").value(org.hamcrest.Matchers.containsString("26.8242")))
            .andExpect(jsonPath("$.answer").value(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("Large annual loan"))));
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
