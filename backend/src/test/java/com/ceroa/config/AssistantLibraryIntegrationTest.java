package com.ceroa.config;
import com.ceroa.api.dto.DocumentContracts.*;
import com.ceroa.domain.User;
import com.ceroa.repository.UserRepository;
import com.ceroa.service.DocumentLibraryService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import java.net.InetSocketAddress;
import java.time.*;
import java.util.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc
class AssistantLibraryIntegrationTest {
    static final String KEY="library-assistant-fixture-worker-key-32-characters";
    static final ObjectMapper JSON=new ObjectMapper();static HttpServer stub;static MockMvc callback;
    @Autowired MockMvc mvc;@Autowired UserRepository users;
    @MockitoBean DocumentLibraryService library;
    UUID actor,docId;
    @DynamicPropertySource static void properties(DynamicPropertyRegistry r)throws Exception {
        stub=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
        stub.createContext("/assistant",exchange->{
            try {
                var body=JSON.readTree(exchange.getRequestBody());String id=body.path("requestId").asText(),question=body.path("message").asText();
                String base="/api/v1/assistant-tools/requests/"+id;
                callback.perform(post(base+"/prepare").header("X-Ceroa-Assistant",KEY).contentType("application/json").content(JSON.writeValueAsString(Map.of("transcript",question)))).andExpect(status().isOk());
                for(int i=0;i<(question.startsWith("two")?2:1);i++)callback.perform(get(base+"/financial-documents").header("X-Ceroa-Assistant",KEY).param("intent",question.equals("semantic")?"SEMANTIC_SEARCH":"METADATA_SEARCH").param("question",question))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("AVAILABLE")).andExpect(jsonPath("$.evidence.facts").isMap()).andExpect(jsonPath("$.result").doesNotExist());
                callback.perform(post(base+"/complete").header("X-Ceroa-Assistant",KEY).contentType("application/json").content(JSON.writeValueAsString(Map.of("transcript",question,"answer","Encontré un extracto de 2026.","mode","personal","sources",List.of("d1")))) )
                    .andExpect(question.equals("semantic")?status().isBadRequest():question.equals("two-revoked")?status().isNotFound():status().isOk());
                exchange.sendResponseHeaders(200,0);exchange.getResponseBody().write("{}".getBytes());
            }catch(Exception e){exchange.sendResponseHeaders(500,-1);}finally{exchange.close();}
        });stub.start();r.add("ceroa.assistant.enabled",()->true);r.add("ceroa.assistant.worker-key",()->KEY);r.add("ceroa.assistant.webhook-url",()->"http://127.0.0.1:"+stub.getAddress().getPort()+"/assistant");
    }
    @BeforeEach void seed(){callback=mvc;var u=new User();u.setFullName("Synthetic library test");u.setEmail(UUID.randomUUID()+"@example.invalid");actor=users.saveAndFlush(u).getId();docId=UUID.randomUUID();
        var doc=new Document(docId,actor,"CC","BANK_STATEMENT","Banco sintético",LocalDate.of(2026,9,1),LocalDate.of(2026,10,1),null,"INDEXED",1,OffsetDateTime.now());
        when(library.get(docId)).thenReturn(doc);
        when(library.query(any())).thenAnswer(call->{org.junit.jupiter.api.Assertions.assertEquals(actor.toString(),org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName());return new Result("Resultados documentales autorizados disponibles.",null,Filters.empty(),List.of(),List.of(doc),"AVAILABLE",UUID.randomUUID(),1);});
    }
    @AfterAll static void stop(){stub.stop(0);}
    @Test void metadataListingDiscardsInvalidModelNumbersAndUsesAuthorizedDatabaseEvidence()throws Exception {
        mvc.perform(post("/api/v1/assistant/messages").with(user(actor.toString())).with(csrf()).contentType("application/json").content("{\"message\":\"metadata\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.answer").value(org.hamcrest.Matchers.startsWith("Encontré documentos que coinciden con los filtros consultados."))).andExpect(jsonPath("$.documents[0].id").value(docId.toString()));
    }
    @Test void semanticExplanationsStillRejectUnsupportedModelNumbers()throws Exception {
        mvc.perform(post("/api/v1/assistant/messages").with(user(actor.toString())).with(csrf()).contentType("application/json").content("{\"message\":\"semantic\"}"))
            .andExpect(status().isServiceUnavailable());
    }
    private UUID twoResults() {
        UUID other=UUID.randomUUID();
        var first=new Document(docId,actor,"CC","BANK_STATEMENT","Banco sintético",LocalDate.of(2026,9,1),LocalDate.of(2026,10,1),null,"INDEXED",1,OffsetDateTime.now());
        var second=new Document(other,actor,"CC","BANK_STATEMENT","Banco sintético",LocalDate.of(2026,10,1),LocalDate.of(2026,11,1),null,"INDEXED",1,OffsetDateTime.now());
        doReturn(new Result("Resultados disponibles.",null,Filters.empty(),List.of(),List.of(first),"AVAILABLE",UUID.randomUUID(),1),new Result("Resultados disponibles.",null,Filters.empty(),List.of(),List.of(second),"AVAILABLE",UUID.randomUUID(),1)).when(library).query(any());
        when(library.get(other)).thenReturn(second);return other;
    }
    @Test void twoSearchesRetainBothAuthorizedDocumentReferences()throws Exception {
        twoResults();mvc.perform(post("/api/v1/assistant/messages").with(user(actor.toString())).with(csrf()).contentType("application/json").content("{\"message\":\"two\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.documents.length()").value(2));
    }
    @Test void revocationOfEarlierSearchStillBlocksFinalDelivery()throws Exception {
        twoResults();when(library.get(docId)).thenThrow(new com.ceroa.exception.ResourceNotFoundException("Revoked"));
        mvc.perform(post("/api/v1/assistant/messages").with(user(actor.toString())).with(csrf()).contentType("application/json").content("{\"message\":\"two-revoked\"}"))
            .andExpect(status().isServiceUnavailable());
    }
}
