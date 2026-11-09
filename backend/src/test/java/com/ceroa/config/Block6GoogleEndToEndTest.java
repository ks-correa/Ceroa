package com.ceroa.config;

import com.ceroa.domain.*;
import com.ceroa.repository.*;
import com.ceroa.service.IntegrationEventService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;
import java.net.*;
import java.net.http.*;
import java.nio.file.*;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

/** Explicit one-message authorization required. Real PostgreSQL, native n8n, Gmail self and approved Sheets tab. */
@EnabledIfEnvironmentVariable(named="BLOCK6_GOOGLE_REAL",matches="true")
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.DEFINED_PORT,properties={
 "spring.config.location=file:src/main/resources/application.yml","CEROA_ENV_FILE=optional:file:./target/no-env.properties",
 "server.port=8080","spring.datasource.url=jdbc:postgresql://ceroa-block6-pg:5432/workspace_fixture","spring.datasource.username=fixture","spring.datasource.password=synthetic-block6-only","spring.datasource.driver-class-name=org.postgresql.Driver",
 "spring.jpa.properties.hibernate.default_schema=workspace_verification","spring.datasource.hikari.data-source-properties.currentSchema=workspace_verification","spring.flyway.default-schema=workspace_verification","spring.flyway.schemas=workspace_verification",
 "ceroa.workspace.worker-key=synthetic-block6-google-worker-at-least-32-characters","ceroa.workspace.gmail-enabled=true","ceroa.workspace.sheets-enabled=true","ceroa.workspace.calendar-enabled=false","ceroa.recovery.delivery-enabled=false"
})
class Block6GoogleEndToEndTest {
 @Autowired IntegrationEventService service;@Autowired IntegrationEventRepository events;@Autowired UserRepository users;@Autowired TransactionTemplate tx;@Autowired ObjectMapper json;@Autowired JdbcTemplate db;
 void invoke(String workflow)throws Exception{invoke(workflow,false);}
 void invoke(String workflow,boolean empty)throws Exception{
  var response=HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1).connectTimeout(Duration.ofSeconds(10)).build().send(HttpRequest.newBuilder(URI.create("http://ceroa-block6-google-n8n:5678/webhook/"+workflow+"-block6")).timeout(Duration.ofSeconds(90)).POST(HttpRequest.BodyPublishers.ofString("{}")).header("Content-Type","application/json").build(),HttpResponse.BodyHandlers.ofString());
  if(empty){assertEquals(500,response.statusCode());assertTrue(response.body().contains("No item to return was found"),"Only the known empty-output webhook response is expected");}
  else assertEquals(200,response.statusCode(),"Native worker failed; review private execution before retry, never resend blindly");
 }
 @Test void singleSelfMailThenStableProjection()throws Exception{
  assertTrue(events.count()<=2,"Isolated outbox must contain only the authorized test pair");
  for(var e:events.findAll())if(e.channel.equals("GMAIL")){assertEquals("block6-authorized-single-self",e.dedupeKey);assertTrue(e.status.equals("PENDING")&&e.attempts==0||e.status.equals("ACKNOWLEDGED")&&e.attempts==1,"Never retry an ambiguous or attempted Gmail delivery");}
  String email=json.readTree(Files.readString(Path.of("/results/self.json"))).path("email").asText();assertTrue(email.contains("@"));
  if(!Files.exists(Path.of("/results/one-send-started")))Files.writeString(Path.of("/results/one-send-started"),"Review durable state before any retry\n",StandardOpenOption.CREATE_NEW);
  var u=new User();u.setFullName("Ceroa prueba sintetica Bloque 6");u.setEmail(email);u.setActive(true);u=users.findByEmailIgnoreCase(email).orElseGet(()->{var fresh=new User();fresh.setFullName("Ceroa prueba sintetica Bloque 6");fresh.setEmail(email);fresh.setActive(true);return users.saveAndFlush(fresh);});final User owner=u;
  UUID id=tx.execute(s->{UUID first=service.mail(owner,IntegrationEventService.MailKind.WELCOME,"block6-authorized-single-self",Map.of());assertEquals(first,service.mail(owner,IntegrationEventService.MailKind.WELCOME,"block6-authorized-single-self",Map.of()));return first;});
  assertEquals(1,events.findAll().stream().filter(e->e.channel.equals("GMAIL")).count());if(events.findById(id).orElseThrow().status.equals("PENDING"))invoke("ceroaWorkspaceMail40");
  var mail=events.findById(id).orElseThrow();assertEquals("ACKNOWLEDGED",mail.status);assertNotNull(mail.providerId);assertEquals(1,mail.attempts);assertEquals(email,mail.recipient);
  invoke("ceroaWorkspaceMail40",true);assertTrue(service.claim("GMAIL").isEmpty());assertEquals(1,events.findById(id).orElseThrow().attempts);
  var projections=events.findAll().stream().filter(e->e.channel.equals("SHEETS")).toList();assertEquals(1,projections.size());var projection=projections.getFirst();assertFalse(projection.payload.contains(email));assertFalse(projection.payload.contains(owner.getId().toString()));assertEquals(id.toString(),json.readTree(projection.payload).path("eventId").asText());
  invoke("ceroaWorkspaceSheets40");assertEquals("ACKNOWLEDGED",events.findById(projection.id).orElseThrow().status);
  // Replay exactly the same operational projection key to verify appendOrUpdate, never the Gmail event.
  db.update("UPDATE integration_events SET status='PENDING',next_attempt_at=now(),lease_token=NULL,lease_until=NULL WHERE id=? AND channel='SHEETS' AND status='ACKNOWLEDGED'",projection.id);
  invoke("ceroaWorkspaceSheets40");assertEquals("ACKNOWLEDGED",events.findById(projection.id).orElseThrow().status);assertEquals(2,events.findById(projection.id).orElseThrow().attempts);
  assertEquals(1,events.findById(id).orElseThrow().attempts);assertEquals(mail.providerId,events.findById(id).orElseThrow().providerId);
  Files.writeString(Path.of("/results/durable-result.json"),json.writeValueAsString(Map.of("mailId",id,"providerId",mail.providerId,"projectionId",projection.id,"mailAttempts",1,"projectionAttempts",2,"status","ACKNOWLEDGED","isolatedPostgres",true)));
 }
}
