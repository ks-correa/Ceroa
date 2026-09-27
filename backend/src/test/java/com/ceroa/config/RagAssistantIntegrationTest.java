package com.ceroa.config;
import com.ceroa.domain.*;
import com.ceroa.repository.UserRepository;
import com.ceroa.service.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import java.net.InetSocketAddress;
import java.util.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc
class RagAssistantIntegrationTest {
    static final ObjectMapper JSON=new ObjectMapper();static final String KEY="rag-integration-worker-key-more-than-32-characters";
    static HttpServer stub;static MockMvc callback;static String context,job;static int completionStatus;
    @Autowired MockMvc mvc;@Autowired UserRepository users;@Autowired AssistantService assistant;
    @MockitoBean RagRetrievalService rag;
    String owner;
    @DynamicPropertySource static void config(DynamicPropertyRegistry registry)throws Exception{
        stub=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
        stub.createContext("/assistant",exchange->{try{
            var input=JSON.readTree(exchange.getRequestBody());job=input.path("requestId").asText();context=input.path("conversation").toString();String message=input.path("message").asText();
            String base="/api/v1/assistant-tools/requests/"+job;
            callback.perform(post(base+"/prepare").header("X-Ceroa-Assistant",KEY).contentType("application/json").content(JSON.writeValueAsString(Map.of("transcript",message)))).andExpect(status().isOk());
            if(message.equals("personal-balance")){
                var financial=callback.perform(get(base+"/data").header("X-Ceroa-Assistant",KEY).param("dataset","debts").param("year","2026").param("month","9")).andExpect(status().isOk()).andReturn();
                var facts=JSON.readTree(financial.getResponse().getContentAsString()).path("facts");String ref=null;var fields=facts.fields();while(fields.hasNext()){var fact=fields.next();if(fact.getValue().path("source").asText().endsWith("/balance")){ref=fact.getKey();break;}}
                if(ref==null)throw new IllegalStateException();
                var result=callback.perform(post(base+"/complete").header("X-Ceroa-Assistant",KEY).contentType("application/json").content(JSON.writeValueAsString(Map.of("answer","Tu saldo consultado es {{"+ref+"}}.","transcript",message,"mode","personal","sources",List.of())))).andReturn();
                completionStatus=result.getResponse().getStatus();exchange.sendResponseHeaders(completionStatus==200?200:503,2);exchange.getResponseBody().write("{}".getBytes());return;
            }
            var documents=callback.perform(get(base+"/documents").header("X-Ceroa-Assistant",KEY).param("query","Broader unrelated product query")).andExpect(status().isOk()).andReturn();
            var sources=JSON.readTree(documents.getResponse().getContentAsString()).path("sources");
            List<String> refs=new ArrayList<>();sources.fieldNames().forEachRemaining(refs::add);if(message.equals("forged"))refs=List.of("d8");
            var result=callback.perform(post(base+"/complete").header("X-Ceroa-Assistant",KEY).contentType("application/json")
                .content(JSON.writeValueAsString(Map.of("answer","Respuesta documental de prueba.","transcript",message,"mode","documentary","sources",refs)))).andReturn();
            completionStatus=result.getResponse().getStatus();exchange.sendResponseHeaders(completionStatus==200?200:503,2);exchange.getResponseBody().write("{}".getBytes());
        }catch(Exception e){exchange.sendResponseHeaders(503,-1);}finally{exchange.close();}});stub.start();
        registry.add("ceroa.assistant.enabled",()->true);registry.add("ceroa.assistant.worker-key",()->KEY);registry.add("ceroa.assistant.webhook-url",()->"http://127.0.0.1:"+stub.getAddress().getPort()+"/assistant");
    }
    @BeforeEach void setup(){callback=mvc;var u=new User();u.setFullName("RAG test");u.setEmail(UUID.randomUUID()+"@example.test");u.setActive(true);u.setPlan(UserPlan.CERO);owner=users.saveAndFlush(u).getId().toString();when(rag.enabled()).thenReturn(true);when(rag.search(anyString())).thenReturn(new RagRetrievalService.Retrieval("empty",null,List.of()));}
    @AfterAll static void stop(){stub.stop(0);}
    void approved(){var chunk=new RagVectorStore.Chunk("a".repeat(64),"docs/test.md","Fuente sintética","1","b".repeat(64),"Contenido sintético, sin finanzas personales.",0.9);when(rag.search(anyString())).thenReturn(new RagRetrievalService.Retrieval("ok","c".repeat(64),List.of(chunk)));when(rag.current(any(),anyCollection())).thenReturn(true);}
    String send(String text)throws Exception{return mvc.perform(post("/api/v1/assistant/messages").with(user(owner)).with(csrf()).contentType("application/json").content(JSON.writeValueAsString(Map.of("message",text)))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();}
    @Test void emptyCorpusOverridesInventedDocumentaryAnswerAndSearchUsesActualQuestion()throws Exception{assertTrue(send("empty").contains(RagRetrievalService.ABSTENTION));verify(rag).search("empty");verify(rag,never()).search("Broader unrelated product query");}
    @Test void addsOnlyRetrievedCurrentSourcesAndRejectsForgedOrRevokedOnes()throws Exception{
        approved();assertTrue(send("approved").contains("Fuente sintética"));
        mvc.perform(post("/api/v1/assistant/messages").with(user(owner)).with(csrf()).contentType("application/json").content("{\"message\":\"forged\"}")).andExpect(status().isServiceUnavailable());assertEquals(400,completionStatus);
        when(rag.current(any(),anyCollection())).thenReturn(false);assertTrue(send("revoked").contains(RagRetrievalService.ABSTENTION));
    }
    @Test void isolatesWebTelegramAndOtherAccountsAndCanForgetWebContext()throws Exception{
        approved();send("web-first");assertEquals("[]",context);
        send("web-followup");assertTrue(context.contains("web-first"));
        var security=org.springframework.security.core.context.SecurityContextHolder.createEmptyContext();security.setAuthentication(new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(owner,null,List.of()));org.springframework.security.core.context.SecurityContextHolder.setContext(security);
        try{assistant.message("telegram-first",null,null,AssistantService.Channel.telegram);assertEquals("[]",context);}finally{org.springframework.security.core.context.SecurityContextHolder.clearContext();}
        mvc.perform(delete("/api/v1/assistant/conversation").with(user(owner))).andExpect(status().isForbidden());
        mvc.perform(delete("/api/v1/assistant/conversation").with(user(owner)).with(csrf())).andExpect(status().isNoContent());send("web-reset");assertEquals("[]",context);
        var other=new User();other.setFullName("Other");other.setEmail(UUID.randomUUID()+"@example.test");other.setActive(true);other.setPlan(UserPlan.CERO);String otherId=users.saveAndFlush(other).getId().toString();
        mvc.perform(post("/api/v1/assistant/messages").with(user(otherId)).with(csrf()).contentType("application/json").content("{\"message\":\"other-account\"}")).andExpect(status().isOk());assertEquals("[]",context);
    }
    @Test void workerAndPublicIdsNeverAuthorizeAWebSession()throws Exception{
        mvc.perform(post("/api/v1/assistant/messages").with(csrf()).header("X-Ceroa-Assistant",KEY).contentType("application/json").content("{\"message\":\"query\"}")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/assistant-tools/requests/"+UUID.randomUUID()+"/documents").header("X-Ceroa-Assistant",KEY).param("query","x")).andExpect(status().isGone());
        mvc.perform(get("/api/v1/assistant-tools/requests/"+UUID.randomUUID()+"/documents").with(user(owner)).param("query","x")).andExpect(status().isForbidden());
    }
    @Test void personalBalanceIsReadAgainAndNeverRecoveredFromRagOrMemory()throws Exception{
        String payload="{\"name\":\"Test balance\",\"type\":\"family_loan\",\"originalAmount\":10000,\"currentBalance\":7000,\"rateType\":\"NONE\",\"monthlyPayment\":10}";
        var created=mvc.perform(post("/api/v1/debts").with(user(owner)).with(csrf()).contentType("application/json").content(payload)).andExpect(status().isCreated()).andReturn();
        String debtId=JSON.readTree(created.getResponse().getContentAsString()).path("id").asText();assertTrue(send("personal-balance").contains("7.000"));
        mvc.perform(put("/api/v1/debts/"+debtId).with(user(owner)).with(csrf()).contentType("application/json").content(payload.replace("7000","9000"))).andExpect(status().isOk());
        assertTrue(send("personal-balance").contains("9.000"));assertFalse(context.contains("7.000"));verify(rag,never()).search("personal-balance");
    }
    @Test void credentialsAndPreviousSourceReferencesAreNotKeptInContext()throws Exception{
        approved();send("mi api key es synthetic-secret-for-test");send("followup");
        assertFalse(context.contains("synthetic-secret-for-test"));assertTrue(context.contains("turno omitido"));assertFalse(context.contains("fragmento"));
        verify(rag).search("[turno omitido: credenciales no se conservan]");
    }
}
