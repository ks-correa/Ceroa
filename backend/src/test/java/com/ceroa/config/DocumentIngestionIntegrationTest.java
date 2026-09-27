package com.ceroa.config;
import com.ceroa.domain.*;
import com.ceroa.repository.*;
import com.ceroa.service.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.mock.web.MockMultipartFile;
import java.net.InetSocketAddress;
import java.util.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.junit.jupiter.api.Assertions.*;
@SpringBootTest @AutoConfigureMockMvc
class DocumentIngestionIntegrationTest {
    static final String KEY="documents-test-key-at-least-32-characters";
    static final ObjectMapper JSON=new ObjectMapper();static HttpServer stub;static MockMvc callback;static String lastJob;static String lastBody;
    @Autowired MockMvc mvc;@Autowired UserRepository users;@Autowired DebtRepository debts;String owner;
    @DynamicPropertySource static void properties(DynamicPropertyRegistry registry)throws Exception {
        stub=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);stub.createContext("/documents",exchange->{try{
            var body=JSON.readTree(exchange.getRequestBody());lastBody=body.toString();lastJob=body.path("requestId").asText();
            var output=DocumentDraftValidatorTest.empty(JSON);((com.fasterxml.jackson.databind.node.ObjectNode)output.get("draft")).put("currentBalance",2500000);
            output.withArray("evidence").addObject().put("field","currentBalance").put("quote","Saldo actual 2500000").put("location",body.path("segments").get(0).path("location").asText());
            callback.perform(post("/api/v1/document-tools/requests/"+lastJob+"/complete").header("X-Ceroa-Documents",KEY).contentType("application/json").content(output.toString())).andExpect(status().isOk());
            exchange.sendResponseHeaders(200,0);exchange.getResponseBody().write("{}".getBytes());
        }catch(Exception e){exchange.sendResponseHeaders(500,-1);}finally{exchange.close();}});stub.start();
        registry.add("ceroa.documents.enabled",()->true);registry.add("ceroa.documents.worker-key",()->KEY);registry.add("ceroa.documents.webhook-url",()->"http://127.0.0.1:"+stub.getAddress().getPort()+"/documents");
    }
    @BeforeEach void setup(){callback=mvc;var u=new User();u.setEmail(UUID.randomUUID()+"@example.com");u.setFullName("Document test");u.setActive(true);u.setPlan(UserPlan.CERO);owner=users.saveAndFlush(u).getId().toString();}
    @AfterAll static void stop(){stub.stop(0);}
    MockMultipartFile file()throws Exception{return new MockMultipartFile("file","test.docx","application/vnd.openxmlformats-officedocument.wordprocessingml.document",DocumentTextExtractorTest.word("Saldo actual 2500000"));}
    @Test void extractsPartialDraftWithoutAnyFinancialWriteAndConsumesCallback()throws Exception {
        long count=debts.count();mvc.perform(multipart("/api/v1/documents/debt-draft").file(file()).with(user(owner)).with(csrf()).param("operation","create").param("consent","true"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.draft.currentBalance").value(2500000)).andExpect(jsonPath("$.draft.interestRate").isEmpty()).andExpect(jsonPath("$.draft.rateType").isEmpty());
        assertEquals(count,debts.count());assertFalse(lastBody.contains(owner));assertFalse(lastBody.contains("DebtRequest"));
        mvc.perform(post("/api/v1/document-tools/requests/"+lastJob+"/complete").header("X-Ceroa-Documents",KEY).contentType("application/json").content("{}"))
            .andExpect(status().isGone());
    }
    @Test void requiresSessionCsrfConsentAndDoesNotTrustWorkerForUpload()throws Exception {
        mvc.perform(multipart("/api/v1/documents/debt-draft").file(file()).with(csrf()).header("X-Ceroa-Documents",KEY).param("operation","create").param("consent","true")).andExpect(status().isUnauthorized());
        mvc.perform(multipart("/api/v1/documents/debt-draft").file(file()).with(user(owner)).param("operation","create").param("consent","true")).andExpect(status().isForbidden());
        mvc.perform(multipart("/api/v1/documents/debt-draft").file(file()).with(user(owner)).with(csrf()).param("operation","create").param("consent","false")).andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/document-tools/requests/"+UUID.randomUUID()+"/complete").with(user(owner)).with(csrf()).contentType("application/json").content("{}"))
            .andExpect(status().isForbidden());
    }
    @Test void foreignDebtIsRejectedBeforeExtractionAndInactiveOwnerCannotUpload()throws Exception {
        String prior=lastBody;
        mvc.perform(multipart("/api/v1/documents/debt-draft").file(file()).with(user(owner)).with(csrf()).param("operation","update").param("debtId",UUID.randomUUID().toString()).param("consent","true"))
            .andExpect(status().isNotFound());assertEquals(prior,lastBody);
        var u=users.findById(UUID.fromString(owner)).orElseThrow();u.setActive(false);users.saveAndFlush(u);
        mvc.perform(multipart("/api/v1/documents/debt-draft").file(file()).with(user(owner)).with(csrf()).param("operation","create").param("consent","true")).andExpect(status().isForbidden());
    }
}
