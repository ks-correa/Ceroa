package com.ceroa.service;

import com.ceroa.domain.*;
import com.ceroa.repository.*;
import com.ceroa.api.dto.FinancialProfileRequest;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import com.ceroa.api.dto.SimulationResponse;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:sentinel_tests;MODE=PostgreSQL;DB_CLOSE_DELAY=-1","ceroa.sentinel.enabled=true","ceroa.sentinel.worker-key=sentinel-test-key-that-has-at-least-thirty-two-characters"})
@AutoConfigureMockMvc
class SentinelIntegrationTest {
    static final String KEY="sentinel-test-key-that-has-at-least-thirty-two-characters";
    @Autowired SentinelService sentinel;
    @Autowired FinancialProfileService financialProfiles;
    @Autowired UserRepository users;
    @Autowired DebtRepository debts;
    @Autowired FinancialProfileRepository profiles;
    @Autowired SentinelAlertRepository alerts;
    @Autowired SentinelApprovalRepository approvals;
    @Autowired TelegramLinkRepository links;
    @Autowired NotificationRepository notifications;
    @Autowired MockMvc mvc;
    @MockitoSpyBean SimulationService simulations;
    User owner;Debt debt;
    @BeforeEach void setup(){
        owner=new User();owner.setFullName("Sentinel Test");owner.setEmail(UUID.randomUUID()+"@example.test");owner.setPlan(UserPlan.PLUS);owner=users.saveAndFlush(owner);
        var context=SecurityContextHolder.createEmptyContext();context.setAuthentication(new UsernamePasswordAuthenticationToken(owner.getId().toString(),null,List.of()));SecurityContextHolder.setContext(context);
        debt=new Debt();debt.setUser(owner);debt.setName("Tarjeta");debt.setEntity("Banco");debt.setType(DebtType.CREDIT_CARD);debt.setCategoryLabel("Tarjeta");debt.setCurrentBalance(new BigDecimal("200000"));debt.setOriginalAmount(new BigDecimal("300000"));debt.setRateType(RateType.EA);debt.setInterestRate(new BigDecimal("28.7"));debt.setMinimumPayment(new BigDecimal("100000"));debt.setStatus(DebtStatus.CURRENT);debt=debts.saveAndFlush(debt);
    }
    @AfterEach void cleanup(){SecurityContextHolder.clearContext();sentinel.useClock(Clock.system(ZoneId.of("America/Bogota")));}
    void budget(String value){var profile=new FinancialProfile();profile.setUser(owner);profile.setMonthlyIncome(new BigDecimal("500000"));profile.setEssentialExpenses(new BigDecimal("100000"));profile.setAvailableForDebts(new BigDecimal(value));profile.setTotalDeclaredDebts(1);profile.setActiveStrategy(StrategyType.AVALANCHE);profiles.saveAndFlush(profile);}
    @Test void missingDataAndStaleDataNeverProduceCriticalAlert(){
        assertEquals("UNKNOWN",sentinel.evaluate().condition());assertTrue(alerts.findAllByUserIdOrderByCreatedAtDesc(owner.getId(),org.springframework.data.domain.PageRequest.of(0,10)).isEmpty());
        budget("50000");sentinel.useClock(Clock.fixed(Instant.now().plus(Duration.ofDays(91)),ZoneId.of("America/Bogota")));
        assertEquals("INSUFFICIENT_DATA",sentinel.evaluate().quality());assertTrue(alerts.findAllByUserIdOrderByCreatedAtDesc(owner.getId(),org.springframework.data.domain.PageRequest.of(0,10)).isEmpty());
    }
    @Test void confirmedProfileChangeEvaluatesAfterCommit(){
        financialProfiles.update(new FinancialProfileRequest(new BigDecimal("500000"),new BigDecimal("100000"),new BigDecimal("50000"),1,StrategyType.AVALANCHE));
        var rows=alerts.findAllByUserIdOrderByCreatedAtDesc(owner.getId(),org.springframework.data.domain.PageRequest.of(0,10));
        assertEquals(1,rows.size());assertEquals(1,rows.get(0).financialVersion);
    }
    @Test void oneAlertPerEpisodeAndExplicitProposalOnly(){
        budget("50000");assertEquals("OVER_CAPACITY",sentinel.evaluate().condition());sentinel.evaluate();
        var first=alerts.findAllByUserIdOrderByCreatedAtDesc(owner.getId(),org.springframework.data.domain.PageRequest.of(0,10));assertEquals(1,first.size());
        assertTrue(approvals.findAll().stream().noneMatch(a->a.userId.equals(owner.getId())));
        var proposal=sentinel.propose(new SentinelService.Proposal(first.get(0).id,debt.getId(),StrategyType.AVALANCHE));assertEquals("PENDING",proposal.status());
        assertEquals("DISCARDED",sentinel.discard(proposal.id()).status());assertEquals("DISCARDED",sentinel.approve(proposal.id()).status());
        assertEquals("DISCARDED",sentinel.approve(proposal.id()).status());
    }
    @Test void anotherUserCannotApproveAndWorkerCannotAccessFinances() throws Exception {
        budget("50000");sentinel.evaluate();var first=alerts.findAllByUserIdOrderByCreatedAtDesc(owner.getId(),org.springframework.data.domain.PageRequest.of(0,10)).get(0);
        var proposal=sentinel.propose(new SentinelService.Proposal(first.id,debt.getId(),StrategyType.AVALANCHE));
        var stranger=new User();stranger.setFullName("Other");stranger.setEmail(UUID.randomUUID()+"@example.test");stranger=users.saveAndFlush(stranger);
        var context=SecurityContextHolder.createEmptyContext();context.setAuthentication(new UsernamePasswordAuthenticationToken(stranger.getId().toString(),null,List.of()));SecurityContextHolder.setContext(context);
        assertThrows(org.springframework.web.server.ResponseStatusException.class,()->sentinel.approve(proposal.id()));
        SecurityContextHolder.clearContext();
        mvc.perform(post("/api/v1/sentinel-worker/scan").header("X-Ceroa-Sentinel",KEY)).andExpect(status().isOk());
        mvc.perform(get("/api/v1/debts").header("X-Ceroa-Sentinel",KEY)).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/sentinel-worker/scan").with(user(owner.getId().toString()))).andExpect(status().isForbidden());
    }
    @Test void simultaneousApprovalConsumesOnlyOnce() throws Exception {
        budget("50000");sentinel.evaluate();var alert=alerts.findAllByUserIdOrderByCreatedAtDesc(owner.getId(),org.springframework.data.domain.PageRequest.of(0,10)).get(0);
        var proposal=sentinel.propose(new SentinelService.Proposal(alert.id,debt.getId(),StrategyType.AVALANCHE));
        var entered=new CountDownLatch(1);var release=new CountDownLatch(1);var count=new AtomicInteger();
        doAnswer(call->{count.incrementAndGet();entered.countDown();assertTrue(release.await(10,TimeUnit.SECONDS));
            return SimulationResponse.insufficientData(null,StrategyType.AVALANCHE,List.of(),"Faltan datos.");
        }).when(simulations).runSimulation(any());
        var pool=Executors.newFixedThreadPool(2);
        try{
            Callable<SentinelService.ApprovalView> action=()->{var context=SecurityContextHolder.createEmptyContext();context.setAuthentication(new UsernamePasswordAuthenticationToken(owner.getId().toString(),null,List.of()));SecurityContextHolder.setContext(context);try{return sentinel.approve(proposal.id());}finally{SecurityContextHolder.clearContext();}};
            var first=pool.submit(action);assertTrue(entered.await(10,TimeUnit.SECONDS));var second=pool.submit(action);
            assertEquals("EXECUTING",second.get(10,TimeUnit.SECONDS).status());release.countDown();
            assertEquals("FAILED",first.get(10,TimeUnit.SECONDS).status());assertEquals("FAILED",sentinel.approve(proposal.id()).status());assertEquals(1,count.get());
        }finally{release.countDown();pool.shutdownNow();}
    }
    @Test void telegramNeedsSeparateConsentAndBackendRevalidatesNumbers(){
        budget("50000");sentinel.evaluate();var row=alerts.findAllByUserIdOrderByCreatedAtDesc(owner.getId(),org.springframework.data.domain.PageRequest.of(0,10)).get(0);
        assertFalse(sentinel.reserve(row.id).reserved());
        var link=new TelegramLink();link.userId=owner.getId();link.senderId=123456789L;link.chatId=link.senderId;link.linkedAt=OffsetDateTime.now();links.saveAndFlush(link);
        sentinel.consent(new SentinelService.Consent(true));
        // Consent permits this current alert, but only after the worker revalidates it.
        var reservation=sentinel.reserve(row.id);assertTrue(reservation.reserved());
        var profile=profiles.findByUserId(owner.getId()).orElseThrow();profile.setAvailableForDebts(new BigDecimal("120000"));profiles.saveAndFlush(profile);
        assertFalse(sentinel.dispatch(row.id,reservation.token()).send());
        assertEquals("WITHIN_BUDGET",sentinel.evaluate().condition());
        assertTrue(notifications.findAllByUserIdOrderByCreatedAtDesc(owner.getId()).stream().anyMatch(n->n.getType().equals("SENTINEL_OVER_CAPACITY")));
    }
}
