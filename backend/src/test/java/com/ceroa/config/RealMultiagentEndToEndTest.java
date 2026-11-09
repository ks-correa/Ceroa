package com.ceroa.config;

import com.ceroa.domain.*;
import com.ceroa.repository.UserRepository;
import com.ceroa.service.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import java.util.*;
import java.nio.file.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

/** Opt-in paid provider test. Real Spring/H2, HTTP callbacks, n8n and Gemini; approved knowledge store is synthetic. */
@EnabledIfEnvironmentVariable(named="REAL_MULTIAGENT_E2E",matches="true")
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.DEFINED_PORT,properties={"server.port=8080","ceroa.rag.enabled=true","ceroa.assistant.enabled=true","ceroa.assistant.worker-key=synthetic-worker-only-at-least-32-characters","ceroa.assistant.webhook-url=http://ceroa-block5-e2e-n8n:5678/webhook/ceroa-assistant-hybrid-v1","logging.level.com.ceroa.service.AssistantService=INFO","ceroa.assistant.provider-limits.enabled=true"})
@AutoConfigureMockMvc
class RealMultiagentEndToEndTest {
 @Autowired MockMvc mvc;@Autowired UserRepository users;@Autowired ObjectMapper json;
 @MockitoBean RagRetrievalService rag;
 @MockitoBean WorkspaceCalendarGateway calendar;
 @Autowired com.ceroa.repository.SupportBookingRepository bookings;
 @Test void repeatedSyntheticConversationsThroughRealGemini()throws Exception{
  when(rag.enabled()).thenReturn(true);
  var chunk=new RagVectorStore.Chunk("a".repeat(64),"synthetic-approved-help","Ayuda Ceroa aprobada sintética","1","b".repeat(64),"Para registrar un pago abre Deudas, selecciona la obligación, elige Registrar pago, revisa importe y fecha y confirma. El asistente orienta y no registra pagos. Bola de nieve prioriza el saldo menor; avalancha prioriza la tasa normalizada mayor. Compara solo datos registrados y reconoce tasas desconocidas.",1.0);
  when(rag.search(anyString())).thenAnswer(i->i.getArgument(0,String.class).contains("teletransporte")?new RagRetrievalService.Retrieval("irrelevant","fixture-approved",List.of()):new RagRetrievalService.Retrieval("ok","fixture-approved",List.of(chunk)));
  when(rag.current(any(),any())).thenReturn(true);
  var scenarios=new LinkedHashMap<String,String>();
  scenarios.put("DETERMINISTIC","Muéstrame mis próximos vencimientos");
  scenarios.put("FINANCIAL","Interpreta el saldo de mis obligaciones registradas usando solo mis datos financieros actuales. No necesito conceptos generales ni ayuda de navegación.");
  scenarios.put("RAG","Explica el concepto de bola de nieve y avalancha usando únicamente documentación aprobada.");
  scenarios.put("SUPPORT","Explícame cómo registrar un pago en Ceroa usando únicamente documentación aprobada.");
  scenarios.put("COMPOSITE","Explica el concepto documentado de bola de nieve y contrástalo con el saldo de mis obligaciones registradas, sin simular ni hacer cálculos.");
  scenarios.put("UNKNOWN","Dime quién ganará un partido de fútbol mañana.");
  var slot=java.time.LocalDate.now(java.time.ZoneId.of("America/Bogota")).plusDays(2).atTime(10,0).atOffset(java.time.ZoneOffset.ofHours(-5));while(slot.getDayOfWeek().getValue()>5)slot=slot.plusDays(1);
  when(calendar.available(any(),any())).thenReturn(true);
  scenarios.put("SUPPORT_BOOKING","Prepara una propuesta persistente de asesoría de soporte para "+slot+". Consulta disponibilidad y devuelve la instrucción para que yo confirme; no confirmes ni crees eventos.");
  scenarios.put("SUPPORT_MISSING","Necesito soporte para mi cuenta sobre una función de teletransporte que no aparece en documentación aprobada. Si no tienes evidencia, abstente.");
  String selected=System.getenv("REAL_MULTIAGENT_SCENARIOS");if(selected!=null)scenarios.keySet().retainAll(Set.of(selected.split(",")));
  int samples=Integer.parseInt(System.getenv().getOrDefault("REAL_MULTIAGENT_SAMPLES","20"));assertTrue(samples>=1&&samples<=30);
  var records=new ArrayList<Map<String,Object>>();
  for(var scenario:scenarios.entrySet())for(int i=0;i<samples;i++){
   if(!scenario.getKey().equals("DETERMINISTIC"))Thread.sleep(Long.parseLong(System.getenv().getOrDefault("REAL_MULTIAGENT_PAUSE_MS","65000")));
   var u=new User();u.setFullName("Block 5 synthetic");u.setEmail(UUID.randomUUID()+"@example.invalid");u.setActive(true);u.setPlan(UserPlan.CERO);String owner=users.saveAndFlush(u).getId().toString();
   var debt=mvc.perform(post("/api/v1/debts").with(user(owner)).with(csrf()).contentType("application/json").content("{\"name\":\"Obligacion sintetica\",\"type\":\"family_loan\",\"originalAmount\":123,\"currentBalance\":123,\"rateType\":\"NONE\",\"monthlyPayment\":10}")).andReturn();assertEquals(201,debt.getResponse().getStatus());
   long started=System.nanoTime();var response=mvc.perform(post("/api/v1/assistant/messages").with(user(owner)).with(csrf()).contentType("application/json").content(json.writeValueAsString(Map.of("message",scenario.getValue())))).andReturn().getResponse();
   var body=json.readTree(response.getContentAsString(java.nio.charset.StandardCharsets.UTF_8));
   boolean expectedAbstention=Set.of("UNKNOWN","SUPPORT_MISSING").contains(scenario.getKey());
   boolean proposal=!scenario.getKey().equals("SUPPORT_BOOKING")||bookings.findAll().stream().anyMatch(b->b.ownerId.toString().equals(owner)&&b.status.equals("PROPOSED")&&b.providerId==null);
   var record=new LinkedHashMap<String,Object>();record.put("scenario",scenario.getKey());record.put("sample",i);record.put("totalMs",(System.nanoTime()-started)/1_000_000);record.put("httpStatus",response.getStatus());record.put("functionalStatus",body.path("functionalStatus").asText());record.put("functionallyCorrect",response.getStatus()==200&&proposal&&(expectedAbstention?body.path("answer").asText().startsWith(RagRetrievalService.ABSTENTION):body.path("functionalStatus").asText().equals("COMPLETE")));record.put("intent",body.path("intent").asText());record.put("hasAnswer",!body.path("answer").asText().isBlank());record.put("abstained",body.path("answer").asText().startsWith(RagRetrievalService.ABSTENTION));records.add(record);
   Files.writeString(Path.of(System.getenv().getOrDefault("REAL_MULTIAGENT_RESULT","/results/spring-samples.json")),json.writerWithDefaultPrettyPrinter().writeValueAsString(records));
  }
  assertTrue(records.stream().allMatch(r->r.get("httpStatus").equals(200)&&Boolean.TRUE.equals(r.get("functionallyCorrect"))),"Some real conversations failed; inspect private samples and telemetry");
  verify(calendar,never()).call(eq("create"),any(),any(),any(),any());
 }
}
