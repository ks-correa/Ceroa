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
    static final String MONTH_QUESTION="Teniendo en cuenta los extractos de septiembre de 2026 quiero revisar qu? pagos realic?, movimientos relevantes y tasas";
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
                if(question.equals("compare-periods")){
                    var paymentRefs=new ArrayList<String>();
                    for(int month:new int[]{8,9}){
                        var response=callback.perform(get(base+"/financial-documents").header("X-Ceroa-Assistant",KEY)
                            .param("intent","PERIOD_ANALYSIS").param("question","pagos y tasas").param("documentType","BANK_STATEMENT")
                            .param("periodFrom",LocalDate.of(2026,month,1).toString()).param("periodToExclusive",LocalDate.of(2026,month+1,1).toString()))
                            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
                        JSON.readTree(response).path("evidence").path("facts").fields().forEachRemaining(entry->{
                            if(entry.getValue().path("source").asText().endsWith("/documentValues/0/numericValue"))paymentRefs.add(entry.getKey());
                        });
                    }
                    var delta=callback.perform(get(base+"/calculate").header("X-Ceroa-Assistant",KEY).param("operation","subtract")
                        .param("refs",paymentRefs.get(1)+","+paymentRefs.get(0))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
                    String result=JSON.readTree(delta).path("facts").fieldNames().next();
                    callback.perform(post(base+"/complete").header("X-Ceroa-Assistant",KEY).contentType("application/json")
                        .content(JSON.writeValueAsString(Map.of("transcript",question,"answer","En agosto pagaste {{"+paymentRefs.get(0)+"}} y en septiembre {{"+paymentRefs.get(1)+"}}. La diferencia es {{"+result+"}}.","mode","personal","sources",List.of()))))
                        .andExpect(status().isOk());
                    exchange.sendResponseHeaders(200,0);exchange.getResponseBody().write("{}".getBytes());return;
                }
                var response=callback.perform(get(base+"/financial-documents").header("X-Ceroa-Assistant",KEY)
                    .param("intent",question.equals("semantic")?"SEMANTIC_SEARCH":question.equals(MONTH_QUESTION)?"PERIOD_ANALYSIS":"METADATA_SEARCH")
                    .param("question",question).param("documentType",question.equals("metadata-filter")||question.equals(MONTH_QUESTION)?"BANK_STATEMENT":"")
                    .param("periodFrom",question.equals("metadata-filter")||question.equals(MONTH_QUESTION)?"2026-09-01":"")
                    .param("periodToExclusive",question.equals("metadata-filter")||question.equals(MONTH_QUESTION)?"2026-10-01":""))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("AVAILABLE")).andExpect(jsonPath("$.evidence.facts").isMap()).andReturn().getResponse().getContentAsString();
                if(question.startsWith("two"))callback.perform(get(base+"/financial-documents").header("X-Ceroa-Assistant",KEY).param("intent","METADATA_SEARCH").param("question",question)).andExpect(status().isOk());
                String answer=question.equals("que tasa tengo?")?"La tasa indicada es 2,5%.":"Encontré un extracto de 2026.";
                if(question.equals(MONTH_QUESTION)){
                    var facts=JSON.readTree(response).path("evidence").path("facts");var refs=new ArrayList<String>();
                    facts.fields().forEachRemaining(entry->{if(entry.getValue().path("source").asText().endsWith("/numericValue"))refs.add(entry.getKey());});
                    org.junit.jupiter.api.Assertions.assertEquals(2,refs.size());
                    var calculated=callback.perform(get(base+"/calculate").header("X-Ceroa-Assistant",KEY).param("operation","add").param("refs",String.join(",",refs)))
                        .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
                    callback.perform(get(base+"/financial-documents").header("X-Ceroa-Assistant",KEY).param("intent","METADATA_SEARCH").param("question","recibos relacionados"))
                        .andExpect(status().isOk());
                    String total=JSON.readTree(calculated).path("facts").fieldNames().next();answer="Pagos confirmados: {{"+total+"}}.";
                }
                callback.perform(post(base+"/complete").header("X-Ceroa-Assistant",KEY).contentType("application/json").content(JSON.writeValueAsString(Map.of("transcript",question,"answer",answer,"mode","personal","sources",List.of("d1")))) )
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
    @Test void selectedFileRateQuestionUsesOnlyThatFileAndAcceptsItsExactEvidence()throws Exception {
        var source=new Source(docId,UUID.randomUUID(),1,"page 1","Tasa indicada: 2,5%",0.9,1);
        doAnswer(call->{
            Query query=call.getArgument(0);
            org.junit.jupiter.api.Assertions.assertEquals(docId,query.filters().documentId());
            org.junit.jupiter.api.Assertions.assertEquals(Intent.HYBRID_SEARCH,query.intent());
            return new Result("Resultados disponibles.",null,query.filters(),List.of(source),List.of(library.get(docId)),"AVAILABLE",UUID.randomUUID(),1);
        }).when(library).query(any());
        mvc.perform(post("/api/v1/assistant/messages").with(user(actor.toString())).with(csrf()).contentType("application/json")
            .content(JSON.writeValueAsString(Map.of("message","que tasa tengo?","documentId",docId.toString()))))
            .andExpect(status().isOk()).andExpect(jsonPath("$.answer").value(org.hamcrest.Matchers.containsString("2,5%")));
    }
    @Test void selectedFileWithoutMatchingChunksReturnsVerifiedMetadataInsteadOfAnError()throws Exception {
        mvc.perform(post("/api/v1/assistant/messages").with(user(actor.toString())).with(csrf()).contentType("application/json")
            .content(JSON.writeValueAsString(Map.of("message","fecha documento","documentId",docId.toString()))))
            .andExpect(status().isOk()).andExpect(jsonPath("$.answer").value(org.hamcrest.Matchers.containsString("extracto bancario")))
            .andExpect(jsonPath("$.answer").value(org.hamcrest.Matchers.containsString("2026-09-01")));
    }
    @Test void metadataFiltersReachPrivateLibraryAndReturnMatchingReference()throws Exception {
        doAnswer(call->{
            Query query=call.getArgument(0);
            org.junit.jupiter.api.Assertions.assertEquals(Intent.METADATA_SEARCH,query.intent());
            org.junit.jupiter.api.Assertions.assertEquals(Kind.BANK_STATEMENT,query.filters().documentType());
            org.junit.jupiter.api.Assertions.assertEquals(LocalDate.of(2026,9,1),query.filters().periodFrom());
            org.junit.jupiter.api.Assertions.assertEquals(LocalDate.of(2026,10,1),query.filters().periodToExclusive());
            return new Result("Resultados disponibles.",null,query.filters(),List.of(),List.of(library.get(docId)),"AVAILABLE",UUID.randomUUID(),1);
        }).when(library).query(any());
        mvc.perform(post("/api/v1/assistant/messages").with(user(actor.toString())).with(csrf()).contentType("application/json")
            .content("{\"message\":\"metadata-filter\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.documents[0].id").value(docId.toString()));
    }
    @Test void periodAnalysisCombinesTwoAuthorizedStatementsWithBackendArithmetic()throws Exception {
        UUID second=UUID.randomUUID();
        var other=new Document(second,actor,"CC","BANK_STATEMENT","Otro banco",LocalDate.of(2026,9,1),LocalDate.of(2026,10,1),null,"INDEXED",1,OffsetDateTime.now());
        when(library.get(second)).thenReturn(other);
        doAnswer(call->{
            Query query=call.getArgument(0);
            if(query.intent()==Intent.METADATA_SEARCH)
                return new Result("Recibos consultados",null,query.filters(),List.of(),List.of(other),"AVAILABLE",UUID.randomUUID(),1);
            org.junit.jupiter.api.Assertions.assertEquals(Intent.PERIOD_ANALYSIS,query.intent());
            org.junit.jupiter.api.Assertions.assertEquals(Kind.BANK_STATEMENT,query.filters().documentType());
            org.junit.jupiter.api.Assertions.assertEquals(LocalDate.of(2026,9,1),query.filters().periodFrom());
            var sources=List.of(new Source(docId,UUID.randomUUID(),1,"page 1","Pago $100.000",0,1),
                new Source(second,UUID.randomUUID(),1,"page 1","Pago 50000",0,1));
            return new Result("Cobertura completa",Map.of("complete",true,"hasMoreDocuments",false),query.filters(),sources,List.of(library.get(docId),other),"AVAILABLE",UUID.randomUUID(),1);
        }).when(library).query(any());
        mvc.perform(post("/api/v1/assistant/messages").with(user(actor.toString())).with(csrf()).contentType("application/json")
            .content(JSON.writeValueAsString(Map.of("message",MONTH_QUESTION))))
            .andExpect(status().isOk()).andExpect(jsonPath("$.answer").value(org.hamcrest.Matchers.containsString("150.000")))
            .andExpect(jsonPath("$.documents.length()").value(2));
    }
    @Test void comparesPaymentsFromDifferentMonthsAndKeepsBothDocumentReferences()throws Exception {
        UUID augustId=UUID.randomUUID();
        var august=new Document(augustId,actor,"CC","BANK_STATEMENT","Banco sintético",LocalDate.of(2026,8,1),LocalDate.of(2026,9,1),null,"INDEXED",1,OffsetDateTime.now());
        when(library.get(augustId)).thenReturn(august);
        doAnswer(call->{
            Query query=call.getArgument(0);org.junit.jupiter.api.Assertions.assertEquals(Intent.PERIOD_ANALYSIS,query.intent());
            boolean first=query.filters().periodFrom().getMonthValue()==8;
            var document=first?august:library.get(docId);
            var source=new Source(document.id(),UUID.randomUUID(),1,"page 1",first?"Pago $100.000\nTasa 2%":"Pago $150.000\nTasa 2,5%",0,1);
            return new Result("Cobertura completa",Map.of("complete",true,"hasMoreDocuments",false,"documentsWithoutContent",0),query.filters(),List.of(source),List.of(document),"AVAILABLE",UUID.randomUUID(),1);
        }).when(library).query(any());
        mvc.perform(post("/api/v1/assistant/messages").with(user(actor.toString())).with(csrf()).contentType("application/json").content("{\"message\":\"compare-periods\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.answer").value(org.hamcrest.Matchers.containsString("La diferencia es 50.000")))
            .andExpect(jsonPath("$.answer").value(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("comparación es parcial"))))
            .andExpect(jsonPath("$.documents.length()").value(2));
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
