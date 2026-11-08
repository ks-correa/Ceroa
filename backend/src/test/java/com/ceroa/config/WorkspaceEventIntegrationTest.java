package com.ceroa.config;

import com.ceroa.domain.*;
import com.ceroa.repository.*;
import com.ceroa.service.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import java.util.*;
import java.time.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"ceroa.workspace.gmail-enabled=true","ceroa.workspace.sheets-enabled=true","ceroa.workspace.worker-key=workspace-fixture-at-least-32-characters"}) @AutoConfigureMockMvc
class WorkspaceEventIntegrationTest {
    @Autowired IntegrationEventService service;@Autowired IntegrationEventRepository events;@Autowired UserRepository users;@Autowired PlatformTransactionManager tm;@Autowired MockMvc mvc;
    @Autowired WorkspaceActionService actions;@Autowired WorkspaceActionRepository proposals;
    User owner;
    @BeforeEach void setup(){proposals.deleteAll();events.deleteAll();owner=new User();owner.setFullName("Synthetic workspace");owner.setEmail(UUID.randomUUID()+"@example.invalid");owner=users.saveAndFlush(owner);}
    void as(UUID id){var c=org.springframework.security.core.context.SecurityContextHolder.createEmptyContext();c.setAuthentication(new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(id.toString(),null,List.of()));org.springframework.security.core.context.SecurityContextHolder.setContext(c);}
    @AfterEach void clear(){org.springframework.security.core.context.SecurityContextHolder.clearContext();}
    UUID enqueue(String key){return new TransactionTemplate(tm).execute(s->service.mail(owner,IntegrationEventService.MailKind.WELCOME,key,Map.of("templateVersion",1)));}
    @Test void outboxParticipatesInTheRegistrationTransaction() throws Exception {
        mvc.perform(post("/api/v1/auth/register").with(csrf()).contentType("application/json").content("{\"fullName\":\"Synthetic signup\",\"email\":\""+UUID.randomUUID()+"@example.invalid\",\"phone\":\"3001234567\",\"birthDate\":\"1990-01-01\",\"password\":\"ValidFixturePassword1!\",\"confirmPassword\":\"ValidFixturePassword1!\",\"acceptTerms\":true,\"acceptPrivacy\":true}")).andExpect(status().isOk());
        assertEquals(1,events.count());assertEquals("WELCOME",events.findAll().getFirst().kind);
        try{new TransactionTemplate(tm).executeWithoutResult(s->{service.mail(owner,IntegrationEventService.MailKind.WELCOME,"rollback",Map.of());throw new IllegalStateException();});}catch(IllegalStateException expected){}
        assertTrue(events.findByDedupeKey("rollback").isEmpty());
    }
    @Test void duplicatesAreNotSentAndRepeatedAcknowledgementIsIdempotent(){
        UUID id=enqueue("unique");assertEquals(id,enqueue("unique"));var work=service.claim("GMAIL").getFirst();assertTrue(service.claim("GMAIL").isEmpty());
        assertEquals(owner.getEmail(),service.dispatch(id,work.leaseToken()).recipient());assertThrows(RuntimeException.class,()->service.dispatch(id,work.leaseToken()));
        var result=new IntegrationEventService.Outcome("ACKNOWLEDGED","gmail-fixture-id",null);service.outcome(id,work.leaseToken(),result);service.outcome(id,work.leaseToken(),result);
        assertEquals("ACKNOWLEDGED",events.findById(id).orElseThrow().status);assertTrue(service.claim("GMAIL").isEmpty());
        var projection=service.claim("SHEETS").getFirst();assertFalse(projection.payload().toString().contains(owner.getEmail()));assertFalse(projection.payload().toString().contains(owner.getId().toString()));
    }
    @Test void ambiguityNeverRetriesGmailButDoesNotBlockOtherMail(){
        var id=enqueue("ambiguous");var work=service.claim("GMAIL").getFirst();service.dispatch(id,work.leaseToken());service.outcome(id,work.leaseToken(),new IntegrationEventService.Outcome("AMBIGUOUS",null,"PROVIDER_AMBIGUOUS"));
        assertTrue(service.claim("GMAIL").isEmpty());enqueue("next");assertEquals(1,service.claim("GMAIL").size());
        assertThrows(RuntimeException.class,()->service.outcome(id,work.leaseToken(),new IntegrationEventService.Outcome("RETRY_BEFORE_DISPATCH",null,null)));
    }
    @Test void leaseRecoveryDistinguishesBeforeAndAfterDispatch(){
        var before=enqueue("before");var claimed=service.claim("GMAIL").getFirst();var row=events.findById(before).orElseThrow();row.leaseUntil=OffsetDateTime.now().minusSeconds(1);events.saveAndFlush(row);
        var retried=service.claim("GMAIL").getFirst();assertNotEquals(claimed.leaseToken(),retried.leaseToken());service.dispatch(before,retried.leaseToken());row=events.findById(before).orElseThrow();row.leaseUntil=OffsetDateTime.now().minusSeconds(1);events.saveAndFlush(row);
        assertTrue(service.claim("GMAIL").isEmpty());assertEquals("AMBIGUOUS",events.findById(before).orElseThrow().status);
    }
    @Test void changedRecipientCancelsRatherThanRedirecting(){var id=enqueue("address");var work=service.claim("GMAIL").getFirst();owner.setEmail("changed@example.invalid");users.saveAndFlush(owner);assertNull(service.dispatch(id,work.leaseToken()));assertEquals("CANCELLED",events.findById(id).orElseThrow().status);}
    @Test void financialEmailRequiresAnOwnedUnexpiredConfirmationAndQueuesOnce(){
        as(owner.getId());var proposal=actions.propose(IntegrationEventService.MailKind.UPCOMING_DUES);assertEquals(0,events.count());
        var other=new User();other.setFullName("Other");other.setEmail(UUID.randomUUID()+"@example.invalid");other=users.saveAndFlush(other);as(other.getId());assertThrows(RuntimeException.class,()->actions.confirmMail(proposal.confirmationCode()));
        as(owner.getId());assertEquals("CONFIRMED",actions.confirmMail(proposal.confirmationCode()).status());actions.confirmMail(proposal.confirmationCode());assertEquals(1,events.count());assertEquals(owner.getEmail(),events.findAll().getFirst().recipient);
    }
    @Test void expiredConfirmationCannotGenerateAnEvent(){as(owner.getId());var p=actions.propose(IntegrationEventService.MailKind.UPCOMING_DUES);var row=proposals.findById(p.id()).orElseThrow();row.expiresAt=OffsetDateTime.now().minusSeconds(1);proposals.saveAndFlush(row);assertThrows(RuntimeException.class,()->actions.confirmMail(p.confirmationCode()));assertEquals(0,events.count());}
    @Test void sheetsFailureLeavesProjectionPendingWithoutReopeningTheEmail(){var id=enqueue("sheets");var w=service.claim("GMAIL").getFirst();service.dispatch(id,w.leaseToken());service.outcome(id,w.leaseToken(),new IntegrationEventService.Outcome("ACKNOWLEDGED","gmail-id",null));var sheet=service.claim("SHEETS").getFirst();service.dispatch(sheet.id(),sheet.leaseToken());service.outcome(sheet.id(),sheet.leaseToken(),new IntegrationEventService.Outcome("RETRY_PROJECTION",null,"PROVIDER_UNAVAILABLE"));assertEquals("ACKNOWLEDGED",events.findById(id).orElseThrow().status);assertEquals("PENDING",events.findById(sheet.id()).orElseThrow().status);}
    @Test void browserSessionCannotImpersonateTheWorkspaceWorker()throws Exception {
        mvc.perform(post("/api/v1/workspace-tools/events/claim").with(user(owner.getId().toString())).with(csrf()).contentType("application/json").content("{\"channel\":\"GMAIL\"}")).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/workspace-tools/events/claim").header("X-Ceroa-Workspace","workspace-fixture-at-least-32-characters").contentType("application/json").content("{\"channel\":\"GMAIL\"}")).andExpect(status().isOk());
    }
}
