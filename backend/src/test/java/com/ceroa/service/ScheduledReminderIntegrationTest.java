package com.ceroa.service;
import com.ceroa.domain.*;
import com.ceroa.repository.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import java.time.*;
import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:reminder_tests;MODE=PostgreSQL;DB_CLOSE_DELAY=-1","ceroa.reminders.enabled=true","ceroa.reminders.worker-key=reminder-test-key-that-has-at-least-thirty-two-characters"})
@AutoConfigureMockMvc
class ScheduledReminderIntegrationTest {
    static final String KEY="reminder-test-key-that-has-at-least-thirty-two-characters";
    static final ZoneId ZONE=ZoneId.of("America/Bogota");
    @Autowired ScheduledReminderService service;
    @Autowired UserRepository users;
    @Autowired DebtRepository debts;
    @Autowired NotificationRepository notifications;
    @Autowired ReminderPreferenceRepository prefs;
    @Autowired ScheduledDeliveryRepository deliveries;
    @Autowired TelegramLinkRepository links;
    @Autowired NotificationService notificationService;
    @Autowired MockMvc mvc;
    User owner;LocalDate date;Instant instant;
    @BeforeEach void setup(){
        deliveries.deleteAll();prefs.deleteAll();notifications.deleteAll();
        owner=new User();owner.setFullName("Reminder Test");owner.setEmail(UUID.randomUUID()+"@example.test");owner.setPlan(UserPlan.PLUS);owner=users.saveAndFlush(owner);
        date=LocalDate.now(ZONE);instant=date.atTime(9,0).atZone(ZONE).toInstant();service.useClock(Clock.fixed(instant,ZONE));
        var link=new TelegramLink();link.userId=owner.getId();link.senderId=Math.abs(new Random().nextLong()%100000000)+1;link.chatId=link.senderId;link.linkedAt=OffsetDateTime.ofInstant(instant,ZONE);links.saveAndFlush(link);
        var context=SecurityContextHolder.createEmptyContext();context.setAuthentication(new UsernamePasswordAuthenticationToken(owner.getId().toString(),null,List.of()));SecurityContextHolder.setContext(context);
        service.save(new ScheduledReminderService.SettingsRequest(true,false,"WEEKLY",8));
    }
    @AfterEach void cleanup(){SecurityContextHolder.clearContext();service.useClock(Clock.system(ZONE));}
    Debt debt(int offset){var d=new Debt();d.setUser(owner);d.setName("Tarjeta <prueba>");d.setEntity("Banco");d.setType(DebtType.CREDIT_CARD);d.setCategoryLabel("Tarjeta");d.setCurrentBalance(new BigDecimal("200000"));d.setOriginalAmount(new BigDecimal("300000"));d.setRateType(RateType.EA);d.setInterestRate(new BigDecimal("28.7"));d.setMinimumPayment(new BigDecimal("50000"));d.setNextDueDate(date.plusDays(offset));d.setStatus(DebtStatus.CURRENT);return debts.saveAndFlush(d);}
    ScheduledDelivery first(){return deliveries.findAll().stream().filter(d->d.userId.equals(owner.getId())).findFirst().orElseThrow();}
    @Test void onlyExactMilestonesAndSharedInAppEvent(){
        for(int offset:new int[]{8,7,6,4,3,2,1,0,-1})debt(offset);
        notificationService.syncMilestoneNotifications(owner);long internal=notifications.findAllByUserIdOrderByCreatedAtDesc(owner.getId()).size();
        service.scan(0);service.scan(0);
        assertEquals(3,internal);assertEquals(3,notifications.findAllByUserIdOrderByCreatedAtDesc(owner.getId()).size());
        assertEquals(3,deliveries.findAllByUserIdOrderByCreatedAtDesc(owner.getId(),org.springframework.data.domain.PageRequest.of(0,50)).size());
    }
    @Test void concurrentScansAndReservationsHaveOneWinner() throws Exception {
        debt(7);var pool=Executors.newFixedThreadPool(2);
        try{var a=pool.submit(()->service.scan(0));var b=pool.submit(()->service.scan(0));a.get(20,TimeUnit.SECONDS);b.get(20,TimeUnit.SECONDS);
            var rows=deliveries.findAllByUserIdOrderByCreatedAtDesc(owner.getId(),org.springframework.data.domain.PageRequest.of(0,50));assertEquals(1,rows.size());
            var x=pool.submit(()->service.reserve(rows.get(0).id));var y=pool.submit(()->service.reserve(rows.get(0).id));assertNotEquals(x.get().reserved(),y.get().reserved());
        }finally{pool.shutdownNow();}
    }
    @Test void revalidationDetectsPaymentDateChangeAndUnlink(){
        var d=debt(3);service.scan(0);var r=service.reserve(first().id);assertTrue(r.reserved());
        d.setCurrentBalance(BigDecimal.ZERO);d.setStatus(DebtStatus.PAID);debts.saveAndFlush(d);
        assertFalse(service.dispatch(r.id(),r.token()).send());assertEquals("INVALIDATED",deliveries.findById(r.id()).orElseThrow().status);
        var other=debt(7);service.scan(0);var next=deliveries.findAll().stream().filter(v->v.debtId.equals(other.getId())).findFirst().orElseThrow();var second=service.reserve(next.id);
        other.setNextDueDate(date.plusDays(6));debts.saveAndFlush(other);assertFalse(service.dispatch(next.id,second.token()).send());
        var third=debt(0);service.scan(0);var last=deliveries.findAll().stream().filter(v->v.debtId.equals(third.getId())).findFirst().orElseThrow();var lease=service.reserve(last.id);links.deleteById(owner.getId());assertFalse(service.dispatch(last.id,lease.token()).send());
    }
    @Test void confirmedDeliveryIsIdempotentAndReadingDoesNotMeanSent(){
        debt(0);service.scan(0);var d=first();var n=notifications.findById(d.notificationId).orElseThrow();n.markAsRead();notifications.saveAndFlush(n);
        assertEquals("PENDING",deliveries.findById(d.id).orElseThrow().status);var r=service.reserve(d.id);var send=service.dispatch(d.id,r.token());assertTrue(send.send());assertTrue(send.text().contains("50.000"));
        var result=new ScheduledReminderService.Outcome(r.token(),"SENT",123L,null,null);assertEquals("SENT",service.outcome(d.id,result).status());assertEquals("SENT",service.outcome(d.id,result).status());
        assertFalse(service.dispatch(d.id,r.token()).send());assertEquals("TELEGRAM",notifications.findById(d.notificationId).orElseThrow().getChannel());
    }
    @Test void rateLimitBackoffPermanentFailureAndUnknownTimeout(){
        debt(3);service.scan(0);var d=first();var r=service.reserve(d.id);service.dispatch(d.id,r.token());
        var outcome=new ScheduledReminderService.Outcome(r.token(),"RETRY",null,600,"RATE_LIMIT");assertEquals("RETRY",service.outcome(d.id,outcome).status());assertEquals("RETRY",service.outcome(d.id,outcome).status());assertFalse(service.reserve(d.id).reserved());
        service.useClock(Clock.fixed(instant.plusSeconds(601),ZONE));var next=service.reserve(d.id);assertTrue(next.reserved());service.dispatch(d.id,next.token());assertEquals("AMBIGUOUS",service.outcome(d.id,new ScheduledReminderService.Outcome(next.token(),"AMBIGUOUS",null,null,null)).status());assertFalse(service.reserve(d.id).reserved());
        // A late known Telegram confirmation can reconcile the same lease without sending again.
        assertEquals("SENT",service.outcome(d.id,new ScheduledReminderService.Outcome(next.token(),"SENT",456L,null,null)).status());
    }
    @Test void expiredDispatchIsAmbiguousAndReservedLeaseCanRecover(){
        debt(7);service.scan(0);var d=first();var r=service.reserve(d.id);service.useClock(Clock.fixed(instant.plusSeconds(181),ZONE));var next=service.reserve(d.id);assertTrue(next.reserved());
        assertThrows(org.springframework.web.server.ResponseStatusException.class,()->service.dispatch(d.id,r.token()));service.dispatch(d.id,next.token());service.useClock(Clock.fixed(instant.plusSeconds(362),ZONE));assertFalse(service.reserve(d.id).reserved());assertEquals("AMBIGUOUS",deliveries.findById(d.id).orElseThrow().status);
    }
    @Test void consentAndPlusRevocationAreCheckedBeforeDispatch(){
        debt(7);service.scan(0);var d=first();var r=service.reserve(d.id);owner.setPlan(UserPlan.CERO);users.saveAndFlush(owner);assertFalse(service.dispatch(d.id,r.token()).send());
        service.save(new ScheduledReminderService.SettingsRequest(true,true,"WEEKLY",8,5));
        assertFalse(service.settings().plus());assertTrue(service.settings().reminders());assertEquals(5,service.settings().weeklyDay());
        service.scan(0);assertEquals("INVALIDATED",deliveries.findById(d.id).orElseThrow().status);
    }
    @Test void separateWorkerCredentialSessionCsrfAndNoFinancialAuthority() throws Exception {
        SecurityContextHolder.clearContext();
        mvc.perform(post("/api/v1/reminder-worker/scan").with(user(owner.getId().toString()))).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/reminder-worker/scan").header("X-Ceroa-Reminders",KEY)).andExpect(status().isOk());
        mvc.perform(get("/api/v1/debts").header("X-Ceroa-Reminders",KEY)).andExpect(status().isUnauthorized());
        mvc.perform(put("/api/v1/integrations/telegram/reminders").with(user(owner.getId().toString())).contentType("application/json").content("{}" )).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/reminder-worker/candidates").header("X-Ceroa-Assistant",KEY)).andExpect(status().isUnauthorized());
    }
    @Test void briefingHasIndependentKeyAndUsesCanonicalTotals(){
        date=date.withDayOfMonth(1);instant=date.atTime(9,0).atZone(ZONE).toInstant();service.useClock(Clock.fixed(instant,ZONE));debt(7);
        service.save(new ScheduledReminderService.SettingsRequest(true,true,"MONTHLY",8));service.scan(0);service.scan(0);
        var rows=deliveries.findAllByUserIdOrderByCreatedAtDesc(owner.getId(),org.springframework.data.domain.PageRequest.of(0,50));assertEquals(2,rows.size());
        var briefing=rows.stream().filter(d->d.kind.equals("BRIEFING")).findFirst().orElseThrow();var r=service.reserve(briefing.id);var send=service.dispatch(briefing.id,r.token());assertTrue(send.send());assertTrue(send.text().contains("200.000"));assertFalse(send.text().contains("avalanche"));
    }
    @Test void weeklyBriefingUsesSelectedWeekday(){
        int selected=date.getDayOfWeek().plus(1).getValue();
        service.save(new ScheduledReminderService.SettingsRequest(false,true,"WEEKLY",8,selected));
        service.scan(0);assertTrue(deliveries.findAllByUserIdOrderByCreatedAtDesc(owner.getId(),org.springframework.data.domain.PageRequest.of(0,50)).isEmpty());
        service.useClock(Clock.fixed(instant.plusSeconds(86400),ZONE));service.scan(0);
        assertEquals("BRIEFING",first().kind);
    }
    @Test void lateEventsExpireAndRetryLimitStopsAutomaticDelivery(){
        debt(7);service.scan(0);var d=first();
        for(int i=0;i<4;i++){
            var r=service.reserve(d.id);assertTrue(r.reserved());service.dispatch(d.id,r.token());
            var result=service.outcome(d.id,new ScheduledReminderService.Outcome(r.token(),"RETRY",null,null,"TELEGRAM_5XX"));
            assertEquals(i==3?"FAILED":"RETRY",result.status());service.useClock(Clock.fixed(instant.plusSeconds((i+1)*1000),ZONE));
        }
        assertFalse(service.reserve(d.id).reserved());
        var another=debt(3);service.scan(0);var pending=deliveries.findAll().stream().filter(v->v.debtId.equals(another.getId())).findFirst().orElseThrow();
        service.useClock(Clock.fixed(instant.plusSeconds(86400),ZONE));service.candidates();assertEquals("INVALIDATED",deliveries.findById(pending.id).orElseThrow().status);
    }
    @Test void scheduleWaitsForChosenHourAndNewLinkNeedsFreshConsent(){
        debt(7);service.save(new ScheduledReminderService.SettingsRequest(true,false,"WEEKLY",10));service.scan(0);
        assertTrue(deliveries.findAllByUserIdOrderByCreatedAtDesc(owner.getId(),org.springframework.data.domain.PageRequest.of(0,50)).isEmpty());
        service.useClock(Clock.fixed(instant.plusSeconds(3600),ZONE));service.scan(0);assertNotNull(first());
        var link=links.findById(owner.getId()).orElseThrow();link.linkedAt=link.linkedAt.plusSeconds(1);links.saveAndFlush(link);assertFalse(service.settings().reminders());
        var r=service.reserve(first().id);assertFalse(r.reserved());
    }
}
