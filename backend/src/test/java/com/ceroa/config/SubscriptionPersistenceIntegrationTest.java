package com.ceroa.config;

import com.ceroa.domain.*;
import com.ceroa.repository.*;
import com.ceroa.service.PlusSubscriptionService;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/** Real persistence and outbox; provider HTTP is intercepted, with no external effects. */
@SpringBootTest(properties="ceroa.plus.monthly-price=19900")
class SubscriptionPersistenceIntegrationTest {
    @Autowired PlusSubscriptionService service;
    @Autowired PlusSubscriptionRepository subscriptions;
    @Autowired SubscriptionChargeRepository charges;
    @Autowired UserRepository users;
    @Autowired IntegrationEventRepository events;
    MockRestServiceServer server;PlusSubscription subscription;
    static final OffsetDateTime BOUNDARY=OffsetDateTime.now().plusMonths(1).withDayOfMonth(8).withHour(10).withMinute(0).withSecond(0).withNano(0);
    static final String FIRST=BOUNDARY.toString(), SECOND=BOUNDARY.plusMonths(1).toString(), THIRD=BOUNDARY.plusMonths(2).toString();
    @BeforeEach void seed() {
        var builder=RestClient.builder();server=MockRestServiceServer.bindTo(builder).build();
        ReflectionTestUtils.setField(service,"client",builder.baseUrl("https://api.mercadopago.com").build());
        var user=new User();user.setFullName("Synthetic subscription receipt");user.setEmail(UUID.randomUUID()+"@example.invalid");user.setActive(true);user=users.saveAndFlush(user);
        subscription=new PlusSubscription();subscription.user=user;subscription.periodicity="MONTHLY";subscription.amount=new BigDecimal("19900");subscription.currency="COP";subscription.providerId="fixture-"+UUID.randomUUID();subscription=subscriptions.saveAndFlush(subscription);
    }
    void provider(String status,String boundary) {
        String body="{\"id\":\""+subscription.providerId+"\",\"external_reference\":\""+subscription.id+"\",\"status\":\""+status+"\",\"next_payment_date\":\""+boundary+"\",\"auto_recurring\":{\"frequency\":1,\"frequency_type\":\"months\",\"transaction_amount\":19900,\"currency_id\":\"COP\"}}";
        server.expect(requestTo("https://api.mercadopago.com/preapproval/"+subscription.providerId)).andRespond(withSuccess(body,MediaType.APPLICATION_JSON));
    }
    void payment(String id,String status) {
        String body="{\"id\":\""+id+"\",\"status\":\"processed\",\"payment\":{\"status\":\""+status+"\"},\"preapproval_id\":\""+subscription.providerId+"\",\"transaction_amount\":\"19900.00\",\"currency_id\":\"COP\"}";
        server.expect(requestTo("https://api.mercadopago.com/authorized_payments/"+id)).andRespond(withSuccess(body,MediaType.APPLICATION_JSON));
    }
    long messages(String kind) {return events.findAll().stream().filter(e->e.ownerId.equals(subscription.user.getId())&&e.kind.equals(kind)).count();}
    @Test void activationRenewalAndOldChargeReplayKeepDurableProof() {
        String charge="charge-"+UUID.randomUUID(), next="charge-"+UUID.randomUUID();
        provider("authorized",FIRST);payment(charge,"approved");provider("authorized",SECOND);payment(next,"approved");provider("authorized",THIRD);
        service.refresh(subscription.providerId);service.refreshAuthorizedPayment(charge);service.refreshAuthorizedPayment(next);
        // A historical charge replay after a later cycle must not call the provider or emit a renewal.
        service.refreshAuthorizedPayment(charge);
        assertEquals(1,messages("PLUS_ACTIVATED"));assertEquals(2,messages("PLUS_RENEWED"));
        assertTrue(charges.existsById("MERCADO_PAGO:"+charge));
        assertEquals(OffsetDateTime.parse(SECOND).toInstant(),charges.findById("MERCADO_PAGO:"+charge).orElseThrow().billingBoundary.toInstant());
        assertEquals(OffsetDateTime.parse(THIRD).toInstant(),subscriptions.findById(subscription.id).orElseThrow().nextPaymentAt.toInstant());
        assertEquals(UserPlan.PLUS,users.findById(subscription.user.getId()).orElseThrow().getPlan());server.verify();
    }
    @Test void staleBillingSnapshotCannotMoveTheBoundaryBackwards() {
        provider("authorized",SECOND);provider("authorized",FIRST);
        service.refresh(subscription.providerId);service.refresh(subscription.providerId);
        assertEquals(OffsetDateTime.parse(SECOND).toInstant(),subscriptions.findById(subscription.id).orElseThrow().nextPaymentAt.toInstant());
        assertEquals(1,messages("PLUS_ACTIVATED"));server.verify();
    }
    @Test void rejectedChargeCannotGrantAccessOrCreateReceipt() {
        String id="rejected-"+UUID.randomUUID();payment(id,"rejected");service.refreshAuthorizedPayment(id);
        assertFalse(charges.existsById("MERCADO_PAGO:"+id));assertEquals(0,messages("PLUS_RENEWED"));
        assertEquals(UserPlan.CERO,users.findById(subscription.user.getId()).orElseThrow().getPlan());server.verify();
    }
    @Test void confirmedCancellationPreservesPaidAccessAndDoesNotReactivate() {
        provider("authorized",FIRST);provider("cancelled",FIRST);provider("authorized",SECOND);
        service.refresh(subscription.providerId);service.refresh(subscription.providerId);service.refresh(subscription.providerId);
        var stored=subscriptions.findById(subscription.id).orElseThrow();assertEquals("CANCEL_SCHEDULED",stored.status);
        assertFalse(stored.automaticRenewal);assertEquals(OffsetDateTime.parse(FIRST).toInstant(),stored.accessUntil.toInstant());server.verify();
    }
}
